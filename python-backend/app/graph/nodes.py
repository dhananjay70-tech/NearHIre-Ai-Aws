"""
nodes.py — LangGraph nodes wrapping existing services
Each node wraps an existing service without changing business logic
"""

import logging
from typing import Dict, Any, Optional
from app.graph.state import AgentState
from app.services.resume_parser import extract_text_from_pdf
from app.services.skill_extractor import (
    extract_skills_deterministic,
    extract_education_hints,
    extract_experience_hints,
    extract_project_hints,
    extract_certifications,
    extract_contact_hints,
    build_summary,
    compute_resume_completeness,
)
from app.services.node_client import fetch_jobs, fetch_job_by_id, fetch_nearby_jobs
from app.services.matching_service import score_job, rank_jobs
from app.services import gemini_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def parse_resume_node(state: AgentState) -> AgentState:
    """Parse resume PDF and extract text"""
    if state.get("resume_text") or state.get("extracted_skills"):
        logger.info("Resume text or extracted skills already present in state, skipping PDF parsing")
        state["current_step"] = "parse_resume"
        return state
        
    logger.info("Entering Parse Resume Node...")
    
    try:
        if not state.get("resume_file_bytes") or not state.get("resume_filename"):
            error_msg = "Missing resume file bytes or filename"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            return state
        
        resume_text = extract_text_from_pdf(
            state["resume_file_bytes"],
            state["resume_filename"]
        )
        state["resume_text"] = resume_text
        logger.info("Resume parsed successfully")
        
    except Exception as e:
        error_msg = f"Resume parsing failed: {str(e)}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
    
    state["current_step"] = "parse_resume"
    return state


async def extract_skills_node(state: AgentState) -> AgentState:
    """Extract skills and resume metadata"""
    logger.info("Entering Extract Skills Node...")
    
    try:
        if not state.get("resume_text"):
            if state.get("extracted_skills"):
                logger.info("No resume text, but skills already present. Skipping extraction.")
                state["current_step"] = "extract_skills"
                return state
            error_msg = "No resume text available for skill extraction"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            return state
        
        resume_text = state["resume_text"]
        
        # Extract all resume data using existing services, preserving existing state values
        extracted_skills = state.get("extracted_skills") or extract_skills_deterministic(resume_text)
        education = state.get("education") or extract_education_hints(resume_text)
        experience_hints = state.get("experience_hints") or extract_experience_hints(resume_text)
        projects = state.get("projects") or extract_project_hints(resume_text)
        certifications = state.get("certifications") or extract_certifications(resume_text)
        contact_hints = state.get("contact_hints") or extract_contact_hints(resume_text)
        summary = state.get("summary") or build_summary(resume_text, extracted_skills)

        resume_completeness = compute_resume_completeness(
            resume_text=resume_text,
            extracted_skills=extracted_skills,
            education=education,
            experience_hints=experience_hints,
            projects=projects,
            contact_hints=contact_hints,
        )
        
        state["extracted_skills"] = extracted_skills
        state["education"] = education
        state["experience_hints"] = experience_hints
        state["projects"] = projects
        state["certifications"] = certifications
        state["contact_hints"] = contact_hints
        state["summary"] = summary
        state["resume_completeness"] = resume_completeness
        
        logger.info(f"Skills extracted: {len(extracted_skills)} skills found")
        
    except Exception as e:
        error_msg = f"Skill extraction failed: {str(e)}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
    
    state["current_step"] = "extract_skills"
    return state


async def fetch_jobs_node(state: AgentState) -> AgentState:
    """Fetch jobs from Node backend"""
    logger.info("Entering Fetch Jobs Node...")
    
    try:
        location_used = (
            state.get("latitude") is not None
            and state.get("longitude") is not None
        )
        
        # Build params from filters if available
        params = {
            "page": 1,
            "limit": 50,
            "sortBy": "newest",
        }
        
        if state.get("filters"):
            filters = state["filters"]
            if filters.get("jobType"):
                params["jobType"] = filters["jobType"]
            if filters.get("workMode"):
                params["workMode"] = filters["workMode"]
            if filters.get("city"):
                params["city"] = filters["city"]
            if filters.get("minimumSalary") is not None:
                params["minSalary"] = filters["minimumSalary"]
            if filters.get("maxExperience") is not None:
                params["maxExperience"] = filters["maxExperience"]
            if filters.get("skill"):
                params["skill"] = filters["skill"]
        
        if location_used:
            jobs = await fetch_nearby_jobs(
                lat=state["latitude"],
                lng=state["longitude"],
                radius_km=state.get("radius_km", 20),
                params=params,
            )
        else:
            jobs = await fetch_jobs(params=params)
        
        state["jobs"] = jobs
        logger.info(f"Jobs retrieved: {len(jobs)} jobs")
        
    except Exception as e:
        logger.warning(f"Job fetching failed (non-fatal): {str(e)}")
        state["jobs"] = []
    
    state["current_step"] = "fetch_jobs"
    return state


async def match_jobs_node(state: AgentState) -> AgentState:
    """Match and rank jobs against extracted skills"""
    logger.info("Entering Match Jobs Node...")
    
    try:
        jobs = state.get("jobs", [])
        extracted_skills = state.get("extracted_skills", [])
        experience_hints = state.get("experience_hints", [])
        
        if not jobs:
            logger.warning("No jobs to match")
            state["matched_jobs"] = []
            state["current_step"] = "match_jobs"
            return state
        
        # Rank jobs using existing service
        user_preferences = state.get("filters") or {}
        limit = state.get("limit", 10)
        
        ranked_jobs = rank_jobs(
            jobs=jobs,
            extracted_skills=extracted_skills,
            experience_hints=experience_hints,
            user_lat=state.get("latitude"),
            user_lon=state.get("longitude"),
            radius_km=state.get("radius_km"),
            user_preferences=user_preferences,
            limit=limit,
        )
        
        state["matched_jobs"] = ranked_jobs
        logger.info(f"Matching completed: {len(ranked_jobs)} jobs ranked")
        
    except Exception as e:
        logger.warning(f"Job matching failed (non-fatal): {str(e)}")
        state["matched_jobs"] = []
    
    state["current_step"] = "match_jobs"
    return state


async def fetch_selected_job_node(state: AgentState) -> AgentState:
    """Fetch a specific job by ID if job_id is provided"""
    logger.info("Entering Fetch Selected Job Node...")
    
    try:
        job_id = state.get("job_id")
        if not job_id:
            logger.info("No specific job ID provided, skipping")
            state["current_step"] = "fetch_selected_job"
            return state
        
        job = await fetch_job_by_id(job_id)
        if job:
            state["selected_job"] = job
            logger.info(f"Selected job fetched: {job.get('title', 'Unknown')}")
        else:
            logger.warning(f"Job with ID {job_id} not found")
            state["selected_job"] = None
        
    except Exception as e:
        logger.warning(f"Selected job fetching failed (non-fatal): {str(e)}")
        state["selected_job"] = None
    
    state["current_step"] = "fetch_selected_job"
    return state


async def score_selected_job_node(state: AgentState) -> AgentState:
    """Score a selected job against the candidate profile"""
    logger.info("Entering Score Selected Job Node...")
    
    try:
        job = state.get("selected_job")
        if not job:
            logger.info("No selected job to score")
            state["current_step"] = "score_selected_job"
            return state
        
        extracted_skills = state.get("extracted_skills", [])
        experience_hints = state.get("experience_hints", [])
        
        match_data = score_job(
            job=job,
            extracted_skills=extracted_skills,
            experience_hints=experience_hints,
            user_lat=state.get("latitude"),
            user_lon=state.get("longitude"),
            radius_km=state.get("radius_km"),
            user_preferences=state.get("filters"),
        )
        
        # Update selected job with match data
        state["selected_job"] = {**job, "matchScore": match_data}
        logger.info("Selected job scored successfully")
        
    except Exception as e:
        error_msg = f"Selected job scoring failed: {str(e)}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
    
    state["current_step"] = "score_selected_job"
    return state


async def generate_resume_feedback_node(state: AgentState) -> AgentState:
    """Generate AI feedback on resume"""
    logger.info("Entering Generate Resume Feedback Node...")
    
    try:
        resume_text = state.get("resume_text", "")
        extracted_skills = state.get("extracted_skills", [])
        
        # Use the best matched job for context if available
        job_title = None
        required_skills = []
        
        best_job = None
        if state.get("selected_job"):
            best_job = state["selected_job"]
        elif state.get("matched_jobs"):
            best_job = state["matched_jobs"][0]
            
        if best_job:
            job_title = best_job.get("title")
            required_skills = best_job.get("matchScore", {}).get("missingRequiredSkills", [])
        
        result = await gemini_service.generate_resume_feedback(
            resume_text=resume_text,
            extracted_skills=extracted_skills,
            job_title=job_title,
            required_skills=required_skills,
        )
        
        state["resume_feedback"] = result
        logger.info("Resume feedback generated")
        
    except Exception as e:
        error_msg = f"Resume feedback generation failed: {str(e)}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
        state["resume_feedback"] = None
    
    state["current_step"] = "generate_resume_feedback"
    return state


async def generate_interview_questions_node(state: AgentState) -> AgentState:
    """Generate interview questions based on matched job"""
    logger.info("Entering Generate Interview Questions Node...")
    
    try:
        # Use the best matched job for context
        best_job = None
        if state.get("selected_job"):
            best_job = state["selected_job"]
        elif state.get("matched_jobs"):
            best_job = state["matched_jobs"][0]
            
        if not best_job:
            logger.warning("No job available for interview questions")
            state["interview_questions"] = None
            state["current_step"] = "generate_interview_questions"
            return state
        
        job_title = best_job.get("title", "Software Developer")
        job_description = best_job.get("description", "")
        
        # Get skills from match data
        match_score = best_job.get("matchScore", {})
        required_skills = match_score.get("matchedRequiredSkills", [])
        matched_skills = match_score.get("matchedSkills", [])
        missing_skills = match_score.get("missingRequiredSkills", [])
        
        result = await gemini_service.generate_interview_questions(
            job_title=job_title,
            job_description=job_description,
            required_skills=required_skills,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
        )
        
        state["interview_questions"] = result
        logger.info("Interview questions generated")
        
    except Exception as e:
        error_msg = f"Interview questions generation failed: {str(e)}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
        state["interview_questions"] = None
    
    state["current_step"] = "generate_interview_questions"
    return state


async def generate_roadmap_node(state: AgentState) -> AgentState:
    """Generate learning roadmap for missing skills"""
    logger.info("Entering Generate Learning Roadmap Node...")
    
    try:
        # Use the best matched job for context
        best_job = None
        if state.get("selected_job"):
            best_job = state["selected_job"]
        elif state.get("matched_jobs"):
            best_job = state["matched_jobs"][0]
            
        if not best_job:
            logger.warning("No job available for roadmap")
            state["roadmap"] = None
            state["current_step"] = "generate_roadmap"
            return state
        
        job_title = best_job.get("title", "Software Developer")
        
        match_score = best_job.get("matchScore", {})
        missing_skills = match_score.get("missingRequiredSkills", [])
        current_skills = state.get("extracted_skills", [])
        
        result = await gemini_service.generate_learning_roadmap(
            missing_required_skills=missing_skills,
            job_title=job_title,
            current_skills=current_skills,
        )
        
        state["roadmap"] = result
        logger.info("Learning roadmap generated")
        
    except Exception as e:
        error_msg = f"Learning roadmap generation failed: {str(e)}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
        state["roadmap"] = None
    
    state["current_step"] = "generate_roadmap"
    return state


async def generate_cover_letter_node(state: AgentState) -> AgentState:
    """Generate cover letter for a job application"""
    logger.info("Entering Generate Cover Letter Node...")
    
    try:
        # Use the best matched job for context
        best_job = None
        if state.get("selected_job"):
            best_job = state["selected_job"]
        elif state.get("matched_jobs"):
            best_job = state["matched_jobs"][0]
            
        if not best_job:
            logger.warning("No job available for cover letter")
            state["cover_letter"] = None
            state["current_step"] = "generate_cover_letter"
            return state
        
        job_title = best_job.get("title", "Software Developer")
        job_description = best_job.get("description", "")
        
        # Extract company name
        company = best_job.get("company")
        company_name = (
            best_job.get("company_name")
            or (company.get("name") if isinstance(company, dict) else None)
            or "the company"
        )
        
        extracted_skills = state.get("extracted_skills", [])
        candidate_name = "the candidate"
        
        result = await gemini_service.generate_cover_letter(
            job_title=job_title,
            company_name=company_name,
            job_description=job_description,
            extracted_skills=extracted_skills,
            candidate_name=candidate_name,
        )
        
        state["cover_letter"] = result
        logger.info("Cover letter generated")
        
    except Exception as e:
        error_msg = f"Cover letter generation failed: {str(e)}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
        state["cover_letter"] = None
    
    state["current_step"] = "generate_cover_letter"
    return state


async def generate_checklist_node(state: AgentState) -> AgentState:
    """Generate interview preparation checklist"""
    logger.info("Entering Generate Preparation Checklist Node...")
    
    try:
        # Use the best matched job for context
        best_job = None
        if state.get("selected_job"):
            best_job = state["selected_job"]
        elif state.get("matched_jobs"):
            best_job = state["matched_jobs"][0]
            
        if not best_job:
            logger.warning("No job available for checklist")
            state["checklist"] = None
            state["current_step"] = "generate_checklist"
            return state
        
        job_title = best_job.get("title", "Software Developer")
        
        match_score = best_job.get("matchScore", {})
        matched_skills = match_score.get("matchedSkills", [])
        missing_skills = match_score.get("missingRequiredSkills", [])
        
        result = await gemini_service.generate_preparation_checklist(
            job_title=job_title,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
        )
        
        state["checklist"] = result
        logger.info("Preparation checklist generated")
        
    except Exception as e:
        error_msg = f"Preparation checklist generation failed: {str(e)}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
        state["checklist"] = None
    
    state["current_step"] = "generate_checklist"
    return state
