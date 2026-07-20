"""
matching_service.py

Deterministic job-matching engine for NearHire.AI.

Base scoring weights:
- Required skill coverage: 45%
- Preferred skill coverage: 15%
- Experience compatibility: 15%
- Distance/location: 15%
- User-preference compatibility: 10%

Unavailable components are removed and the remaining weights are
redistributed proportionally. The same input always produces the same score.
"""

import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple


BASE_WEIGHTS = {
    "required": 0.45,
    "preferred": 0.15,
    "experience": 0.15,
    "distance": 0.15,
    "preference": 0.10,
}


SKILL_ALIASES = {
    "reactjs": "react",
    "react.js": "react",
    "react js": "react",
    "node": "node.js",
    "nodejs": "node.js",
    "node js": "node.js",
    "express": "express.js",
    "expressjs": "express.js",
    "express js": "express.js",
    "js": "javascript",
    "postgres": "postgresql",
    "mongo": "mongodb",
    "rest": "rest api",
    "restful api": "rest api",
    "fast api": "fastapi",
    "tailwind": "tailwind css",
    "cpp": "c++",
    "c plus plus": "c++",
    "powerbi": "power bi",
    "github": "git",
}


def _first_available(data: Dict[str, Any], *keys: str) -> Any:
    """Return the first non-None value available among possible keys."""
    for key in keys:
        value = data.get(key)

        if value is not None:
            return value

    return None


def _normalize_skill(skill: str) -> str:
    """Normalize a skill name and apply common aliases."""
    normalized = str(skill).strip().lower()

    normalized = normalized.replace("_", " ")
    normalized = re.sub(r"\s+", " ", normalized)
    normalized = normalized.strip(" .,-")

    return SKILL_ALIASES.get(normalized, normalized)


def _skill_set(skills: Any) -> Set[str]:
    """
    Build a normalized skill set from strings or dictionaries.

    Supported dictionary keys:
    - name
    - normalizedName
    - normalized_name
    """
    result: Set[str] = set()

    if not skills:
        return result

    for skill in skills:
        name = ""

        if isinstance(skill, str):
            name = skill
        elif isinstance(skill, dict):
            name = (
                skill.get("normalizedName")
                or skill.get("normalized_name")
                or skill.get("name")
                or ""
            )

        if name:
            normalized = _normalize_skill(name)

            if normalized:
                result.add(normalized)

    return result


def _display_skill(skill: str) -> str:
    """Convert normalized skill key into a readable display label."""
    known_display_names = {
        "c++": "C++",
        "node.js": "Node.js",
        "express.js": "Express.js",
        "javascript": "JavaScript",
        "postgresql": "PostgreSQL",
        "mongodb": "MongoDB",
        "rest api": "REST API",
        "fastapi": "FastAPI",
        "tailwind css": "Tailwind CSS",
        "power bi": "Power BI",
        "git": "Git/GitHub",
        "html": "HTML",
        "css": "CSS",
        "sql": "SQL",
        "aws": "AWS",
    }

    if skill in known_display_names:
        return known_display_names[skill]

    return " ".join(
        word.capitalize()
        for word in skill.split()
    )


def _haversine_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Calculate great-circle distance in kilometres."""
    earth_radius_km = 6371.0

    first_latitude = math.radians(lat1)
    second_latitude = math.radians(lat2)

    latitude_difference = math.radians(lat2 - lat1)
    longitude_difference = math.radians(lon2 - lon1)

    value = (
        math.sin(latitude_difference / 2) ** 2
        + math.cos(first_latitude)
        * math.cos(second_latitude)
        * math.sin(longitude_difference / 2) ** 2
    )

    central_angle = 2 * math.atan2(
        math.sqrt(value),
        math.sqrt(max(0, 1 - value)),
    )

    return earth_radius_km * central_angle


def _get_job_skills(
    job: Dict[str, Any],
) -> Tuple[Set[str], Set[str]]:
    """Separate required and preferred skills from a job object."""
    all_skills = job.get("skills") or []

    required: Set[str] = set()
    preferred: Set[str] = set()

    for skill in all_skills:
        if not isinstance(skill, dict):
            continue

        name = (
            skill.get("normalizedName")
            or skill.get("normalized_name")
            or skill.get("name")
        )

        if not name:
            continue

        normalized = _normalize_skill(name)
        importance = str(
            skill.get("importance", "REQUIRED")
        ).upper()

        if importance == "PREFERRED":
            preferred.add(normalized)
        else:
            required.add(normalized)

    # Support services that return separated skill arrays.
    required.update(
        _skill_set(job.get("requiredSkills"))
    )

    preferred.update(
        _skill_set(job.get("preferredSkills"))
    )

    return required, preferred


def _extract_candidate_experience_years(
    experience_hints: Optional[List[str]],
) -> Optional[float]:
    """
    Extract an approximate experience value conservatively.

    Returns None when no reliable value is detected.
    """
    if not experience_hints:
        return None

    combined_text = " ".join(
        str(item) for item in experience_hints
    ).lower()

    # Explicit fresher/student/intern indicators.
    if any(
        term in combined_text
        for term in (
            "fresher",
            "no professional experience",
            "student",
            "seeking internship",
        )
    ):
        return 0.0

    patterns = [
        r"(\d+(?:\.\d+)?)\s*\+?\s*years?",
        r"(\d+(?:\.\d+)?)\s*\+?\s*yrs?",
        r"experience\s*(?:of|:)?\s*(\d+(?:\.\d+)?)",
    ]

    values: List[float] = []

    for pattern in patterns:
        for match in re.findall(pattern, combined_text):
            try:
                value = float(match)

                # Avoid treating unusually high numbers as experience.
                if 0 <= value <= 50:
                    values.append(value)
            except (TypeError, ValueError):
                continue

    if not values:
        return None

    return max(values)


def _experience_score(
    job: Dict[str, Any],
    experience_hints: Optional[List[str]],
) -> Tuple[Optional[int], Optional[float], Optional[str]]:
    """
    Compare conservatively extracted experience against the job range.

    Returns:
    - score
    - candidate years
    - explanation
    """
    candidate_years = _extract_candidate_experience_years(
        experience_hints
    )

    job_minimum = _first_available(
        job,
        "experience_min",
        "experienceMin",
    )

    job_maximum = _first_available(
        job,
        "experience_max",
        "experienceMax",
    )

    try:
        minimum = (
            float(job_minimum)
            if job_minimum is not None
            else 0.0
        )
    except (TypeError, ValueError):
        minimum = 0.0

    try:
        maximum = (
            float(job_maximum)
            if job_maximum is not None
            else None
        )
    except (TypeError, ValueError):
        maximum = None

    if candidate_years is None:
        return (
            None,
            None,
            "Resume does not clearly state total professional experience.",
        )

    if minimum <= 0 and candidate_years <= 0:
        return (
            100,
            candidate_years,
            "Role accepts freshers or does not require prior experience.",
        )

    if candidate_years >= minimum:
        if maximum is None or candidate_years <= maximum:
            return (
                100,
                candidate_years,
                "Candidate experience appears compatible with the role.",
            )

        # Being above maximum is not necessarily negative.
        return (
            90,
            candidate_years,
            "Candidate experience exceeds the listed range but remains compatible.",
        )

    gap = minimum - candidate_years

    if gap <= 0.5:
        score = 80
    elif gap <= 1:
        score = 65
    elif gap <= 2:
        score = 40
    else:
        score = 20

    return (
        score,
        candidate_years,
        (
            f"Resume indicates approximately {candidate_years:g} year(s), "
            f"while the job asks for at least {minimum:g}."
        ),
    )


def _distance_score(
    job: Dict[str, Any],
    user_lat: Optional[float],
    user_lon: Optional[float],
    radius_km: Optional[float],
) -> Tuple[Optional[int], Optional[float], Optional[str]]:
    """Calculate deterministic location compatibility."""
    work_mode = str(
        _first_available(
            job,
            "work_mode",
            "workMode",
        )
        or ""
    ).upper()

    if work_mode == "REMOTE":
        return (
            100,
            None,
            "Remote role is not constrained by commute distance.",
        )

    job_latitude = _first_available(
        job,
        "latitude",
    )

    job_longitude = _first_available(
        job,
        "longitude",
    )

    if (
        user_lat is None
        or user_lon is None
        or job_latitude is None
        or job_longitude is None
    ):
        return (
            None,
            None,
            "Distance could not be calculated because coordinates are unavailable.",
        )

    try:
        distance = round(
            _haversine_km(
                float(user_lat),
                float(user_lon),
                float(job_latitude),
                float(job_longitude),
            ),
            2,
        )
    except (TypeError, ValueError):
        return (
            None,
            None,
            "Distance could not be calculated because coordinates are invalid.",
        )

    if distance <= 5:
        score = 100
    elif distance <= 10:
        score = 90
    elif distance <= 20:
        score = 75
    elif distance <= 30:
        score = 60
    elif distance <= 50:
        score = 40
    else:
        score = 15

    # Hybrid jobs require fewer weekly commutes.
    if work_mode == "HYBRID":
        score = min(100, score + 10)

    if radius_km is not None and distance > radius_km:
        score = 0
        explanation = (
            f"Job is {distance} km away, outside the selected "
            f"{radius_km:g} km radius."
        )
    else:
        explanation = (
            f"Job is approximately {distance} km from the selected location."
        )

    return score, distance, explanation


def _normalize_list(value: Any) -> List[str]:
    """Convert JSON-like preference values into a normalized list."""
    if value is None:
        return []

    if isinstance(value, str):
        return [
            item.strip()
            for item in value.split(",")
            if item.strip()
        ]

    if isinstance(value, list):
        return [
            str(item).strip()
            for item in value
            if str(item).strip()
        ]

    return []


def _preference_score(
    job: Dict[str, Any],
    preferences: Optional[Dict[str, Any]],
) -> Tuple[Optional[int], List[str], List[str]]:
    """
    Calculate compatibility with available user preferences.

    Returns score, positive reasons and mismatch risks.
    """
    if not preferences:
        return None, [], []

    points: List[int] = []
    reasons: List[str] = []
    risks: List[str] = []

    job_type = str(
        _first_available(
            job,
            "job_type",
            "jobType",
        )
        or ""
    ).upper()

    work_mode = str(
        _first_available(
            job,
            "work_mode",
            "workMode",
        )
        or ""
    ).upper()

    city = str(
        _first_available(
            job,
            "city",
        )
        or ""
    ).strip().lower()

    salary_minimum = _first_available(
        job,
        "salary_min",
        "salaryMin",
    )

    salary_maximum = _first_available(
        job,
        "salary_max",
        "salaryMax",
    )

    preferred_job_types = _normalize_list(
        preferences.get("preferred_job_types")
        or preferences.get("preferredJobTypes")
        or preferences.get("jobType")
    )

    preferred_job_types = [
        value.upper()
        for value in preferred_job_types
    ]

    if preferred_job_types:
        if job_type in preferred_job_types:
            points.append(100)
            reasons.append(
                "Job type matches the selected preference."
            )
        else:
            points.append(0)
            risks.append(
                "Job type does not match the selected preference."
            )

    preferred_work_modes = _normalize_list(
        preferences.get("preferred_work_modes")
        or preferences.get("preferredWorkModes")
        or preferences.get("workMode")
    )

    preferred_work_modes = [
        value.upper()
        for value in preferred_work_modes
    ]

    if preferred_work_modes:
        if work_mode in preferred_work_modes:
            points.append(100)
            reasons.append(
                "Work mode matches the selected preference."
            )
        else:
            points.append(0)
            risks.append(
                "Work mode does not match the selected preference."
            )

    preferred_city = (
        preferences.get("city")
        or preferences.get("preferredCity")
    )

    if preferred_city:
        city_only = str(preferred_city).split(",")[0].strip().lower()

        if city_only and city_only in city:
            points.append(100)
            reasons.append(
                "Job city matches the selected location preference."
            )
        else:
            points.append(0)
            risks.append(
                "Job city differs from the selected location preference."
            )

    minimum_salary = (
        preferences.get("minimumSalary")
        or preferences.get("minimum_salary")
    )

    if minimum_salary is not None:
        try:
            user_minimum = float(minimum_salary)

            available_salary = (
                float(salary_maximum)
                if salary_maximum is not None
                else (
                    float(salary_minimum)
                    if salary_minimum is not None
                    else None
                )
            )

            if available_salary is None:
                risks.append("Salary is not disclosed.")
            elif available_salary >= user_minimum:
                points.append(100)
                reasons.append(
                    "Posted salary meets the selected minimum."
                )
            else:
                points.append(0)
                risks.append(
                    "Posted salary is below the selected minimum."
                )
        except (TypeError, ValueError):
            pass

    if not points:
        return None, reasons, risks

    return round(sum(points) / len(points)), reasons, risks


def _redistribute_weights(
    availability: Dict[str, bool],
) -> Dict[str, float]:
    """Remove unavailable components and normalize remaining weights."""
    active = {
        key: weight
        for key, weight in BASE_WEIGHTS.items()
        if availability.get(key, False)
    }

    total = sum(active.values())

    if total <= 0:
        return {}

    return {
        key: weight / total
        for key, weight in active.items()
    }


def _make_display_job_id(job: Dict[str, Any]) -> Optional[str]:
    """Return existing display ID or create one from UUID."""
    existing = (
        job.get("displayJobId")
        or job.get("display_job_id")
    )

    if existing:
        return str(existing)

    job_id = job.get("id")

    if not job_id:
        return None

    alphanumeric = re.sub(
        r"[^a-zA-Z0-9]",
        "",
        str(job_id),
    )

    if not alphanumeric:
        return None

    return f"NH-{alphanumeric[-8:].upper().zfill(8)}"


def score_job(
    job: Dict[str, Any],
    extracted_skills: List[str],
    experience_hints: Optional[List[str]] = None,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
    radius_km: Optional[float] = None,
    user_preferences: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Score one job against the candidate profile and location."""

    required_skills, preferred_skills = _get_job_skills(job)
    candidate_skills = _skill_set(extracted_skills)

    matched_required = (
        candidate_skills & required_skills
    )

    matched_preferred = (
        candidate_skills & preferred_skills
    )

    missing_required = (
        required_skills - candidate_skills
    )

    missing_preferred = (
        preferred_skills - candidate_skills
    )

    required_score = (
        round(
            len(matched_required)
            / len(required_skills)
            * 100
        )
        if required_skills
        else None
    )

    preferred_score = (
        round(
            len(matched_preferred)
            / len(preferred_skills)
            * 100
        )
        if preferred_skills
        else None
    )

    experience_score, candidate_years, experience_explanation = (
        _experience_score(
            job,
            experience_hints,
        )
    )

    distance_score, distance_km, distance_explanation = (
        _distance_score(
            job,
            user_lat,
            user_lon,
            radius_km,
        )
    )

    (
        preference_score,
        preference_reasons,
        preference_risks,
    ) = _preference_score(
        job,
        user_preferences,
    )

    availability = {
        "required": required_score is not None,
        "preferred": preferred_score is not None,
        "experience": experience_score is not None,
        "distance": distance_score is not None,
        "preference": preference_score is not None,
    }

    weights = _redistribute_weights(
        availability
    )

    component_scores = {
        "required": required_score,
        "preferred": preferred_score,
        "experience": experience_score,
        "distance": distance_score,
        "preference": preference_score,
    }

    overall_score = round(
        sum(
            weights[key] * component_scores[key]
            for key in weights
            if component_scores[key] is not None
        )
    )

    overall_score = max(
        0,
        min(100, overall_score),
    )

    why_recommended: List[str] = []
    risks: List[str] = []

    if required_skills:
        why_recommended.append(
            (
                f"{len(matched_required)} of "
                f"{len(required_skills)} required skills matched."
            )
        )

    if matched_preferred:
        why_recommended.append(
            (
                f"{len(matched_preferred)} preferred "
                f"skill(s) also matched."
            )
        )

    if distance_explanation:
        if (
            distance_score is not None
            and distance_score > 0
        ):
            why_recommended.append(
                distance_explanation
            )
        else:
            risks.append(distance_explanation)

    if experience_explanation:
        if (
            experience_score is not None
            and experience_score >= 65
        ):
            why_recommended.append(
                experience_explanation
            )
        else:
            risks.append(
                experience_explanation
            )

    why_recommended.extend(
        preference_reasons
    )

    risks.extend(
        preference_risks
    )

    for skill in sorted(missing_required):
        risks.append(
            f"Missing required skill: {_display_skill(skill)}."
        )

    for skill in sorted(missing_preferred):
        risks.append(
            f"Missing preferred skill: {_display_skill(skill)}."
        )

    company_verified = _first_available(
        job,
        "company_verified",
        "companyVerified",
    )

    company = job.get("company")

    if (
        company_verified is None
        and isinstance(company, dict)
    ):
        company_verified = company.get(
            "verified"
        )

    if company_verified:
        why_recommended.append(
            "Company is marked as verified in NearHire.AI."
        )
    elif company_verified is False:
        risks.append(
            "Company is not currently marked as verified."
        )

    salary_minimum = _first_available(
        job,
        "salary_min",
        "salaryMin",
    )

    salary_maximum = _first_available(
        job,
        "salary_max",
        "salaryMax",
    )

    if (
        salary_minimum is None
        and salary_maximum is None
    ):
        risks.append(
            "Salary is not disclosed."
        )

    score_breakdown: Dict[str, Any] = {}

    labels = {
        "required": "requiredSkills",
        "preferred": "preferredSkills",
        "experience": "experience",
        "distance": "distance",
        "preference": "preferences",
    }

    for component, output_key in labels.items():
        score = component_scores[component]
        weight = weights.get(component, 0)

        score_breakdown[output_key] = {
            "available": score is not None,
            "weight": round(weight * 100),
            "score": score,
            "contribution": (
                round(weight * score)
                if score is not None
                else None
            ),
        }

    omitted_components = [
        labels[key]
        for key, available in availability.items()
        if not available
    ]

    explanation_parts = []

    if required_score is not None:
        explanation_parts.append(
            (
                f"Required skill coverage: "
                f"{required_score}% "
                f"({len(matched_required)}/"
                f"{len(required_skills)})."
            )
        )

    if preferred_score is not None:
        explanation_parts.append(
            (
                f"Preferred skill coverage: "
                f"{preferred_score}%."
            )
        )

    if experience_score is not None:
        explanation_parts.append(
            (
                f"Experience compatibility: "
                f"{experience_score}%."
            )
        )

    if distance_score is not None:
        explanation_parts.append(
            (
                f"Location compatibility: "
                f"{distance_score}%."
            )
        )

    if preference_score is not None:
        explanation_parts.append(
            (
                f"Preference compatibility: "
                f"{preference_score}%."
            )
        )

    if omitted_components:
        explanation_parts.append(
            (
                "Unavailable components were omitted and "
                "remaining weights were redistributed: "
                + ", ".join(omitted_components)
                + "."
            )
        )

    return {
        "overallScore": overall_score,
        "requiredSkillScore": required_score,
        "preferredSkillScore": preferred_score,
        "experienceScore": experience_score,
        "distanceScore": distance_score,
        "preferenceScore": preference_score,
        "distanceKm": distance_km,
        "candidateExperienceYears": candidate_years,
        "matchedSkills": sorted(
            _display_skill(skill)
            for skill in (
                matched_required
                | matched_preferred
            )
        ),
        "matchedRequiredSkills": sorted(
            _display_skill(skill)
            for skill in matched_required
        ),
        "matchedPreferredSkills": sorted(
            _display_skill(skill)
            for skill in matched_preferred
        ),
        "missingRequiredSkills": sorted(
            _display_skill(skill)
            for skill in missing_required
        ),
        "missingPreferredSkills": sorted(
            _display_skill(skill)
            for skill in missing_preferred
        ),
        "whyRecommended": list(
            dict.fromkeys(why_recommended)
        ),
        "risks": list(
            dict.fromkeys(risks)
        ),
        "explanation": " ".join(
            explanation_parts
        ),
        "scoreBreakdown": score_breakdown,
        "omittedComponents": omitted_components,
    }


def rank_jobs(
    jobs: List[Dict[str, Any]],
    extracted_skills: List[str],
    experience_hints: Optional[List[str]] = None,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
    radius_km: Optional[float] = None,
    user_preferences: Optional[Dict[str, Any]] = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Score, enrich and rank jobs by overall compatibility."""

    scored_jobs: List[Dict[str, Any]] = []

    for job in jobs:
        match_score = score_job(
            job=job,
            extracted_skills=extracted_skills,
            experience_hints=experience_hints,
            user_lat=user_lat,
            user_lon=user_lon,
            radius_km=radius_km,
            user_preferences=user_preferences,
        )

        enriched_job = {
            **job,
            "displayJobId": (
                _make_display_job_id(job)
            ),
            "matchScore": match_score,
            "whyRecommended": (
                match_score["whyRecommended"]
            ),
            "risks": match_score["risks"],
        }

        scored_jobs.append(enriched_job)

    scored_jobs.sort(
        key=lambda item: (
            item["matchScore"]["overallScore"],
            item["matchScore"].get(
                "requiredSkillScore"
            )
            or 0,
            -(
                item["matchScore"].get(
                    "distanceKm"
                )
                or 999999
            ),
        ),
        reverse=True,
    )

    safe_limit = min(
        max(int(limit or 10), 1),
        50,
    )

    return scored_jobs[:safe_limit]