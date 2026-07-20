# NearHire.AI — Agentic Workflow Documentation

## Why This Is Agentic

NearHire.AI implements a multi-step goal-based agentic workflow where:

1. **Multiple tools/services** are composed (PDF parser, skill extractor, job API, matching engine, AI generator)
2. **Goal-based steps** guide the user from resume → matched job → preparation
3. **Context is passed between steps** (extracted skills → matching → AI prompts)
4. **Actions depend on previous results** (roadmap uses *missing* skills from match score)

---

## Workflow: "Find the best nearby jobs for my resume and prepare me for the selected job"

### Step 1 — Parse Resume
- **Service**: `resume_parser.py`
- **Input**: User-uploaded PDF (≤5 MB)
- **Action**: PyMuPDF extracts raw text from all pages
- **Output**: `resumeText` (plain string)
- **Error handling**: Validates size, magic bytes, page count, non-empty text

### Step 2 — Extract Skills
- **Service**: `skill_extractor.py`
- **Input**: `resumeText`
- **Action**: Deterministic regex scan against 100+ skill aliases in canonical dictionary
- **Output**: `extractedSkills` (sorted list of canonical skill names)
- **Design**: Works entirely without Gemini; Gemini can optionally enrich results

### Step 3 — Retrieve Jobs from Node Backend
- **Service**: `node_client.py`
- **Input**: Optional coordinates, radius, filters
- **Action**: `GET /api/jobs` or `GET /api/jobs/nearby` via httpx
- **Output**: List of job objects with skills, company, and location data
- **Error handling**: Service-unavailable, timeout with readable messages

### Step 4 — Match and Rank Jobs
- **Service**: `matching_service.py`
- **Input**: `extractedSkills`, job list, optional `(lat, lng)`
- **Action**: Deterministic weighted scoring (60% required skills, 15% preferred, 15% distance, 10% preferences)
- **Output**: Ranked list with `overallScore`, `matchedSkills`, `missingRequiredSkills`, `scoreBreakdown`
- **Design**: Same input always produces same output — no LLM randomness

### Step 5 — Explain Top Recommendations
- **Endpoint**: `POST /api/recommendations/jobs`
- **Input**: extractedSkills + location
- **Output**: Top N ranked jobs with full score breakdown and explanation text
- **Frontend**: RecommendationsPage.jsx displays ranked cards with score bars

### Step 6 — User Selects a Job
- **Frontend**: User clicks "View Job" or "Save Job" on a recommendation card
- **Context carried forward**: `jobId`, `jobTitle`, `matchScore` (missingRequiredSkills, matchedSkills)

### Step 7 — Generate Missing-Skill Roadmap
- **Service**: `gemini_service.generate_learning_roadmap()`
- **Input**: `missingRequiredSkills`, `currentSkills`, `jobTitle`
- **Output**: Prioritized learning roadmap with resources and timelines
- **Fallback**: Returns `{ available: false, message: "..." }` when Gemini key is absent

### Step 8 — Generate Interview Questions
- **Service**: `gemini_service.generate_interview_questions()`
- **Input**: `jobTitle`, `requiredSkills`, `matchedSkills`, `missingSkills`
- **Output**: `{ technical, projectBased, behavioural }` question sets

### Step 9 — Generate Cover Letter
- **Service**: `gemini_service.generate_cover_letter()`
- **Input**: `jobTitle`, `companyName`, `extractedSkills`
- **Output**: Concise professional cover letter (no invented experience)

### Step 10 — Save Job and Track Application
- **Endpoints**: `POST /api/saved-jobs/:jobId`, `POST /api/applications`
- **Frontend**: JobDetailsPage and RecommendationsPage both support save + track
- **Database**: `saved_jobs` and `applications` tables with unique constraints

---

## Architecture Diagram

```
User → ResumePage.jsx
         ↓ POST /api/resume/analyze
         Python: resume_parser + skill_extractor
         ↓ extractedSkills
         POST /api/recommendations/jobs
         Python: node_client.fetch_jobs → matching_service.rank_jobs
         ↓ rankedJobs
         RecommendationsPage.jsx
         ↓ user selects job
         POST /api/agent/interview-questions
         POST /api/agent/learning-roadmap
         POST /api/agent/cover-letter
         (all → gemini_service → Gemini API | fallback message)
         ↓ 
         POST /api/saved-jobs/:jobId (Node)
         POST /api/applications (Node)
         GET /api/dashboard (Node) → aggregated view
```

---

## Tool Inventory

| Tool | Implementation | Purpose |
|------|---------------|---------|
| PDF Parser | PyMuPDF | Extract resume text |
| Skill Extractor | Deterministic regex | Extract canonical skills |
| Job Fetcher | httpx → Node API | Retrieve job listings |
| Matching Engine | Weighted scoring | Rank jobs deterministically |
| Interview Questions | Gemini API | Prepare for interviews |
| Learning Roadmap | Gemini API | Skill gap plan |
| Cover Letter | Gemini API | Job-specific writing |
| Resume Feedback | Gemini API | Improve resume quality |
| Job Saver | PostgreSQL | Bookmark jobs |
| Application Tracker | PostgreSQL | Track applications |
