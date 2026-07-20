"""
gemini_service.py — Optional Google Gemini generative AI wrapper.
When GEMINI_API_KEY is absent, functions return deterministic fallbacks.
"""

import asyncio
from typing import List, Optional
from app.config import settings

GEMINI_UNAVAILABLE = (
    "Gemini AI is not configured. Showing deterministic fallback content. "
    "Core features (resume parsing, skill extraction, matching) work without it."
)


def _gemini_available() -> bool:
    return bool(settings.GEMINI_API_KEY)


async def _call_gemini(prompt: str, system_instruction: str = "") -> str:
    """
    Call the Gemini API via LangChain ChatGoogleGenerativeAI. Returns generated text.
    Raises RuntimeError on API failure.
    """
    if not _gemini_available():
        raise RuntimeError(GEMINI_UNAVAILABLE)

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore
        from langchain_core.messages import SystemMessage, HumanMessage  # type: ignore

        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.7,
            max_retries=1,
            timeout=10,
        )

        messages = []
        if system_instruction:
            messages.append(SystemMessage(content=system_instruction))
        messages.append(HumanMessage(content=prompt))

        response = await asyncio.wait_for(llm.ainvoke(messages), timeout=10.0)
        return str(response.content)
    except ImportError:
        raise RuntimeError(
            "langchain-google-genai or langchain-core packages not installed. "
            "Run: pip install langchain-google-genai langchain-core"
        )
    except Exception as exc:
        raise RuntimeError(f"Gemini API via LangChain error: {str(exc)}")


# ─── Deterministic Fallbacks ──────────────────────────────────────────────────

def _deterministic_interview_questions(
    job_title: str,
    required_skills: List[str],
    matched_skills: List[str],
    missing_skills: List[str],
) -> dict:
    """Generate rule-based interview questions when Gemini is unavailable."""
    technical = []
    # Skills-based questions
    for skill in (required_skills or [])[:5]:
        technical.append(f"Can you explain your experience with {skill} and how you've used it in a project?")
    # Padding if fewer skills
    generic_technical = [
        f"Walk us through a challenging technical problem you solved as a {job_title}.",
        "How do you ensure code quality and maintainability in your projects?",
        "Describe your experience with version control and collaborative development workflows.",
        "How do you approach debugging complex issues in production?",
        "What is your approach to learning new technologies quickly?",
    ]
    while len(technical) < 5:
        technical.append(generic_technical[len(technical)])

    project_based = [
        f"Describe your most significant project as a {job_title}. What were the key technical decisions?",
        f"Have you worked on a project that required {', '.join((required_skills or ['multiple technologies'])[:2])}? Walk us through it.",
        "How did you handle a situation where project requirements changed mid-development?",
    ]

    behavioural = [
        "Tell me about a time you had to meet a tight deadline. How did you manage it?",
        "Describe a situation where you had a conflict with a team member and how you resolved it.",
        "Give an example of when you proactively improved a process or codebase beyond your assigned task.",
    ]

    hr = [
        f"Why are you interested in this {job_title} role specifically?",
        "Where do you see yourself professionally in the next 2-3 years?",
        "What motivates you to do your best work?",
    ]

    return {
        "technical": technical,
        "projectBased": project_based,
        "behavioural": behavioural,
        "hr": hr,
        "_source": "deterministic",
    }


def _deterministic_learning_roadmap(
    missing_required_skills: List[str],
    job_title: Optional[str],
    current_skills: List[str],
) -> dict:
    """Generate a rule-based learning roadmap when Gemini is unavailable."""
    RESOURCE_MAP = {
        "react": ("React Official Docs + freeCodeCamp", "3-4 weeks"),
        "node.js": ("Node.js Official Docs + The Odin Project", "3-4 weeks"),
        "python": ("Python.org Tutorial + CS50P (Harvard)", "2-3 weeks"),
        "typescript": ("TypeScript Handbook (typescriptlang.org)", "2 weeks"),
        "docker": ("Docker Official Docs + Play With Docker", "1-2 weeks"),
        "kubernetes": ("Kubernetes Official Docs + KodeKloud", "3-4 weeks"),
        "aws": ("AWS Free Tier + AWS Skill Builder (free)", "4-6 weeks"),
        "postgresql": ("PostgreSQL Tutorial (postgresqltutorial.com)", "2 weeks"),
        "mongodb": ("MongoDB University (free courses)", "2 weeks"),
        "machine learning": ("fast.ai + Google ML Crash Course (free)", "6-8 weeks"),
        "tensorflow": ("TensorFlow Official Tutorials (free)", "4 weeks"),
        "graphql": ("GraphQL Official Docs + How To GraphQL", "1-2 weeks"),
        "redis": ("Redis University (free courses)", "1-2 weeks"),
        "git": ("Pro Git Book (free) + GitHub Learning Lab", "1 week"),
        "jenkins": ("Jenkins Official Docs + YouTube tutorials", "2 weeks"),
        "system design": ("System Design Primer (GitHub, free)", "4-6 weeks"),
    }

    roadmap = []
    for i, skill in enumerate(missing_required_skills[:8]):
        skill_lower = skill.lower()
        resource, time = RESOURCE_MAP.get(
            skill_lower,
            (f"Search: '{skill} tutorial free' on YouTube or freeCodeCamp", "2-3 weeks"),
        )
        priority = "High" if i < 2 else ("Medium" if i < 5 else "Low")
        roadmap.append({
            "skill": skill,
            "priority": priority,
            "estimatedTime": time,
            "resource": resource,
        })

    total_weeks = len(roadmap) * 2
    return {
        "roadmap": roadmap,
        "totalEstimatedTime": f"Approximately {total_weeks}–{total_weeks + len(roadmap)} weeks",
        "_source": "deterministic",
    }


def _deterministic_cover_letter(
    job_title: str,
    company_name: str,
    extracted_skills: List[str],
    candidate_name: str,
) -> dict:
    """Generate a template-based cover letter when Gemini is unavailable."""
    skill_list = ", ".join(extracted_skills[:6]) if extracted_skills else "relevant technical skills"
    company = company_name or "your organisation"
    name = candidate_name if candidate_name != "the candidate" else "I"

    letter = f"""Dear Hiring Manager,

I am writing to express my interest in the {job_title} position at {company}. Having developed proficiency in {skill_list}, I believe my skills align well with what your team is looking for.

Throughout my career, I have focused on delivering high-quality solutions and continuously expanding my technical capabilities. I am particularly excited about this opportunity because it aligns with my goal of working on challenging problems in a collaborative environment.

I would welcome the opportunity to discuss how my background and skills could contribute to {company}'s goals. Thank you for considering my application.

Sincerely,
{name}

_Note: This is a template-based cover letter. Enable Gemini AI for a personalised version._"""
    return {"coverLetter": letter, "_source": "deterministic"}


def _deterministic_resume_feedback(
    extracted_skills: List[str],
    job_title: Optional[str],
    required_skills: List[str],
) -> dict:
    """Generate rule-based resume feedback when Gemini is unavailable."""
    matched = set(s.lower() for s in extracted_skills) & set(s.lower() for s in required_skills)
    missing = [s for s in required_skills if s.lower() not in set(sk.lower() for sk in extracted_skills)]

    strengths = []
    if len(extracted_skills) >= 8:
        strengths.append("Good breadth of technical skills detected in your resume.")
    if len(extracted_skills) >= 5:
        strengths.append(f"Skills such as {', '.join(extracted_skills[:4])} are clearly present.")
    if matched:
        strengths.append(f"You match {len(matched)} required skill(s) for a {job_title or 'developer'} role.")
    if not strengths:
        strengths.append("Your resume has been submitted. Expand with more specific technical details to improve visibility.")

    missing_keywords = missing[:6]
    if not missing_keywords and required_skills:
        missing_keywords = ["Consider adding more specific version numbers or frameworks to strengthen impact."]

    suggestions = [
        "Use bullet points with action verbs (Built, Led, Optimised, Reduced) for each experience entry.",
        "Quantify your achievements where possible (e.g., 'reduced load time by 40%').",
        "Ensure your resume uses ATS-friendly formatting (no tables, no columns for key content).",
    ]
    if missing:
        suggestions.insert(0, f"Consider adding experience with: {', '.join(missing[:4])} to match this role better.")

    return {
        "strengths": strengths,
        "missingKeywords": missing_keywords,
        "improvementSuggestions": suggestions,
        "_source": "deterministic",
    }


def _deterministic_preparation_checklist(
    job_title: str,
    matched_skills: List[str],
    missing_skills: List[str],
) -> dict:
    """Generate a deterministic preparation checklist."""
    checklist = {
        "week1": [
            "Research the company: products, tech stack, recent news",
            "Review the job description and map your experience to each requirement",
            f"Brush up on core skills: {', '.join((matched_skills or ['your key skills'])[:3])}",
            "Update your resume to highlight relevant experience",
            "Prepare your STAR-method stories for behavioural questions",
        ],
        "week2": [
            f"Practice coding problems related to: {', '.join((matched_skills or ['relevant topics'])[:2])}",
            "Complete at least 5 mock interviews (LeetCode, Pramp, or Interviewing.io)",
            "Study system design fundamentals if applicable to the role",
            "Prepare 5 thoughtful questions to ask the interviewer",
            "Review your past projects and be ready to walk through the technical decisions",
        ],
        "beforeInterview": [
            "Test your video/audio setup 30 minutes before the call",
            "Keep a copy of your resume and the job description visible",
            "Prepare a concise 2-minute professional introduction",
            "Research your interviewer(s) on LinkedIn if names are known",
            "Get a good night's sleep and have water ready",
        ],
        "skillGaps": [
            f"Focus on: {s}" for s in (missing_skills or [])[:4]
        ] or ["No critical skill gaps detected based on the job requirements."],
    }

    return {
        "checklist": checklist,
        "jobTitle": job_title,
        "_source": "deterministic",
    }


# ─── Public API functions ─────────────────────────────────────────────────────

async def generate_interview_questions(
    job_title: str,
    job_description: str,
    required_skills: List[str],
    matched_skills: List[str],
    missing_skills: List[str],
) -> dict:
    if not _gemini_available():
        fallback = _deterministic_interview_questions(
            job_title, required_skills, matched_skills, missing_skills
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": GEMINI_UNAVAILABLE,
            "data": fallback,
        }

    prompt = f"""You are a technical interview coach preparing a candidate for the role of '{job_title}'.

Job Description: {job_description or 'Not provided'}
Required Skills: {', '.join(required_skills) or 'Not specified'}
Candidate's Matched Skills: {', '.join(matched_skills) or 'None'}
Candidate's Missing Skills: {', '.join(missing_skills) or 'None'}

Generate interview questions in four categories:
1. Technical Questions (5 questions based on required skills)
2. Project-Based Questions (3 questions)
3. Behavioural Questions (3 questions)
4. HR Questions (2 questions)

Format as JSON:
{{
  "technical": ["q1", "q2", ...],
  "projectBased": ["q1", "q2", ...],
  "behavioural": ["q1", "q2", ...],
  "hr": ["q1", "q2"]
}}"""

    try:
        import json
        text = await _call_gemini(prompt)
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
        else:
            data = {"raw": text}
        return {"available": True, "geminiUsed": True, "data": data}
    except Exception as exc:
        # Graceful degradation to deterministic fallback
        fallback = _deterministic_interview_questions(
            job_title, required_skills, matched_skills, missing_skills
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": f"Gemini failed ({str(exc)}). Showing deterministic questions.",
            "data": fallback,
        }


async def generate_learning_roadmap(
    missing_required_skills: List[str],
    job_title: Optional[str],
    current_skills: List[str],
) -> dict:
    if not _gemini_available():
        fallback = _deterministic_learning_roadmap(
            missing_required_skills, job_title, current_skills
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": GEMINI_UNAVAILABLE,
            "data": fallback,
        }

    prompt = f"""You are a career development coach.
Role: {job_title or 'Software Developer'}
Current Skills: {', '.join(current_skills) or 'Not specified'}
Missing Required Skills: {', '.join(missing_required_skills) or 'None'}

Create a prioritized learning roadmap to acquire the missing skills. For each skill:
- Recommended free resource
- Estimated time to learn
- Priority (High/Medium/Low)

Format as JSON:
{{
  "roadmap": [
    {{
      "skill": "...",
      "priority": "High|Medium|Low",
      "estimatedTime": "...",
      "resource": "..."
    }}
  ],
  "totalEstimatedTime": "..."
}}"""

    try:
        import json
        text = await _call_gemini(prompt)
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
        else:
            data = {"raw": text}
        return {"available": True, "geminiUsed": True, "data": data}
    except Exception as exc:
        fallback = _deterministic_learning_roadmap(
            missing_required_skills, job_title, current_skills
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": f"Gemini failed ({str(exc)}). Showing deterministic roadmap.",
            "data": fallback,
        }


async def generate_cover_letter(
    job_title: str,
    company_name: str,
    job_description: str,
    extracted_skills: List[str],
    candidate_name: str,
) -> dict:
    if not _gemini_available():
        fallback = _deterministic_cover_letter(
            job_title, company_name, extracted_skills, candidate_name
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": GEMINI_UNAVAILABLE,
            "data": fallback,
        }

    prompt = f"""Write a concise, professional cover letter for {candidate_name} applying to the role of '{job_title}' at '{company_name}'.

Job Description: {job_description or 'Not provided'}
Candidate Skills: {', '.join(extracted_skills) or 'Not specified'}

Instructions:
- Keep it under 250 words
- Be specific about the role and company
- Do not invent experience not mentioned in the skills
- Professional tone
- Format as plain text (no JSON)"""

    try:
        text = await _call_gemini(prompt)
        return {"available": True, "geminiUsed": True, "data": {"coverLetter": text}}
    except Exception as exc:
        fallback = _deterministic_cover_letter(
            job_title, company_name, extracted_skills, candidate_name
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": f"Gemini failed ({str(exc)}). Showing template letter.",
            "data": fallback,
        }
async def generate_resume_feedback(
    resume_text: str,
    extracted_skills: List[str],
    job_title: Optional[str],
    required_skills: List[str],
) -> dict:
    resume_text = resume_text or ""
    if not _gemini_available():
        fallback = _deterministic_resume_feedback(
            extracted_skills, job_title, required_skills
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": GEMINI_UNAVAILABLE,
            "data": fallback,
        }

    prompt = f"""Review this resume for the role of '{job_title or 'a software developer'}':

RESUME TEXT (first 2000 chars):
{resume_text[:2000]}

Detected Skills: {', '.join(extracted_skills) or 'None'}
Required Skills for Role: {', '.join(required_skills) or 'Not specified'}

Provide feedback on:
1. Strengths (what is done well)
2. Missing Keywords (important skills/keywords absent)
3. Improvement Suggestions (actionable advice)

Important: Do NOT claim any ATS guarantee or score.
Format as JSON:
{{
  "strengths": ["..."],
  "missingKeywords": ["..."],
  "improvementSuggestions": ["..."]
}}"""

    try:
        import json
        text = await _call_gemini(prompt)
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
        else:
            data = {"raw": text}
        return {"available": True, "geminiUsed": True, "data": data}
    except Exception as exc:
        fallback = _deterministic_resume_feedback(
            extracted_skills, job_title, required_skills
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": f"Gemini failed ({str(exc)}). Showing deterministic feedback.",
            "data": fallback,
        }


async def generate_preparation_checklist(
    job_title: str,
    matched_skills: List[str],
    missing_skills: List[str],
) -> dict:
    """Generate a preparation checklist. Always has a deterministic fallback."""
    if not _gemini_available():
        fallback = _deterministic_preparation_checklist(
            job_title, matched_skills, missing_skills
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": GEMINI_UNAVAILABLE,
            "data": fallback,
        }

    prompt = f"""Create a structured interview preparation checklist for a candidate applying for the role of '{job_title}'.

Matched Skills: {', '.join(matched_skills) or 'None specified'}
Skills to Develop: {', '.join(missing_skills) or 'None'}

Generate a week-by-week checklist covering:
- Week 1: Research and resume preparation
- Week 2: Technical practice
- Before the interview day
- Skill gap focus areas

Format as JSON:
{{
  "week1": ["task1", "task2", ...],
  "week2": ["task1", "task2", ...],
  "beforeInterview": ["task1", "task2", ...],
  "skillGaps": ["task1", "task2", ...]
}}"""

    try:
        import json
        text = await _call_gemini(prompt)
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
        else:
            data = {"raw": text}
        return {
            "available": True,
            "geminiUsed": True,
            "data": {**data, "jobTitle": job_title},
        }
    except Exception as exc:
        fallback = _deterministic_preparation_checklist(
            job_title, matched_skills, missing_skills
        )
        return {
            "available": True,
            "geminiUsed": False,
            "message": f"Gemini failed ({str(exc)}). Showing deterministic checklist.",
            "data": fallback,
        }


async def chat_with_coach(history: List[dict], new_message: str) -> str:
    """
    Call Gemini using conversation history for a multi-turn chat experience.
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        if not _gemini_available():
            raise RuntimeError("Gemini API key not configured")

        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.7,
            max_retries=1,
            timeout=10,
        )

        messages = [
            SystemMessage(content=(
                "You are an expert AI Career Coach at NearHire.AI. "
                "Your job is to help users with career guidance, resume improvements, "
                "job interview prep, skill development, salary negotiation, and overall professional growth. "
                "Be supportive, professional, actionable, and keep responses concise and structured in markdown."
            ))
        ]

        # Append history
        for msg in history:
            role = str(msg.get("role")).upper()
            text = msg.get("message") or ""
            if role == "USER":
                messages.append(HumanMessage(content=text))
            elif role in ("ASSISTANT", "COACH"):
                messages.append(AIMessage(content=text))

        # Append new message
        messages.append(HumanMessage(content=new_message))

        response = await asyncio.wait_for(llm.ainvoke(messages), timeout=10.0)
        return str(response.content)
    except Exception as exc:
        logger.warning("Gemini chat failed or unconfigured: %s", exc)
        
        msg_lower = new_message.lower()
        if any(term in msg_lower for term in ("hello", "hi", "hey")):
            return (
                "Hello! I'm your AI Career Coach at NearHire.AI.\n\n"
                "Although my live connection is currently limited, I can help you with career tips! "
                "Ask me about:\n"
                "- **Resume improvements**\n"
                "- **Interview preparation**\n"
                "- **Job search tips**"
            )
        elif "resume" in msg_lower:
            return (
                "### Resume Improvement Tips\n\n"
                "1. **Highlight Skills**: Create a dedicated section for technical skills.\n"
                "2. **Use Action Verbs**: Start bullet points with strong verbs (e.g., *Built*, *Optimized*, *Delivered*).\n"
                "3. **Quantify Impact**: Include metrics where possible (e.g., *'Reduced load times by 20%'*).\n"
                "4. **ATS Formatting**: Avoid complex tables or multi-column layouts that confuse scanners."
            )
        elif any(term in msg_lower for term in ("interview", "prep", "question")):
            return (
                "### Interview Preparation Tips\n\n"
                "1. **STAR Method**: Use *Situation, Task, Action, Result* to answer behavioral questions.\n"
                "2. **Research**: Learn about the company's product, tech stack, and values.\n"
                "3. **Coding Practice**: Brush up on data structures, algorithms, and system design.\n"
                "4. **Ask Questions**: Prepare 3-4 questions to show your interest and engagement at the end."
            )
        else:
            return (
                "I am your AI Career Coach. Gemini is currently offline or unconfigured, but I'm here to support you! "
                "Please upload your resume to see matching jobs, or ask me for tips on **resumes** and **interviews**."
            )
