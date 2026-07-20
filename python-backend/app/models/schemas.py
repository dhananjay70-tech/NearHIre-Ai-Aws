"""
Pydantic schemas for request/response validation.
"""

from typing import Optional, List, Any, Dict
# from pydantic import BaseModel
from pydantic import BaseModel, Field
from typing import Optional, List

# ─── Auth ─────────────────────────────────────────────────────────────────────

class TokenPayload(BaseModel):
    userId: str
    role: str


# ─── Resume ───────────────────────────────────────────────────────────────────

class ResumeAnalysisResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


# ─── Recommendations ──────────────────────────────────────────────────────────

class RecommendationRequest(BaseModel):
    extractedSkills: List[str]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radiusKm: Optional[float] = None
    limit: Optional[int] = 10
    jobType: Optional[str] = None
    workMode: Optional[str] = None


# ─── Agent ────────────────────────────────────────────────────────────────────

class InterviewQuestionsRequest(BaseModel):
    jobTitle: str
    jobDescription: Optional[str] = None
    requiredSkills: Optional[List[str]] = []
    matchedSkills: Optional[List[str]] = []
    missingSkills: Optional[List[str]] = []


# class LearningRoadmapRequest(BaseModel):
#     missingRequiredSkills: List[str]
#     jobTitle: Optional[str] = None
#     currentSkills: Optional[List[str]] = []



class LearningRoadmapRequest(BaseModel):
    missingRequiredSkills: List[str] = Field(default_factory=list)
    jobTitle: Optional[str] = None
    currentSkills: List[str] = Field(default_factory=list)


class CoverLetterRequest(BaseModel):
    jobTitle: str
    companyName: Optional[str] = None
    jobDescription: Optional[str] = None
    extractedSkills: Optional[List[str]] = []
    candidateName: Optional[str] = "the candidate"


class ResumeFeedbackRequest(BaseModel):
    resumeText: str
    extractedSkills: Optional[List[str]] = []
    jobTitle: Optional[str] = None
    requiredSkills: Optional[List[str]] = []


class PreparationChecklistRequest(BaseModel):
    jobTitle: str
    matchedSkills: Optional[List[str]] = []
    missingSkills: Optional[List[str]] = []


# ─── Career tools (skill gap / roadmap / rewrite) ─────────────────────────────

class SkillGapRequest(BaseModel):
    """Body for POST /api/resume/skill-gap."""
    resumeText: str
    jobDescription: str


class RoadmapRequest(BaseModel):
    """Body for POST /api/resume/roadmap (sent by LearningRoadmapPage)."""
    missingSkills: List[str] = Field(default_factory=list)
    currentRole: Optional[str] = None
    targetRole: Optional[str] = None
    # Accepted aliases so other callers keep working.
    jobTitle: Optional[str] = None
    currentSkills: List[str] = Field(default_factory=list)


class ResumeRewriteRequest(BaseModel):
    """Body for POST /api/resume/rewrite."""
    resumeText: str
    jobDescription: Optional[str] = ""
    tone: Optional[str] = "professional"
