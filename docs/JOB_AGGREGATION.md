# NearHire.AI — Job Aggregation

How real jobs get collected, normalized, de-duplicated, stored, and served.

> **Design note.** NearHire already follows the microservice architecture from
> `prompts/prompt_18.txt`: **Frontend → Node (MS1) → PostgreSQL + Python AI (MS2)**.
> Job aggregation lives **inside MS1** (`backend/src/scrapers/`) rather than a
> separate 4th service, because MS1 already owns the jobs database and the
> `/api/jobs*` contract every other service reads from. This keeps a single
> source of truth, avoids double-writes, and (per the prompt's #1 rule) does
> **not break the existing backend**. There are **no dummy jobs** — every job
> comes from a real source below. (The old `seed.sql` demo dataset has been
> removed.)

---

## Architecture

```
Frontend (React, :5173)
      │  GET /api/jobs, /api/jobs/nearby, /api/jobs/:id
      ▼
Node Backend — MS1 (Express, :5001)
      ├──────────────► PostgreSQL  (jobs, companies, skills, job_skills, scrape_logs, job_sources)
      │
      ├──────────────► Python AI — MS2 (FastAPI, :8000)   [MS2 pulls jobs from MS1]
      │
      └──────────────► Job Aggregation pipeline (in-process, cron every 30 min)
                             ├── API sources (preferred, Step 4)
                             │     Greenhouse · Lever · Arbeitnow · Remotive
                             │     RemoteOK · Adzuna · JSearch · Jooble
                             └── RSS: WeWorkRemotely
```

---

## Folder structure (`backend/src/`)

```
scrapers/
  index.js        # runScrapers(): fetch → dedupe → normalize → validate → save → log
  scheduler.js    # startScheduler(): initial run + cron */30, exposes schedulerState
  cli.js          # `npm run scrape` — manual one-off run
  parser.js       # geocode(), normalizeWorkMode(), normalizeJobType(), parseSalary()
  greenhouse.js lever.js arbeitnow.js remotive.js careers.js   # existing sources
  remoteok.js  adzuna.js  jsearch.js  jooble.js                # NEW sources
services/jobService.js        # business logic + 30-min TTL cache
repositories/jobRepository.js # SQL: findJobs, findNearbyJobs (Haversine), createJob, dedupe, expiry
controllers/adminController.js# admin dashboard stats + manual trigger
routes/adminRoutes.js         # /api/admin/* (ADMIN only)
utils/cache.js                # Redis-if-available, in-memory TTL fallback
```

---

## Sources

| Source        | Kind | Key required | Env vars |
|---------------|------|--------------|----------|
| Greenhouse    | API  | No  | — |
| Lever         | API  | No  | — |
| Arbeitnow     | API  | No  | — |
| Remotive      | API  | No  | — |
| WeWorkRemotely| RSS  | No  | — |
| **RemoteOK**  | API  | No  | — |
| **Adzuna**    | API  | Yes | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` |
| **JSearch**   | API  | Yes | `RAPIDAPI_KEY` |
| **Jooble**    | API  | Yes | `JOOBLE_API_KEY`, `JOOBLE_LOCATION` |

Key-gated sources **skip cleanly** when their keys are missing — the pipeline
never fails because a key isn't set. Per Step 4, official APIs are always
preferred over HTML scraping.

---

## Data flow (per run)

`runScrapers()` in `scrapers/index.js`:

1. **Fetch** — every source runs, each wrapped in `.catch(() => [])` so one bad
   source can't sink the run. Each emits the shared job object shape.
2. **De-duplicate** (Step 14) — `dedupeRawFeed()` drops cross-source duplicates
   by normalized apply-URL and by `title|company`.
3. **Normalize** — `parser.js` maps work mode (`REMOTE/HYBRID/ONSITE`), job type
   (`FULL_TIME/PART_TIME/INTERNSHIP/CONTRACT`), salary, and geocodes city/state
   to latitude/longitude (Nominatim + city fallback table).
4. **Validate & save** — get-or-create the company (with logo), skip if the job
   already exists (`findJobBySource`), else `createJob()` inserts job + skills in
   a transaction. Numeric salary is persisted when the source provides it.
5. **Expire** — jobs no longer present at a source are set `is_active = FALSE`
   (`deleteExpiredJobs`), tracked dynamically per source.
6. **Log** — a row in `scrape_logs` records found/inserted/skipped/failed/status.

## Scheduler flow

`scheduler.js` → `startScheduler()` runs once on boot, then on cron
`SCRAPER_CRON` (default `*/30 * * * *`, **every 30 minutes**, Step 5).
Overlapping runs are prevented via `schedulerState.running`. `schedulerState`
also feeds the admin dashboard (last run, last result, interval).

## API flow (Step 18 — all serve REAL jobs)

| Endpoint | Notes |
|----------|-------|
| `GET /api/jobs` | Filters: search, city, state, jobType, workMode, minSalary, maxExperience, skill, sortBy, page, limit. **Cached 30 min.** |
| `GET /api/jobs/nearby` | Radius search via Haversine in SQL (`lat`, `lng`, `radiusKm` 5/10/20/50/100). **Cached 30 min.** |
| `GET /api/jobs/:id` | Single job with company + skills. |
| `POST /api/jobs` | Recruiter/Admin manual posting (unchanged). |
| `GET /api/admin/scraper-stats` | **Admin dashboard (Step 17):** total/active/expired jobs, jobs today/week, per-source breakdown, registered sources, recent runs, scheduler status. |
| `POST /api/admin/scrape` | **Admin:** trigger a scrape on demand. |

## MS2 (Python AI) flow

MS2 never stores jobs of its own. `python-backend/app/services/node_client.py`
calls MS1's `/api/jobs`, `/api/jobs/:id`, `/api/jobs/nearby`. Resume match, ATS
score, skill-gap, recommendations, interview questions, and roadmap therefore
all run against the **same real jobs** MS1 aggregates. No change was needed here.

## Frontend flow

`frontend/src/services/jobService.js` (→ `coreApi`) reads the endpoints above;
`recommendation`/`resume`/`chat` services (→ `aiApi`) hit MS2. Job cards render
company logo, salary, experience, skills, work-mode badge, distance, source, and
posted time from the real API payload — no hardcoded jobs.

---

## Caching (Step 13)

`utils/cache.js` caches `/api/jobs` and `/api/jobs/nearby` responses for 30
minutes (`CACHE_TTL_SECONDS`). It uses **Redis when `REDIS_URL` is set and
`ioredis` is installed**, otherwise an in-process TTL map — so it works with zero
extra infrastructure and upgrades to Redis without code changes.

## Setup for the new sources

1. Copy the new keys from `backend/.env.example` into `backend/.env` (optional —
   RemoteOK and the existing sources need none).
2. Apply the migration to register new sources + indexes:
   `psql "$DATABASE_URL" -f src/database/migration_002_new_job_sources.sql`
   (a fresh `npm run db:init` already includes them).
3. Start normally — `npm run dev`. The scheduler populates jobs on boot and
   every 30 minutes. Force a run any time with `npm run scrape`.
```
