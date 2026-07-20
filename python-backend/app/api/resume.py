"""
resume.py — POST /api/resume/analyze

Accepts a multipart PDF upload, extracts structured resume data,
and optionally calculates a location-aware match against a selected job.

Performance:
- SHA-256 hash of file bytes checked against `resumes` DB table.
- If cached: returns stored result in <1s (no Gemini call).
- If new: parse → extract → invoke LangGraph → save to cache.
"""

import logging
import re
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)

from app.models.schemas import (
    ResumeRewriteRequest,
    RoadmapRequest,
    SkillGapRequest,
)
from app.services.career_tools_service import (
    analyze_skill_gap,
    generate_weekly_roadmap,
    rewrite_resume,
)
from app.services.matching_service import score_job
from app.services.node_client import fetch_job_by_id
from app.services.resume_parser import extract_text_from_pdf
from app.services.skill_extractor import (
    build_summary,
    compute_resume_completeness,
    extract_certifications,
    extract_contact_hints,
    extract_education_hints,
    extract_experience_hints,
    extract_project_hints,
    extract_skills_deterministic,
)
from app.utils.auth import require_auth
from app.graph.workflow import graph
from app.graph.state import AgentState
from app.services.resume_cache import (
    compute_hash,
    get_cached_resume,
    save_resume,
    update_ai_cache,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/resume",
    tags=["Resume"],
)


_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-"
    r"[0-9a-f]{4}-"
    r"[0-9a-f]{4}-"
    r"[0-9a-f]{4}-"
    r"[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _validate_job_id(job_id: str) -> bool:
    return bool(_UUID_RE.match(job_id.strip()))


def _make_display_job_id(job_id: str) -> str:
    alphanumeric = re.sub(
        r"[^a-zA-Z0-9]",
        "",
        job_id,
    )

    return f"NH-{alphanumeric[-8:].upper().zfill(8)}"


def _validate_location(
    latitude: Optional[float],
    longitude: Optional[float],
    radius_km: Optional[float],
) -> None:
    if latitude is not None and not -90 <= latitude <= 90:
        raise HTTPException(
            status_code=400,
            detail="latitude must be between -90 and 90.",
        )

    if longitude is not None and not -180 <= longitude <= 180:
        raise HTTPException(
            status_code=400,
            detail="longitude must be between -180 and 180.",
        )

    if radius_km is not None and not 0 < radius_km <= 200:
        raise HTTPException(
            status_code=400,
            detail="radiusKm must be greater than 0 and at most 200.",
        )

    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=400,
            detail=(
                "latitude and longitude must either both be provided "
                "or both be omitted."
            ),
        )


@router.post(
    "/analyze",
    summary="Analyze a resume PDF",
)
async def analyze_resume(
    request: Request,
    file: UploadFile = File(...),
    jobId: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    radiusKm: Optional[float] = Form(None),
    user: dict = Depends(require_auth),
):
    _validate_location(
        latitude=latitude,
        longitude=longitude,
        radius_km=radiusKm,
    )

    filename = file.filename or "resume.pdf"

    if file.content_type not in (
        "application/pdf",
        "application/octet-stream",
    ):
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are accepted.",
            )

    raw_bytes = await file.read()
    user_id: str = user.get("id") or user.get("userId") or ""

    clean_job_id = jobId.strip() if (jobId and jobId.strip() and jobId.strip().lower() not in ("null", "undefined", "none")) else None

    # ── STEP 1: Hash check — return cached result instantly ─────────────────
    import json as _json

    def _maybe_json(value, fallback):
        """Parse JSON strings; pass through already-decoded values."""
        if isinstance(value, str):
            try:
                return _json.loads(value)
            except (ValueError, TypeError):
                return fallback
        return value if value is not None else fallback

    content_hash = compute_hash(raw_bytes)
    cached = await get_cached_resume(user_id, content_hash)

    # Only serve from cache when there is a real cached row WITH ai_cache, and
    # the caller did not request a specific jobId (a jobId needs live matching).
    # Otherwise fall through to the LangGraph workflow below.
    ai_cache = _maybe_json(cached.get("ai_cache"), None) if cached else None

    if cached is not None and ai_cache and not clean_job_id:
        logger.info(
            "[Resume] Cache HIT for user %s (hash %s…)", user_id, content_hash[:8]
        )

        skills = _maybe_json(cached.get("extracted_skills"), [])
        education = _maybe_json(cached.get("education"), [])
        exp_hints = _maybe_json(cached.get("experience_hints"), [])

        return {
            "success": True,
            "cached": True,
            "data": {
                "fileName": filename,
                "summary": ai_cache.get("summary", ""),
                "extractedSkills": skills,
                "normalizedSkills": skills,
                "education": education,
                "experienceHints": exp_hints,
                "projects": ai_cache.get("projects", []),
                "certifications": ai_cache.get("certifications", []),
                "contactHints": ai_cache.get("contactHints", {}),
                "resumeCompleteness": ai_cache.get("resumeCompleteness", {}),
                "atsScore": cached.get("ats_score"),
                "selectedJobMatch": None,
                "aiGenerated": ai_cache.get("aiGenerated", {}),
                "analysisLocation": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "radiusKm": radiusKm,
                    "used": latitude is not None and longitude is not None,
                },
                "resumeTextLength": len(cached.get("resume_text") or ""),
            },
        }

    # ── STEP 2: New resume — run full LangGraph workflow ─────────────────────
    logger.info("[Resume] Cache MISS for user %s — running full analysis...", user_id)

    initial_state: AgentState = {
        "resume_file_bytes": raw_bytes,
        "resume_filename": filename,
        "resume_text": None,
        "extracted_skills": [],
        "education": [],
        "experience_hints": [],
        "projects": [],
        "certifications": [],
        "contact_hints": {},
        "summary": "",
        "resume_completeness": {},
        "jobs": [],
        "matched_jobs": [],
        "selected_job": None,
        "latitude": latitude,
        "longitude": longitude,
        "radius_km": radiusKm,
        "job_id": clean_job_id,
        "filters": None,
        "limit": 10,
        "interview_questions": None,
        "roadmap": None,
        "cover_letter": None,
        "resume_feedback": None,
        "checklist": None,
        "errors": [],
        "current_step": None,
    }

    try:
        final_state = await graph.ainvoke(initial_state)

        if final_state.get("errors"):
            raise HTTPException(
                status_code=500,
                detail=f"Workflow errors: {', '.join(final_state['errors'])}"
            )

        resume_text = final_state.get("resume_text", "") or ""
        extracted_skills = final_state.get("extracted_skills", [])
        education = final_state.get("education", [])
        experience_hints = final_state.get("experience_hints", [])

        ai_generated = {
            "resumeFeedback": final_state.get("resume_feedback"),
            "interviewQuestions": final_state.get("interview_questions"),
            "learningRoadmap": final_state.get("roadmap"),
            "coverLetter": final_state.get("cover_letter"),
            "preparationChecklist": final_state.get("checklist"),
        }

        completeness = final_state.get("resume_completeness", {})
        ats_score = completeness.get("overallScore") if isinstance(completeness, dict) else None

        # Build response
        response_data = {
            "fileName": filename,
            "summary": final_state.get("summary", ""),
            "extractedSkills": extracted_skills,
            "normalizedSkills": extracted_skills,
            "education": education,
            "experienceHints": experience_hints,
            "projects": final_state.get("projects", []),
            "certifications": final_state.get("certifications", []),
            "contactHints": final_state.get("contact_hints", {}),
            "resumeCompleteness": completeness,
            "atsScore": ats_score,
            "selectedJobMatch": None,
            "aiGenerated": ai_generated,
            "analysisLocation": {
                "latitude": latitude,
                "longitude": longitude,
                "radiusKm": radiusKm,
                "used": latitude is not None and longitude is not None,
            },
            "resumeTextLength": len(resume_text),
        }

        if final_state.get("selected_job"):
            selected_job = final_state["selected_job"]
            response_data["selectedJobMatch"] = {
                "jobId": jobId,
                "displayJobId": selected_job.get("displayJobId") or _make_display_job_id(jobId) if jobId else None,
                "jobTitle": selected_job.get("title"),
                "companyName": selected_job.get("company_name"),
                "city": selected_job.get("city"),
                "state": selected_job.get("state"),
                "locationUsed": latitude is not None and longitude is not None,
                "radiusKm": radiusKm if latitude is not None and longitude is not None else None,
                **selected_job.get("matchScore", {}),
            }

        # ── STEP 3: Save result to cache ─────────────────────────────────────
        if user_id:
            ai_cache_payload = {
                "summary": final_state.get("summary", ""),
                "projects": final_state.get("projects", []),
                "certifications": final_state.get("certifications", []),
                "contactHints": final_state.get("contact_hints", {}),
                "resumeCompleteness": completeness,
                "aiGenerated": ai_generated,
            }
            await save_resume(
                user_id=user_id,
                filename=filename,
                content_hash=content_hash,
                resume_text=resume_text,
                extracted_skills=extracted_skills,
                education=education,
                experience_hints=experience_hints,
                ats_score=int(ats_score) if ats_score else None,
                ai_cache=ai_cache_payload,
            )
            logger.info("[Resume] Saved to cache for user %s.", user_id)

        return {"success": True, "cached": False, "data": response_data}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Resume analysis failed: {str(exc)}"
        ) from exc


@router.post(
    "/analyze-full",
    summary="Analyze resume with full LangGraph workflow",
)
async def analyze_resume_full(
    request: Request,
    file: UploadFile = File(...),
    jobId: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    radiusKm: Optional[float] = Form(None),
    user: dict = Depends(require_auth),
):
    """
    Full workflow analysis using LangGraph:
    - Parse resume
    - Extract skills
    - Fetch jobs (or specific job if jobId provided)
    - Match jobs
    - Generate AI content (feedback, questions, roadmap, cover letter, checklist)
    """
    _validate_location(
        latitude=latitude,
        longitude=longitude,
        radius_km=radiusKm,
    )

    filename = file.filename or "resume.pdf"

    if file.content_type not in (
        "application/pdf",
        "application/octet-stream",
    ):
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are accepted.",
            )

    raw_bytes = await file.read()

    # Prepare initial state for LangGraph
    initial_state: AgentState = {
        "resume_file_bytes": raw_bytes,
        "resume_filename": filename,
        "resume_text": None,
        "extracted_skills": [],
        "education": [],
        "experience_hints": [],
        "projects": [],
        "certifications": [],
        "contact_hints": {},
        "summary": "",
        "resume_completeness": {},
        "jobs": [],
        "matched_jobs": [],
        "selected_job": None,
        "latitude": latitude,
        "longitude": longitude,
        "radius_km": radiusKm,
        "job_id": jobId.strip() if jobId else None,
        "filters": None,
        "limit": 10,
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
            "fileName": filename,
            "summary": final_state.get("summary", ""),
            "extractedSkills": final_state.get("extracted_skills", []),
            "education": final_state.get("education", []),
            "experienceHints": final_state.get("experience_hints", []),
            "projects": final_state.get("projects", []),
            "certifications": final_state.get("certifications", []),
            "contactHints": final_state.get("contact_hints", {}),
            "resumeCompleteness": final_state.get("resume_completeness", {}),
            "matchedJobs": final_state.get("matched_jobs", []),
            "selectedJobMatch": None,
            "aiGenerated": {
                "resumeFeedback": final_state.get("resume_feedback"),
                "interviewQuestions": final_state.get("interview_questions"),
                "learningRoadmap": final_state.get("roadmap"),
                "coverLetter": final_state.get("cover_letter"),
                "preparationChecklist": final_state.get("checklist"),
            },
            "analysisLocation": {
                "latitude": latitude,
                "longitude": longitude,
                "radiusKm": radiusKm,
                "used": latitude is not None and longitude is not None,
            },
            "workflowSteps": final_state.get("current_step"),
        }

        # Add selected job match if available
        if final_state.get("selected_job"):
            selected_job = final_state["selected_job"]
            response_data["selectedJobMatch"] = {
                "jobId": jobId,
                "displayJobId": selected_job.get("displayJobId"),
                "jobTitle": selected_job.get("title"),
                "companyName": selected_job.get("company_name"),
                "matchScore": selected_job.get("matchScore"),
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


# ─── Career tools (public — no auth, called from the AI tool pages) ───────────

@router.post(
    "/skill-gap",
    summary="Compare a resume against a job description",
)
async def skill_gap(payload: SkillGapRequest):
    """
    Return the skill gap between a resume and a job description.

    Response data: ``matchScore`` (0-100), ``matchedSkills`` (list of names) and
    ``missingSkills`` (skill, priority, difficulty, estimatedTime, resources[]).
    Works without GEMINI_API_KEY via a deterministic fallback.
    """
    if not payload.resumeText.strip() or not payload.jobDescription.strip():
        raise HTTPException(
            status_code=400,
            detail="Both resumeText and jobDescription are required.",
        )

    try:
        result = await analyze_skill_gap(
            resume_text=payload.resumeText,
            job_description=payload.jobDescription,
        )
    except Exception as exc:
        logger.exception("[Resume] Skill gap analysis failed.")
        raise HTTPException(
            status_code=500,
            detail=f"Skill gap analysis failed: {str(exc)}",
        ) from exc

    return {
        "success": True,
        "geminiUsed": result.get("geminiUsed", False),
        "message": result.get("message"),
        "data": result.get("data", {}),
    }


@router.post(
    "/roadmap",
    summary="Generate a week-by-week learning roadmap",
)
async def learning_roadmap(payload: RoadmapRequest):
    """
    Return a week-by-week learning roadmap.

    Response data: ``weeks[]`` (title, focus, topics[], projects[], resources[],
    practiceQuestions[]) plus a ``summary`` string.
    Works without GEMINI_API_KEY via a deterministic fallback.
    """
    skills = [s for s in (payload.missingSkills or []) if s and s.strip()]
    target_role = (payload.targetRole or payload.jobTitle or "").strip() or None
    current_role = (payload.currentRole or "").strip() or None

    if not skills and not target_role:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one skill in missingSkills, or a targetRole.",
        )

    try:
        result = await generate_weekly_roadmap(
            missing_skills=skills,
            current_role=current_role,
            target_role=target_role,
        )
    except Exception as exc:
        logger.exception("[Resume] Roadmap generation failed.")
        raise HTTPException(
            status_code=500,
            detail=f"Roadmap generation failed: {str(exc)}",
        ) from exc

    return {
        "success": True,
        "geminiUsed": result.get("geminiUsed", False),
        "message": result.get("message"),
        "data": result.get("data", {}),
    }


@router.post(
    "/rewrite",
    summary="Rewrite a resume with ATS-friendly phrasing",
)
async def resume_rewrite(payload: ResumeRewriteRequest):
    """
    Return an ATS-optimised rewrite of the supplied resume.

    Response data: ``optimizedResume`` (plain text), ``tone`` and
    ``keywordsAdded``. Works without GEMINI_API_KEY via a template rewrite.
    """
    if not payload.resumeText.strip():
        raise HTTPException(
            status_code=400,
            detail="resumeText is required.",
        )

    try:
        result = await rewrite_resume(
            resume_text=payload.resumeText,
            job_description=payload.jobDescription or "",
            tone=payload.tone or "professional",
        )
    except Exception as exc:
        logger.exception("[Resume] Resume rewrite failed.")
        raise HTTPException(
            status_code=500,
            detail=f"Resume rewrite failed: {str(exc)}",
        ) from exc

    return {
        "success": True,
        "geminiUsed": result.get("geminiUsed", False),
        "message": result.get("message"),
        "data": result.get("data", {}),
    }