# NearHire.AI — API Overview

## Node Backend (Port 5001)

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login, sets nearhire_token cookie |
| POST | /api/auth/logout | Yes | Clear cookie |
| GET | /api/auth/me | Yes | Current user profile |

### Jobs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/jobs | No | List/search jobs (paginated) |
| GET | /api/jobs/nearby | No | Nearby jobs by lat/lng/radius |
| GET | /api/jobs/:id | No | Single job with skills |

**Query params for /api/jobs:** `search`, `city`, `jobType`, `workMode`, `minSalary`, `maxExperience`, `skill`, `sortBy`, `page`, `limit`

### Companies & Skills
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/companies | No | List companies |
| GET | /api/skills | No | List skills |

### Saved Jobs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/saved-jobs/:jobId | Yes | Save a job |
| GET | /api/saved-jobs | Yes | List saved jobs (with job card data) |
| DELETE | /api/saved-jobs/:jobId | Yes | Remove saved job |

### Applications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/applications | Yes | Record application (body: jobId, status, notes) |
| GET | /api/applications | Yes | List user's applications |
| PATCH | /api/applications/:id | Yes | Update status/notes |
| DELETE | /api/applications/:id | Yes | Delete tracker record |

**Allowed statuses:** `APPLIED`, `INTERVIEW`, `REJECTED`, `OFFER`, `WITHDRAWN`

### Dashboard
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/dashboard | Yes | Aggregated counts + recent activity |

---

## Python Backend (Port 8000)

Authentication: same JWT cookie (`nearhire_token`) or `Authorization: Bearer <token>`

### Resume
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/resume/analyze | Yes | Upload PDF, extract skills, optional job match |

**Request:** `multipart/form-data` — `file` (PDF), `jobId` (optional string)

**Response:**
```json
{
  "success": true,
  "data": {
    "fileName": "...",
    "summary": "...",
    "extractedSkills": [],
    "education": [],
    "experienceHints": [],
    "projects": [],
    "selectedJobMatch": null
  }
}
```

### Recommendations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/recommendations/jobs | Yes | Get ranked job recommendations |

**Request body:**
```json
{
  "extractedSkills": ["React", "Node.js"],
  "latitude": 28.6,
  "longitude": 77.2,
  "radiusKm": 25,
  "limit": 10
}
```

### AI Agent
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/agent/interview-questions | Yes | Generate interview questions |
| POST | /api/agent/learning-roadmap | Yes | Generate skill learning roadmap |
| POST | /api/agent/cover-letter | Yes | Generate cover letter |
| POST | /api/agent/resume-feedback | Yes | Get resume feedback |

All AI endpoints return `{ "success": true, "data": { "available": true|false, ... } }`.
When `GEMINI_API_KEY` is absent, `available: false` with a clear message is returned.

---

## Scoring Formula

```
overallScore = 
  0.60 × requiredSkillScore +
  0.15 × preferredSkillScore +
  0.15 × distanceScore (if coords available) +
  0.10 × preferenceScore (if preferences set)

Weights redistribute proportionally when distance/preferences are unavailable.
distanceScore = max(0, 100 - (distanceKm / 50) × 100)
```
