"""
skill_extractor.py — Deterministic skill extraction from resume text.
Optionally enhanced by Gemini when GEMINI_API_KEY is available.
"""

import re
from typing import List, Dict


# ─── Skill Dictionary ─────────────────────────────────────────────────────────
# Maps raw aliases → canonical skill name

SKILL_ALIASES: dict[str, str] = {
    # JavaScript ecosystem
    "javascript": "JavaScript",
    "js": "JavaScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "node": "Node.js",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "react": "React",
    "react.js": "React",
    "reactjs": "React",
    "react native": "React Native",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "vue": "Vue.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "express": "Express.js",
    "express.js": "Express.js",
    "expressjs": "Express.js",
    "redux": "Redux",
    "jquery": "jQuery",
    "webpack": "Webpack",
    "vite": "Vite",

    # Python ecosystem
    "python": "Python",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "scikit-learn": "scikit-learn",
    "sklearn": "scikit-learn",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "keras": "Keras",
    "matplotlib": "Matplotlib",
    "scipy": "SciPy",

    # Databases
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "mongo": "MongoDB",
    "redis": "Redis",
    "sqlite": "SQLite",
    "sql": "SQL",
    "nosql": "NoSQL",
    "elasticsearch": "Elasticsearch",
    "firebase": "Firebase",

    # Cloud & DevOps
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "aws": "AWS",
    "amazon web services": "AWS",
    "azure": "Azure",
    "gcp": "GCP",
    "google cloud": "GCP",
    "terraform": "Terraform",
    "ansible": "Ansible",
    "jenkins": "Jenkins",
    "ci/cd": "CI/CD",
    "github actions": "GitHub Actions",
    "nginx": "Nginx",
    "linux": "Linux",

    # Version control
    "git": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",
    "bitbucket": "Bitbucket",

    # Web / markup
    "html": "HTML",
    "html5": "HTML",
    "css": "CSS",
    "css3": "CSS",
    "sass": "Sass/SCSS",
    "scss": "Sass/SCSS",
    "tailwind": "Tailwind CSS",
    "bootstrap": "Bootstrap",

    # Testing
    "jest": "Jest",
    "selenium": "Selenium",
    "cypress": "Cypress",
    "mocha": "Mocha",
    "pytest": "pytest",
    "unittest": "unittest",

    # APIs
    "rest api": "REST API",
    "restful": "REST API",
    "graphql": "GraphQL",
    "websocket": "WebSocket",
    "grpc": "gRPC",

    # Other languages
    "java": "Java",
    "c++": "C++",
    "cpp": "C++",
    "c#": "C#",
    "csharp": "C#",
    "go": "Go",
    "golang": "Go",
    "rust": "Rust",
    "ruby": "Ruby",
    "php": "PHP",
    "swift": "Swift",
    "kotlin": "Kotlin",
    "r": "R",

    # DSA / Computer Science
    "dsa": "Data Structures & Algorithms",
    "data structures": "Data Structures & Algorithms",
    "algorithms": "Data Structures & Algorithms",

    # Other
    "agile": "Agile",
    "scrum": "Scrum",
    "jira": "Jira",
    "figma": "Figma",
    "microservices": "Microservices",
    "system design": "System Design",
    "machine learning": "Machine Learning",
    "ml": "Machine Learning",
    "deep learning": "Deep Learning",
    "nlp": "NLP",
    "data science": "Data Science",
    "data analysis": "Data Analysis",
    "power bi": "Power BI",
    "tableau": "Tableau",
    "excel": "Excel",
}


def _normalize(text: str) -> str:
    return text.lower().strip()


def extract_skills_deterministic(resume_text: str) -> List[str]:
    """
    Scan resume text for skill aliases using word-boundary matching.
    Returns a deduplicated list of canonical skill names.
    """
    text_lower = resume_text.lower()
    found: dict[str, str] = {}  # canonical_name → first alias found

    for alias, canonical in SKILL_ALIASES.items():
        # Use word boundary matching; handle special chars
        escaped = re.escape(alias)
        pattern = rf"(?<![a-zA-Z0-9_]){escaped}(?![a-zA-Z0-9_])"
        if re.search(pattern, text_lower):
            found[canonical] = alias

    return sorted(found.keys())


def extract_education_hints(resume_text: str) -> List[str]:
    """Extract education-related lines (heuristic, not guaranteed)."""
    patterns = [
        r"b\.?\s*tech|bachelor|b\.e\.|bsc|m\.?\s*tech|master|m\.s\.|phd|diploma",
        r"\b(computer science|information technology|electronics|mechanical|civil)\b",
    ]
    lines = resume_text.split("\n")
    hints = []
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        for pattern in patterns:
            if re.search(pattern, line_stripped, re.IGNORECASE):
                if line_stripped not in hints:
                    hints.append(line_stripped)
                break
    return hints[:5]


def extract_experience_hints(resume_text: str) -> List[str]:
    """Extract lines that look like job/experience entries (heuristic)."""
    patterns = [
        r"\b(intern|engineer|developer|analyst|manager|lead|architect|consultant)\b",
        r"\b(20\d{2})\s*[-–]\s*(20\d{2}|present|current)\b",
    ]
    lines = resume_text.split("\n")
    hints = []
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped or len(line_stripped) < 10:
            continue
        for pattern in patterns:
            if re.search(pattern, line_stripped, re.IGNORECASE):
                if line_stripped not in hints and len(hints) < 6:
                    hints.append(line_stripped)
                break
    return hints


def extract_project_hints(resume_text: str) -> List[str]:
    """Extract lines near 'project' keyword."""
    lines = resume_text.split("\n")
    in_project_section = False
    hints = []
    for line in lines:
        stripped = line.strip()
        if re.search(r"\bproject[s]?\b", stripped, re.IGNORECASE) and len(stripped) < 40:
            in_project_section = True
            continue
        if in_project_section and stripped:
            hints.append(stripped)
            if len(hints) >= 5:
                break
        if not stripped:
            in_project_section = False
    return hints


def extract_certifications(resume_text: str) -> List[str]:
    """Extract certification-related lines (heuristic)."""
    patterns = [
        r"\b(certif|certified|certification|aws certified|google certified|microsoft certified|oracle certified)\b",
        r"\b(coursera|udemy|edx|pluralsight|linkedin learning)\b",
    ]
    lines = resume_text.split("\n")
    certs = []
    for line in lines:
        stripped = line.strip()
        if not stripped or len(stripped) < 8:
            continue
        for pattern in patterns:
            if re.search(pattern, stripped, re.IGNORECASE):
                if stripped not in certs and len(certs) < 5:
                    certs.append(stripped)
                break
    return certs


def extract_contact_hints(resume_text: str) -> Dict[str, bool]:
    """Detect presence of contact information sections."""
    email_pattern = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
    phone_pattern = r"(\+91[\s\-]?)?[6-9]\d{9}|\+\d{1,3}[\s\-]?\d{6,}"
    linkedin_pattern = r"linkedin\s*\.\s*com|lnkd\s*\.\s*in"
    github_pattern = r"git\s*hub\s*\.\s*com|git\s*hub\s*\.\s*io"
    portfolio_pattern = r"(portfolio|personal site|my website|www\.(?!(?:[a-z0-9\-]+\.)*(?:linkedin|github|git\s*hub))|https?://(?!(?:[a-z0-9\-]+\.)*(?:linkedin|github|git\s*hub)))"

    return {
        "emailFound": bool(re.search(email_pattern, resume_text, re.IGNORECASE)),
        "phoneFound": bool(re.search(phone_pattern, resume_text)),
        "linkedinFound": bool(re.search(linkedin_pattern, resume_text, re.IGNORECASE)),
        "githubFound": bool(re.search(github_pattern, resume_text, re.IGNORECASE)),
        "portfolioFound": bool(re.search(portfolio_pattern, resume_text, re.IGNORECASE)),
    }


def compute_resume_completeness(
    resume_text: str,
    extracted_skills: List[str],
    education: List[str],
    experience_hints: List[str],
    projects: List[str],
    contact_hints: Dict[str, bool],
) -> Dict:
    """
    Compute a deterministic resume completeness score.
    Returns score (0-100), component scores, strengths, missing sections, suggestions.
    """
    # Component scores (each 0-100)
    # Contact: presence of email, phone, linkedin, github, portfolio
    contact_items = [
        contact_hints.get("emailFound", False),
        contact_hints.get("phoneFound", False),
        contact_hints.get("linkedinFound", False),
        contact_hints.get("githubFound", False),
        contact_hints.get("portfolioFound", False),
    ]
    contact_score = round(sum(1 for v in contact_items if v) / len(contact_items) * 100)

    # Skills: based on count of detected skills
    skill_count = len(extracted_skills)
    if skill_count >= 12:
        skills_score = 100
    elif skill_count >= 8:
        skills_score = 80
    elif skill_count >= 5:
        skills_score = 60
    elif skill_count >= 2:
        skills_score = 40
    elif skill_count >= 1:
        skills_score = 20
    else:
        skills_score = 0

    # Education: presence of education info
    education_score = 100 if len(education) >= 1 else 0

    # Projects: presence of project info
    if len(projects) >= 3:
        projects_score = 100
    elif len(projects) >= 1:
        projects_score = 60
    else:
        projects_score = 0

    # Experience: presence of experience info
    if len(experience_hints) >= 3:
        experience_score = 100
    elif len(experience_hints) >= 1:
        experience_score = 50
    else:
        experience_score = 0

    # Overall weighted score
    overall = round(
        contact_score * 0.20
        + skills_score * 0.25
        + education_score * 0.20
        + projects_score * 0.15
        + experience_score * 0.20
    )

    # Strengths
    strengths = []
    if contact_hints.get("emailFound"):
        strengths.append("Email contact included")
    if contact_hints.get("linkedinFound"):
        strengths.append("LinkedIn profile linked")
    if contact_hints.get("githubFound"):
        strengths.append("GitHub profile linked")
    if skill_count >= 5:
        strengths.append(f"Strong skill coverage ({skill_count} detected skills)")
    if len(education) >= 1:
        strengths.append("Education section present")
    if len(projects) >= 1:
        strengths.append("Projects section present")
    if len(experience_hints) >= 2:
        strengths.append("Work experience included")

    # Missing sections
    missing = []
    if not contact_hints.get("emailFound"):
        missing.append("email address")
    if not contact_hints.get("phoneFound"):
        missing.append("phone number")
    if not contact_hints.get("linkedinFound"):
        missing.append("LinkedIn URL")
    if not contact_hints.get("githubFound"):
        missing.append("GitHub URL")
    if skill_count < 3:
        missing.append("skills section (few recognized skills detected)")
    if not education:
        missing.append("education section")
    if not projects:
        missing.append("projects section")
    if not experience_hints:
        missing.append("work experience section")

    # Suggestions
    suggestions = []
    if skill_count < 8:
        suggestions.append("Add more specific technical skills relevant to your target roles.")
    if not contact_hints.get("githubFound"):
        suggestions.append("Include your GitHub URL to showcase code and projects.")
    if not contact_hints.get("portfolioFound") and not contact_hints.get("githubFound"):
        suggestions.append("Add a portfolio or personal website link.")
    if not projects:
        suggestions.append("Add a Projects section with 2-3 key projects and technologies used.")
    if overall < 60:
        suggestions.append("Expand your resume with more quantifiable achievements and details.")

    # Determine label
    if overall >= 85:
        label = "Excellent resume completeness"
    elif overall >= 65:
        label = "Good resume completeness"
    elif overall >= 45:
        label = "Fair resume completeness — improvements recommended"
    else:
        label = "Needs significant improvement"

    return {
        "score": overall,
        "label": label,
        "components": {
            "contact": contact_score,
            "skills": skills_score,
            "education": education_score,
            "projects": projects_score,
            "experience": experience_score,
        },
        "strengths": strengths,
        "missingSections": missing,
        "suggestions": suggestions,
    }


def build_summary(resume_text: str, extracted_skills: List[str]) -> str:
    """Generate a brief deterministic summary of the resume."""
    skill_count = len(extracted_skills)
    top_skills = ", ".join(extracted_skills[:6]) if extracted_skills else "no recognized skills"
    word_count = len(resume_text.split())
    return (
        f"Resume contains approximately {word_count} words. "
        f"Detected {skill_count} recognized skill(s): {top_skills}."
    )
