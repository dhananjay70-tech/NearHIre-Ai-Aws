"""
career_tools_service.py — Skill-gap analysis, week-by-week learning roadmaps
and ATS resume rewriting.

Mirrors the conventions of ``gemini_service``: every public coroutine returns
``{"available", "geminiUsed", "message"?, "data"}`` and degrades to a
deterministic result when ``GEMINI_API_KEY`` is absent or Gemini fails.
"""

from typing import Dict, List, Optional
from urllib.parse import quote_plus

from app.services.gemini_service import (
    GEMINI_UNAVAILABLE,
    _call_gemini,
    _gemini_available,
)
from app.services.skill_extractor import extract_skills_deterministic


# ─── Reference data ───────────────────────────────────────────────────────────

_SKILL_DIFFICULTY: Dict[str, str] = {
    "html": "Easy",
    "css": "Easy",
    "git": "Easy",
    "github": "Easy",
    "sql": "Easy",
    "excel": "Easy",
    "jira": "Easy",
    "agile": "Easy",
    "scrum": "Easy",
    "figma": "Easy",
    "bootstrap": "Easy",
    "tailwind css": "Easy",
    "javascript": "Medium",
    "typescript": "Medium",
    "python": "Medium",
    "react": "Medium",
    "node.js": "Medium",
    "express.js": "Medium",
    "django": "Medium",
    "flask": "Medium",
    "fastapi": "Medium",
    "mongodb": "Medium",
    "postgresql": "Medium",
    "mysql": "Medium",
    "redis": "Medium",
    "docker": "Medium",
    "graphql": "Medium",
    "rest api": "Medium",
    "kubernetes": "Hard",
    "aws": "Hard",
    "azure": "Hard",
    "gcp": "Hard",
    "terraform": "Hard",
    "system design": "Hard",
    "machine learning": "Hard",
    "deep learning": "Hard",
    "tensorflow": "Hard",
    "pytorch": "Hard",
    "rust": "Hard",
    "c++": "Hard",
    "microservices": "Hard",
    "data structures & algorithms": "Hard",
}

_ESTIMATED_TIME: Dict[str, str] = {
    "Easy": "1-2 weeks",
    "Medium": "2-4 weeks",
    "Hard": "4-8 weeks",
}

_SKILL_DOCS: Dict[str, str] = {
    "react": "https://react.dev/learn",
    "node.js": "https://nodejs.org/en/docs",
    "python": "https://docs.python.org/3/tutorial/",
    "typescript": "https://www.typescriptlang.org/docs/",
    "javascript": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    "docker": "https://docs.docker.com/get-started/",
    "kubernetes": "https://kubernetes.io/docs/home/",
    "aws": "https://docs.aws.amazon.com/",
    "postgresql": "https://www.postgresqltutorial.com/",
    "mongodb": "https://www.mongodb.com/docs/",
    "redis": "https://redis.io/docs/latest/",
    "graphql": "https://graphql.org/learn/",
    "git": "https://git-scm.com/book/en/v2",
    "django": "https://docs.djangoproject.com/en/stable/",
    "fastapi": "https://fastapi.tiangolo.com/",
    "tensorflow": "https://www.tensorflow.org/tutorials",
    "system design": "https://github.com/donnemartin/system-design-primer",
}

_TONE_GUIDE: Dict[str, str] = {
    "professional": "clear, polished, results-oriented corporate language",
    "leadership": "ownership, mentoring, cross-team influence and business impact",
    "technical": "precise engineering detail, architecture, tooling and measurable performance gains",
    "entry_level": "learning velocity, projects, internships and transferable fundamentals",
    "senior_level": "strategic scope, architecture ownership, scale and organisational impact",
}

_ACTION_VERBS = (
    "Built",
    "Led",
    "Designed",
    "Optimised",
    "Delivered",
    "Automated",
    "Engineered",
    "Implemented",
    "Scaled",
    "Streamlined",
)

_BULLET_CHARS = "-*•▪◦‣›"


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _skill_difficulty(skill: str) -> str:
    """Map a canonical skill name to a coarse difficulty band."""
    return _SKILL_DIFFICULTY.get(skill.lower(), "Medium")


def _skill_resources(skill: str) -> List[Dict[str, str]]:
    """Build deterministic, always-reachable learning links for a skill."""
    docs = _SKILL_DOCS.get(skill.lower(), f"https://devdocs.io/#q={quote_plus(skill)}")
    return [
        {
            "type": "youtube",
            "label": "YouTube",
            "url": f"https://www.youtube.com/results?search_query={quote_plus(skill + ' tutorial')}",
        },
        {
            "type": "course",
            "label": "Course",
            "url": f"https://www.freecodecamp.org/news/search/?query={quote_plus(skill)}",
        },
        {
            "type": "doc",
            "label": "Docs",
            "url": docs,
        },
        {
            "type": "project",
            "label": "Project",
            "url": f"https://github.com/search?q={quote_plus(skill + ' project')}&type=repositories",
        },
    ]


def _parse_json_block(text: str) -> Optional[dict]:
    """Extract the first JSON object from a model response; None when absent."""
    import json

    start = text.find("{")
    end = text.rfind("}") + 1
    if start < 0 or end <= start:
        return None
    try:
        parsed = json.loads(text[start:end])
    except (ValueError, TypeError):
        return None
    return parsed if isinstance(parsed, dict) else None


# ─── Deterministic fallbacks ──────────────────────────────────────────────────

def _deterministic_skill_gap(resume_text: str, job_description: str) -> dict:
    """Rule-based skill gap analysis built on the deterministic extractor."""
    resume_skills = extract_skills_deterministic(resume_text or "")
    job_skills = extract_skills_deterministic(job_description or "")

    resume_lower = {s.lower() for s in resume_skills}
    matched = [s for s in job_skills if s.lower() in resume_lower]
    missing = [s for s in job_skills if s.lower() not in resume_lower]

    if job_skills:
        match_score = round(len(matched) / len(job_skills) * 100)
    else:
        # No recognisable requirements — fall back to resume breadth.
        match_score = min(100, len(resume_skills) * 8)

    missing_detail: List[dict] = []
    for index, skill in enumerate(missing[:12]):
        difficulty = _skill_difficulty(skill)
        missing_detail.append(
            {
                "skill": skill,
                "name": skill,
                "priority": "High" if index < 3 else ("Medium" if index < 7 else "Low"),
                "difficulty": difficulty,
                "estimatedTime": _ESTIMATED_TIME[difficulty],
                "resources": _skill_resources(skill),
            }
        )

    if job_skills:
        summary = (
            f"Matched {len(matched)} of {len(job_skills)} skill(s) detected in the "
            f"job description; {len(missing)} gap(s) remain."
        )
    else:
        summary = "No recognised skills were detected in the job description."

    return {
        "matchScore": match_score,
        "matchedSkills": matched,
        "missingSkills": missing_detail,
        "resumeSkills": resume_skills,
        "jobSkills": job_skills,
        "summary": summary,
        "_source": "deterministic",
    }


def _deterministic_weekly_roadmap(
    missing_skills: List[str],
    current_role: Optional[str],
    target_role: Optional[str],
) -> dict:
    """Rule-based week-by-week roadmap (one week per skill, max 8)."""
    skills = [s.strip() for s in (missing_skills or []) if s and s.strip()][:8]
    if not skills:
        skills = ["Data Structures & Algorithms", "System Design", "Git"]

    weeks: List[dict] = []
    for index, skill in enumerate(skills):
        difficulty = _skill_difficulty(skill)
        weeks.append(
            {
                "title": f"Week {index + 1}: {skill}",
                "focus": (
                    f"Build working proficiency in {skill} "
                    f"({difficulty} — approx. {_ESTIMATED_TIME[difficulty]} to be job-ready)."
                ),
                "topics": [
                    f"{skill} fundamentals and core concepts",
                    f"Environment setup and tooling for {skill}",
                    f"Common patterns and best practices in {skill}",
                    f"Debugging and troubleshooting {skill}",
                ],
                "projects": [
                    f"Build a small end-to-end demo that uses {skill}.",
                    f"Add {skill} to an existing project and push it to GitHub.",
                ],
                "resources": _skill_resources(skill),
                "practiceQuestions": [
                    f"Explain the core building blocks of {skill} in your own words.",
                    f"Describe a real problem {skill} solves better than the alternatives.",
                    f"What mistakes do beginners most often make with {skill}?",
                ],
            }
        )

    current = (current_role or "").strip()
    target = (target_role or "").strip()

    summary_parts = [f"A {len(weeks)}-week plan covering {', '.join(skills)}."]
    if current and target:
        summary_parts.append(f"Designed to move you from {current} to {target}.")
    elif target:
        summary_parts.append(f"Designed to prepare you for a {target} role.")
    summary_parts.append(
        "Budget 8-10 focused hours per week and ship one artefact each week."
    )

    return {
        "weeks": weeks,
        "totalWeeks": len(weeks),
        "currentRole": current or None,
        "targetRole": target or None,
        "summary": " ".join(summary_parts),
        "_source": "deterministic",
    }


def _deterministic_resume_rewrite(
    resume_text: str,
    job_description: str,
    tone: str,
) -> dict:
    """
    Template rewrite: normalises bullets, prefixes strong action verbs and
    appends an ATS keyword block derived from the job description.
    """
    tone_key = (tone or "professional").strip().lower()
    tone_label = tone_key.replace("_", " ").title()

    resume_skills = extract_skills_deterministic(resume_text or "")
    job_skills = extract_skills_deterministic(job_description or "")
    resume_lower = {s.lower() for s in resume_skills}
    missing_keywords = [s for s in job_skills if s.lower() not in resume_lower]

    verbs_lower = {v.lower() for v in _ACTION_VERBS}
    rewritten: List[str] = []
    bullet_index = 0

    for raw_line in (resume_text or "").split("\n"):
        stripped = raw_line.strip()
        if not stripped:
            rewritten.append("")
            continue

        is_bullet = stripped[0] in _BULLET_CHARS
        body = stripped.lstrip(_BULLET_CHARS).strip() if is_bullet else stripped

        if is_bullet and body:
            first_word = body.split()[0].rstrip(":,.").lower()
            already_a_verb = first_word in verbs_lower or first_word.endswith(
                ("ed", "ing")
            )
            if already_a_verb:
                # Already action-led — just normalise capitalisation.
                body = body[0].upper() + body[1:]
            else:
                verb = _ACTION_VERBS[bullet_index % len(_ACTION_VERBS)]
                body = f"{verb} {body[0].lower()}{body[1:]}"
            bullet_index += 1
            rewritten.append(f"- {body}")
        else:
            rewritten.append(stripped)

    optimized = "\n".join(rewritten).strip()

    footer = [
        "",
        "",
        "---- ATS OPTIMISATION NOTES ----",
        f"Tone applied: {tone_label} — emphasising "
        f"{_TONE_GUIDE.get(tone_key, _TONE_GUIDE['professional'])}.",
    ]
    if job_skills:
        footer.append("Keywords found in the job description: " + ", ".join(job_skills) + ".")
    if missing_keywords:
        footer.append(
            "Weave these into your bullets where truthful: "
            + ", ".join(missing_keywords)
            + "."
        )
    footer.extend(
        [
            "Quantify every bullet with a metric (%, time saved, users, revenue).",
            "Keep the layout single-column and table-free so ATS parsers read it cleanly.",
            "",
            "Note: template-based rewrite. Configure GEMINI_API_KEY for a fully "
            "AI-rewritten version.",
        ]
    )

    return {
        "optimizedResume": optimized + "\n" + "\n".join(footer),
        "tone": tone_key,
        "keywordsAdded": missing_keywords,
        "_source": "deterministic",
    }


# ─── Public API functions ─────────────────────────────────────────────────────

async def analyze_skill_gap(resume_text: str, job_description: str) -> dict:
    """
    Compare a resume against a job description and report the skill gap.
    Always returns data — deterministic fallback when Gemini is unavailable.
    """
    fallback = _deterministic_skill_gap(resume_text, job_description)

    if not _gemini_available():
        return {
            "available": True,
            "geminiUsed": False,
            "message": GEMINI_UNAVAILABLE,
            "data": fallback,
        }

    prompt = f"""You are an ATS and career-gap analyst.

RESUME (first 4000 chars):
{(resume_text or '')[:4000]}

JOB DESCRIPTION (first 3000 chars):
{(job_description or '')[:3000]}

Compare the resume against the job description. Identify the skills the job
requires that the resume does not evidence, plus the skills that already match.

Rules:
- matchScore is an integer between 0 and 100.
- priority is one of High, Medium, Low.
- difficulty is one of Easy, Medium, Hard.
- resources must be real, publicly reachable URLs.
- Do NOT invent skills that are absent from the job description.

Format as JSON:
{{
  "matchScore": 0,
  "matchedSkills": ["..."],
  "missingSkills": [
    {{
      "skill": "...",
      "priority": "High|Medium|Low",
      "difficulty": "Easy|Medium|Hard",
      "estimatedTime": "...",
      "resources": [{{"type": "youtube|course|doc|project", "label": "...", "url": "https://..."}}]
    }}
  ],
  "summary": "..."
}}"""

    try:
        text = await _call_gemini(prompt)
        data = _parse_json_block(text)
        if not data or "missingSkills" not in data:
            raise RuntimeError("Gemini returned an unusable payload.")
        data.setdefault("matchScore", fallback["matchScore"])
        data.setdefault("matchedSkills", fallback["matchedSkills"])
        data.setdefault("summary", fallback["summary"])
        return {"available": True, "geminiUsed": True, "data": data}
    except Exception as exc:
        return {
            "available": True,
            "geminiUsed": False,
            "message": f"Gemini failed ({str(exc)}). Showing deterministic analysis.",
            "data": fallback,
        }


async def generate_weekly_roadmap(
    missing_skills: List[str],
    current_role: Optional[str] = None,
    target_role: Optional[str] = None,
) -> dict:
    """
    Build a week-by-week learning roadmap for the requested skills/role move.
    Always returns data — deterministic fallback when Gemini is unavailable.
    """
    fallback = _deterministic_weekly_roadmap(missing_skills, current_role, target_role)

    if not _gemini_available():
        return {
            "available": True,
            "geminiUsed": False,
            "message": GEMINI_UNAVAILABLE,
            "data": fallback,
        }

    prompt = f"""You are a career development coach building a study plan.

Current Role: {current_role or 'Not specified'}
Target Role: {target_role or 'Not specified'}
Skills To Learn: {', '.join(missing_skills) or 'Not specified'}

Create a realistic week-by-week roadmap with one entry per week (3-8 weeks).
Every resource URL must be real and publicly reachable. Do not invent courses.

Format as JSON:
{{
  "weeks": [
    {{
      "title": "Week 1: ...",
      "focus": "...",
      "topics": ["..."],
      "projects": ["..."],
      "resources": [{{"type": "youtube|course|doc|project", "label": "...", "url": "https://..."}}],
      "practiceQuestions": ["..."]
    }}
  ],
  "summary": "..."
}}"""

    try:
        text = await _call_gemini(prompt)
        data = _parse_json_block(text)
        if not data or not data.get("weeks"):
            raise RuntimeError("Gemini returned an unusable payload.")
        data.setdefault("summary", fallback["summary"])
        return {"available": True, "geminiUsed": True, "data": data}
    except Exception as exc:
        return {
            "available": True,
            "geminiUsed": False,
            "message": f"Gemini failed ({str(exc)}). Showing deterministic roadmap.",
            "data": fallback,
        }


async def rewrite_resume(
    resume_text: str,
    job_description: str = "",
    tone: str = "professional",
) -> dict:
    """
    Rewrite a resume with stronger, ATS-friendly phrasing in the requested tone.
    Always returns data — template fallback when Gemini is unavailable.
    """
    fallback = _deterministic_resume_rewrite(resume_text, job_description, tone)

    if not _gemini_available():
        return {
            "available": True,
            "geminiUsed": False,
            "message": GEMINI_UNAVAILABLE,
            "data": fallback,
        }

    tone_key = (tone or "professional").strip().lower()
    tone_guide = _TONE_GUIDE.get(tone_key, _TONE_GUIDE["professional"])

    prompt = f"""Rewrite the following resume so it is ATS-friendly and compelling.

TONE: {tone_key} — emphasise {tone_guide}.

RESUME:
{(resume_text or '')[:6000]}

JOB DESCRIPTION (optional context):
{(job_description or 'Not provided')[:3000]}

Instructions:
- Keep every factual claim; never invent employers, dates, degrees or metrics.
- Start each bullet with a strong action verb.
- Weave in keywords from the job description only where they are already true.
- Single-column plain text: no tables, no markdown headings.
- Return ONLY the rewritten resume text, nothing else."""

    try:
        text = await _call_gemini(prompt)
        cleaned = (text or "").strip()
        if not cleaned:
            raise RuntimeError("Gemini returned an empty rewrite.")
        return {
            "available": True,
            "geminiUsed": True,
            "data": {
                "optimizedResume": cleaned,
                "tone": tone_key,
                "keywordsAdded": fallback.get("keywordsAdded", []),
            },
        }
    except Exception as exc:
        return {
            "available": True,
            "geminiUsed": False,
            "message": f"Gemini failed ({str(exc)}). Showing template rewrite.",
            "data": fallback,
        }
