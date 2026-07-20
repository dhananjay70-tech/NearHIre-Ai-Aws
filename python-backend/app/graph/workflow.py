"""
workflow.py — LangGraph workflow definition
Builds and compiles the agent workflow for resume analysis
"""

import logging
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END

from app.graph.state import AgentState
from app.graph.nodes import (
    parse_resume_node,
    extract_skills_node,
    fetch_jobs_node,
    match_jobs_node,
    fetch_selected_job_node,
    score_selected_job_node,
    generate_resume_feedback_node,
    generate_interview_questions_node,
    generate_roadmap_node,
    generate_cover_letter_node,
    generate_checklist_node,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def should_fetch_jobs(state: AgentState) -> Literal["fetch_jobs", "fetch_selected_job"]:
    """Determine whether to fetch all jobs or a specific job"""
    if state.get("job_id"):
        logger.info("Routing to fetch selected job (job_id provided)")
        return "fetch_selected_job"
    logger.info("Routing to fetch all jobs")
    return "fetch_jobs"


def should_score_selected_job(state: AgentState) -> Literal["score_selected_job", "match_jobs"]:
    """Determine whether to score selected job or match all jobs"""
    if state.get("job_id") and state.get("selected_job"):
        logger.info("Routing to score selected job")
        return "score_selected_job"
    logger.info("Routing to match all jobs")
    return "match_jobs"


def should_proceed_to_ai(state: AgentState) -> Literal["generate_resume_feedback", END]:
    """Determine whether to proceed to AI generation or end"""
    if state.get("errors"):
        logger.info(f"Errors encountered, ending workflow: {state['errors']}")
        return END
    
    # If we have a selected job with match data, proceed to AI generation
    if state.get("selected_job") and state.get("selected_job", {}).get("matchScore"):
        logger.info("Proceeding to AI generation with selected job")
        return "generate_resume_feedback"
    
    # If we have matched jobs, proceed to AI generation
    if state.get("matched_jobs"):
        logger.info("Proceeding to AI generation with matched jobs")
        return "generate_resume_feedback"
    
    logger.info("No job data available, ending workflow")
    return END


def build_workflow() -> StateGraph:
    """Build and return the LangGraph workflow"""
    
    logger.info("Building LangGraph workflow...")
    
    # Create the workflow graph
    workflow = StateGraph(AgentState)
    
    # Add all nodes
    workflow.add_node("extract_skills", extract_skills_node)
    workflow.add_node("fetch_jobs", fetch_jobs_node)
    workflow.add_node("match_jobs", match_jobs_node)
    workflow.add_node("fetch_selected_job", fetch_selected_job_node)
    workflow.add_node("score_selected_job", score_selected_job_node)
    workflow.add_node("generate_resume_feedback", generate_resume_feedback_node)
    workflow.add_node("parse_resume", parse_resume_node)
    workflow.add_node("generate_interview_questions", generate_interview_questions_node)
    workflow.add_node("generate_roadmap", generate_roadmap_node)
    workflow.add_node("generate_cover_letter", generate_cover_letter_node)
    workflow.add_node("generate_checklist", generate_checklist_node)
    
    # Define the workflow edges
    
    # Start -> Parse Resume
    workflow.set_entry_point("parse_resume")
    
    # Parse Resume -> Extract Skills
    workflow.add_edge("parse_resume", "extract_skills")
    
    # Extract Skills -> Conditional routing
    workflow.add_conditional_edges(
        "extract_skills",
        should_fetch_jobs,
        {
            "fetch_jobs": "fetch_jobs",
            "fetch_selected_job": "fetch_selected_job",
        }
    )
    
    # Fetch Jobs -> Match Jobs
    workflow.add_edge("fetch_jobs", "match_jobs")
    
    # Fetch Selected Job -> Conditional routing
    workflow.add_conditional_edges(
        "fetch_selected_job",
        should_score_selected_job,
        {
            "score_selected_job": "score_selected_job",
            "match_jobs": "match_jobs",
        }
    )
    
    # Match Jobs -> Conditional routing to AI or end
    workflow.add_conditional_edges(
        "match_jobs",
        should_proceed_to_ai,
        {
            "generate_resume_feedback": "generate_resume_feedback",
            END: END,
        }
    )
    
    # Score Selected Job -> Conditional routing to AI or end
    workflow.add_conditional_edges(
        "score_selected_job",
        should_proceed_to_ai,
        {
            "generate_resume_feedback": "generate_resume_feedback",
            END: END,
        }
    )
    
    # AI Generation chain (linear)
    workflow.add_edge("generate_resume_feedback", "generate_interview_questions")
    workflow.add_edge("generate_interview_questions", "generate_roadmap")
    workflow.add_edge("generate_roadmap", "generate_cover_letter")
    workflow.add_edge("generate_cover_letter", "generate_checklist")
    
    # End of workflow
    workflow.add_edge("generate_checklist", END)
    
    # Compile the workflow
    compiled_workflow = workflow.compile()
    
    logger.info("LangGraph workflow compiled successfully")
    
    return compiled_workflow


# Create a singleton instance
graph = build_workflow()
