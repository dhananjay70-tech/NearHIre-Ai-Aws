"""
agent.py — AI Career Assistant endpoints.
All endpoints require authentication.
Gemini is used when available; deterministic fallbacks are always provided.
"""

from fastapi import APIRouter, Depends, Request
from app.utils.auth import require_auth
from app.models.schemas import (
    InterviewQuestionsRequest,
    LearningRoadmapRequest,
    CoverLetterRequest,
    ResumeFeedbackRequest,
    PreparationChecklistRequest,
)
from app.services import gemini_service

router = APIRouter(prefix="/agent", tags=["AI Agent"])


@router.post("/interview-questions", summary="Generate interview questions for a job")
async def get_interview_questions(
    body: InterviewQuestionsRequest,
    request: Request,
    user: dict = Depends(require_auth),
):
    result = await gemini_service.generate_interview_questions(
        job_title=body.jobTitle,
        job_description=body.jobDescription or "",
        required_skills=body.requiredSkills or [],
        matched_skills=body.matchedSkills or [],
        missing_skills=body.missingSkills or [],
    )
    return {"success": True, "data": result}


@router.post("/learning-roadmap", summary="Generate a learning roadmap for missing skills")
async def get_learning_roadmap(
    body: LearningRoadmapRequest,
    request: Request,
    user: dict = Depends(require_auth),
):
    result = await gemini_service.generate_learning_roadmap(
        missing_required_skills=body.missingRequiredSkills,
        job_title=body.jobTitle,
        current_skills=body.currentSkills or [],
    )
    return {"success": True, "data": result}


@router.post("/cover-letter", summary="Generate a cover letter for a job application")
async def get_cover_letter(
    body: CoverLetterRequest,
    request: Request,
    user: dict = Depends(require_auth),
):
    result = await gemini_service.generate_cover_letter(
        job_title=body.jobTitle,
        company_name=body.companyName or "",
        job_description=body.jobDescription or "",
        extracted_skills=body.extractedSkills or [],
        candidate_name=body.candidateName or "the candidate",
    )
    return {"success": True, "data": result}


@router.post("/resume-feedback", summary="Get AI feedback on a resume")
async def get_resume_feedback(
    body: ResumeFeedbackRequest,
    request: Request,
    user: dict = Depends(require_auth),
):
    result = await gemini_service.generate_resume_feedback(
        resume_text=body.resumeText,
        extracted_skills=body.extractedSkills or [],
        job_title=body.jobTitle,
        required_skills=body.requiredSkills or [],
    )
    return {"success": True, "data": result}


@router.post("/preparation-checklist", summary="Generate an interview preparation checklist")
async def get_preparation_checklist(
    body: PreparationChecklistRequest,
    request: Request,
    user: dict = Depends(require_auth),
):
    result = await gemini_service.generate_preparation_checklist(
        job_title=body.jobTitle,
        matched_skills=body.matchedSkills or [],
        missing_skills=body.missingSkills or [],
    )
    return {"success": True, "data": result}


from pydantic import BaseModel
from app.services.resume_cache import _connect

class ChatRequest(BaseModel):
    message: str

def _is_valid_uuid(val: str) -> bool:
    try:
        import uuid
        uuid.UUID(str(val))
        return True
    except Exception:
        return False


@router.post("/chat", summary="Send a message to the AI Career Coach")
async def chat_message(
    body: ChatRequest,
    user: dict = Depends(require_auth),
):
    import logging
    logger = logging.getLogger(__name__)

    user_id = user.get("id") or user.get("userId")
    if not user_id:
        return {"success": False, "message": "Unauthorized"}

    history = []
    conn = None
    if _is_valid_uuid(user_id):
        try:
            conn = await _connect()
            rows = await conn.fetch(
                """
                SELECT role, message
                FROM ai_chats
                WHERE user_id = $1::uuid
                ORDER BY created_at ASC
                LIMIT 20
                """,
                user_id
            )
            history = [dict(r) for r in rows]
        except Exception as exc:
            logger.warning("[Agent] DB error fetching chat history: %s", exc)

    # Call Gemini Coach
    coach_response = await gemini_service.chat_with_coach(history, body.message)

    # Save messages to database if connection is available and user_id is valid UUID
    if conn and _is_valid_uuid(user_id):
        try:
            await conn.execute(
                "INSERT INTO ai_chats (user_id, role, message) VALUES ($1::uuid, 'USER', $2)",
                user_id,
                body.message
            )
            await conn.execute(
                "INSERT INTO ai_chats (user_id, role, message) VALUES ($1::uuid, 'ASSISTANT', $2)",
                user_id,
                coach_response
            )
        except Exception as exc:
            logger.warning("[Agent] DB error saving chat message: %s", exc)
        finally:
            try:
                await conn.close()
            except Exception:
                pass

    return {"success": True, "data": coach_response}


@router.get("/chat/history", summary="Get chat history with the AI Career Coach")
async def chat_history(
    user: dict = Depends(require_auth),
):
    import logging
    logger = logging.getLogger(__name__)

    user_id = user.get("id") or user.get("userId")
    if not user_id:
        return {"success": False, "message": "Unauthorized"}

    if not _is_valid_uuid(user_id):
        return {"success": True, "data": []}

    try:
        conn = await _connect()
        try:
            rows = await conn.fetch(
                """
                SELECT id, role, message, created_at
                FROM ai_chats
                WHERE user_id = $1::uuid
                ORDER BY created_at ASC
                """,
                user_id
            )
            data = []
            for r in rows:
                item = dict(r)
                if item.get("created_at"):
                    item["created_at"] = item["created_at"].isoformat()
                data.append(item)
                
            return {"success": True, "data": data}
        finally:
            await conn.close()
    except Exception as exc:
        logger.warning("[Agent] DB error fetching chat history: %s", exc)
        return {"success": True, "data": []}

