"""
state.py — AgentState for LangGraph workflow
Shared state between all nodes in the resume analysis workflow
"""

from typing import TypedDict, Optional, List, Dict, Any


class AgentState(TypedDict):
    """Shared state for the LangGraph agent workflow"""
    
    # Input data
    resume_text: Optional[str]
    resume_file_bytes: Optional[bytes]
    resume_filename: Optional[str]
    
    # Extracted data
    extracted_skills: List[str]
    education: List[str]
    experience_hints: List[str]
    projects: List[str]
    certifications: List[str]
    contact_hints: Dict[str, bool]
    summary: str
    resume_completeness: Dict[str, Any]
    
    # Job data
    jobs: List[Dict[str, Any]]
    matched_jobs: List[Dict[str, Any]]
    selected_job: Optional[Dict[str, Any]]
    
    # Location parameters
    latitude: Optional[float]
    longitude: Optional[float]
    radius_km: Optional[float]
    
    # Job matching parameters
    job_id: Optional[str]
    filters: Optional[Dict[str, Any]]
    limit: Optional[int]
    
    # AI-generated content
    interview_questions: Optional[Dict[str, Any]]
    roadmap: Optional[Dict[str, Any]]
    cover_letter: Optional[Dict[str, Any]]
    resume_feedback: Optional[Dict[str, Any]]
    checklist: Optional[Dict[str, Any]]
    
    # Error handling
    errors: List[str]
    current_step: Optional[str]
