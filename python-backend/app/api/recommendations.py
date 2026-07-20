"""
recommendations.py

POST /api/recommendations/jobs

Fetches jobs from the Node backend, calculates deterministic
resume + location-aware match scores, and returns ranked results.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from app.services.matching_service import rank_jobs
from app.services.node_client import fetch_jobs, fetch_nearby_jobs
from app.services import job_scraper_client
from app.utils.auth import require_auth
from app.graph.workflow import graph
from app.graph.state import AgentState


router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


class RecommendationFilters(BaseModel):
    jobType: Optional[str] = None
    workMode: Optional[str] = None
    city: Optional[str] = None
    minimumSalary: Optional[int] = None
    maxExperience: Optional[int] = None
    skill: Optional[str] = None

    @field_validator(
        "jobType",
        "workMode",
        "city",
        "skill",
        mode="before",
    )
    @classmethod
    def clean_optional_strings(cls, value):
        if value is None:
            return None

        cleaned = str(value).strip()
        return cleaned or None


class RecommendationRequest(BaseModel):
    extractedSkills: List[str] = Field(default_factory=list)
    experienceHints: List[str] = Field(default_factory=list)

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radiusKm: float = 20

    filters: RecommendationFilters = Field(
        default_factory=RecommendationFilters
    )

    limit: int = 10

    @field_validator("extractedSkills", "experienceHints")
    @classmethod
    def remove_empty_values(cls, values):
        if not values:
            return []

        cleaned_values = []
        seen = set()

        for value in values:
            cleaned = str(value).strip()

            if not cleaned:
                continue

            key = cleaned.lower()

            if key not in seen:
                seen.add(key)
                cleaned_values.append(cleaned)

        return cleaned_values

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value):
        if value is not None and not -90 <= value <= 90:
            raise ValueError(
                "latitude must be between -90 and 90"
            )

        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value):
        if value is not None and not -180 <= value <= 180:
            raise ValueError(
                "longitude must be between -180 and 180"
            )

        return value

    @field_validator("radiusKm")
    @classmethod
    def validate_radius(cls, value):
        if value <= 0 or value > 200:
            raise ValueError(
                "radiusKm must be greater than 0 and at most 200"
            )

        return value

    @field_validator("limit")
    @classmethod
    def validate_limit(cls, value):
        return min(max(value, 1), 50)


def build_node_params(
    body: RecommendationRequest,
) -> Dict[str, Any]:
    """
    Convert recommendation filters to the query parameters
    expected by the Node jobs APIs.
    """

    params: Dict[str, Any] = {
        "page": 1,
        "limit": 50,
        "sortBy": "newest",
    }

    filters = body.filters

    if filters.jobType:
        params["jobType"] = filters.jobType

    if filters.workMode:
        params["workMode"] = filters.workMode

    if filters.city:
        params["city"] = filters.city

    if filters.minimumSalary is not None:
        params["minSalary"] = filters.minimumSalary

    if filters.maxExperience is not None:
        params["maxExperience"] = filters.maxExperience

    if filters.skill:
        params["skill"] = filters.skill

    return params


@router.post(
    "/jobs",
    summary="Get location-aware job recommendations",
)
async def recommend_jobs(
    body: RecommendationRequest,
    request: Request,
    user: dict = Depends(require_auth),
):
    """
    Recommendation workflow:

    1. Validate the shared JWT.
    2. Fetch nearby jobs when coordinates are supplied.
    3. Otherwise fetch normal filtered jobs.
    4. Calculate deterministic resume/job match scores.
    5. Rank results from highest to lowest score.
    """

    try:
        params = build_node_params(body)

        location_used = (
            body.latitude is not None
            and body.longitude is not None
        )

        if location_used:
            jobs = await fetch_nearby_jobs(
                lat=body.latitude,
                lng=body.longitude,
                radius_km=body.radiusKm,
                params=params,
            )
        else:
            jobs = await fetch_jobs(params=params)

        # Rank jobs using deterministic matching service
        ranked_jobs = rank_jobs(
            jobs=jobs,
            extracted_skills=body.extractedSkills,
            experience_hints=body.experienceHints,
            user_lat=body.latitude,
            user_lon=body.longitude,
            radius_km=body.radiusKm,
            user_preferences=body.filters.model_dump(),
            limit=body.limit,
        )

        best_match = ranked_jobs[0] if ranked_jobs else None
        best_match_score = None
        best_match_job_id = None
        best_match_display_job_id = None

        if best_match:
            match_score = best_match.get("matchScore", {})
            best_match_score = match_score.get("overallScore")
            best_match_job_id = best_match.get("id")
            best_match_display_job_id = (
                best_match.get("displayJobId")
                or best_match.get("display_job_id")
            )

        return {
            "success": True,
            "data": {
                "recommendations": ranked_jobs,
                "summary": {
                    "jobsEvaluated": len(jobs),
                    "recommendationsReturned": len(ranked_jobs),
                    "bestMatchScore": best_match_score,
                    "bestMatchJobId": best_match_job_id,
                    "bestMatchDisplayJobId": best_match_display_job_id,
                    "locationUsed": location_used,
                    "radiusKm": body.radiusKm if location_used else None,
                },
                "skillsUsed": body.extractedSkills,
                "experienceHintsUsed": body.experienceHints,
            },
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation failed: {str(exc)}"
        ) from exc


class FullWorkflowRequest(BaseModel):
    """Request for full LangGraph workflow with skills and location"""
    extractedSkills: List[str] = Field(default_factory=list)
    experienceHints: List[str] = Field(default_factory=list)
    resumeText: Optional[str] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radiusKm: float = 20

    filters: RecommendationFilters = Field(
        default_factory=RecommendationFilters
    )

    limit: int = 10

    @field_validator("extractedSkills", "experienceHints")
    @classmethod
    def remove_empty_values(cls, values):
        if not values:
            return []

        cleaned_values = []
        seen = set()

        for value in values:
            cleaned = str(value).strip()

            if not cleaned:
                continue

            key = cleaned.lower()

            if key not in seen:
                seen.add(key)
                cleaned_values.append(cleaned)

        return cleaned_values

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value):
        if value is not None and not -90 <= value <= 90:
            raise ValueError(
                "latitude must be between -90 and 90"
            )

        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value):
        if value is not None and not -180 <= value <= 180:
            raise ValueError(
                "longitude must be between -180 and 180"
            )

        return value

    @field_validator("radiusKm")
    @classmethod
    def validate_radius(cls, value):
        if value <= 0 or value > 200:
            raise ValueError(
                "radiusKm must be greater than 0 and at most 200"
            )

        return value

    @field_validator("limit")
    @classmethod
    def validate_limit(cls, value):
        return min(max(value, 1), 50)


@router.post(
    "/full-workflow",
    summary="Full LangGraph workflow with job matching and AI generation",
)
async def full_workflow(
    body: FullWorkflowRequest,
    request: Request,
    user: dict = Depends(require_auth),
):
    """
    Complete LangGraph workflow:
    - Fetch jobs based on skills and location
    - Match and rank jobs
    - Generate AI content (feedback, questions, roadmap, cover letter, checklist)
    """
    
    # Prepare initial state for LangGraph
    initial_state: AgentState = {
        "resume_file_bytes": None,
        "resume_filename": None,
        "resume_text": body.resumeText,
        "extracted_skills": body.extractedSkills,
        "education": [],
        "experience_hints": body.experienceHints,
        "projects": [],
        "certifications": [],
        "contact_hints": {},
        "summary": f"Skills provided: {', '.join(body.extractedSkills[:5])}",
        "resume_completeness": {},
        "jobs": [],
        "matched_jobs": [],
        "selected_job": None,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "radius_km": body.radiusKm,
        "job_id": None,
        "filters": body.filters.model_dump(),
        "limit": body.limit,
        "interview_questions": None,
        "roadmap": None,
        "cover_letter": None,
        "resume_feedback": None,
        "checklist": None,
        "errors": [],
        "current_step": None,
    }

    try:
        # Invoke the LangGraph workflow
        final_state = await graph.ainvoke(initial_state)
        
        # Check for errors
        if final_state.get("errors"):
            return {
                "success": False,
                "errors": final_state["errors"],
                "data": None,
            }

        # Build response from final state
        response_data = {
            "extractedSkills": final_state.get("extracted_skills", []),
            "experienceHints": final_state.get("experience_hints", []),
            "matchedJobs": final_state.get("matched_jobs", []),
            "aiGenerated": {
                "resumeFeedback": final_state.get("resume_feedback"),
                "interviewQuestions": final_state.get("interview_questions"),
                "learningRoadmap": final_state.get("roadmap"),
                "coverLetter": final_state.get("cover_letter"),
                "preparationChecklist": final_state.get("checklist"),
            },
            "analysisLocation": {
                "latitude": body.latitude,
                "longitude": body.longitude,
                "radiusKm": body.radiusKm,
                "used": body.latitude is not None and body.longitude is not None,
            },
            "workflowSteps": final_state.get("current_step"),
        }

        return {
            "success": True,
            "data": response_data,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Workflow execution failed: {str(exc)}"
        ) from exc


@router.post(
    "/from-scraper",
    summary="Recommendations sourced from the Job Scraper (MS3) — real jobs",
)
async def recommend_jobs_from_scraper(
    body: RecommendationRequest,
    request: Request,
    user: dict = Depends(require_auth),
):
    """
    Same deterministic matching/ranking as /recommendations/jobs, but the job
    pool comes from the independent Job Scraper microservice (MS3) instead of the
    Node DB. Proves resume-match / ATS / recommendations run on REAL scraped jobs.

    If MS3 is unavailable, job_scraper_client raises 503 — we never fake jobs.
    """
    # Derive a search query + location from the request (no free-text field).
    query = (
        body.filters.skill
        or (body.extractedSkills[0] if body.extractedSkills else None)
        or "software developer"
    )
    location = body.filters.city  # None -> scraper uses its India-wide pool

    raw_jobs = await job_scraper_client.search_jobs(
        query=query, location=location, limit=50
    )
    jobs = [job_scraper_client.to_node_shape(j) for j in raw_jobs]

    ranked_jobs = rank_jobs(
        jobs=jobs,
        extracted_skills=body.extractedSkills,
        experience_hints=body.experienceHints,
        user_lat=body.latitude,
        user_lon=body.longitude,
        radius_km=body.radiusKm,
        user_preferences=body.filters.model_dump(),
        limit=body.limit,
    )

    best_match = ranked_jobs[0] if ranked_jobs else None
    best_match_score = (
        best_match.get("matchScore", {}).get("overallScore") if best_match else None
    )

    return {
        "success": True,
        "data": {
            "recommendations": ranked_jobs,
            "summary": {
                "source": "job-scraper",
                "query": query,
                "location": location,
                "jobsEvaluated": len(jobs),
                "recommendationsReturned": len(ranked_jobs),
                "bestMatchScore": best_match_score,
            },
            "skillsUsed": body.extractedSkills,
            "experienceHintsUsed": body.experienceHints,
        },
    }