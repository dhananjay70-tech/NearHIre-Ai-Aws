# NearHire Job Scraper

An **independent** microservice that aggregates **real** jobs from free/freemium
job APIs and public sources, normalizes them into one schema, de-duplicates, and
serves them over a REST API.

> This service is self-contained. It does **not** touch or depend on the
> NearHire `backend/`, `frontend/`, or `python-backend/`. Backend integration is
> intentionally left for later — for now the APIs return live data directly from
> providers.
>
> **It never returns dummy, mock, or placeholder jobs.** A source with no API key
> (or one that is blocked) simply contributes nothing.
>
> **India-only:** by default (`INDIA_ONLY=true`) the service returns **only jobs
> located in India**. Every job is checked after normalization and anything not
> in India is dropped, no matter which source produced it. Set `INDIA_ONLY=false`
> to allow all countries, or `INCLUDE_WORLDWIDE_REMOTE=true` to also keep
> worldwide/remote roles.

---

## Architecture

```
                     ┌──────────────────────────────────────────┐
   HTTP client  ───► │  FastAPI (app/main.py, app/api/routes.py) │
                     └───────────────┬──────────────────────────┘
                                     │
                         ┌───────────▼────────────┐
                         │  Aggregator service     │  concurrent fan-out
                         │  (services/aggregator)  │
                         └───────────┬────────────┘
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                        ▼
   Providers (APIs, P1)     Scrapers (HTML, P2)     ATS boards (API-backed)
   remoteok  arbeitnow      internshala  indeed     greenhouse  lever
   jsearch   adzuna         linkedin     naukri
   jooble    rapidapi       wellfound    company_pages
             │                       │                        │
             └───────────┬───────────┴────────────┬───────────┘
                         ▼                         ▼
              normalizer → deduplicator → (cache) → Job[]
                         │
                 scheduler/cron.py  (every 30 min: refresh, new/expired diff,
                                     optional Postgres persistence)
```

Layers:

- **providers/** — Priority 1. Official / free / freemium **APIs**.
- **scrapers/** — Priority 2. **HTML scraping** for sites without an API
  (plus API-backed ATS boards greenhouse/lever, kept here per the layout).
- **services/** — aggregator, normalizer, deduplicator, geocoder, cache.
- **scheduler/** — APScheduler (or asyncio fallback) 30-minute refresh.
- **database/** — optional, independent Postgres persistence (off by default).
- **models/job.py** — the one common `Job` schema every source maps into.

---

## Folder structure

```
job-scraper/
├── app/
│   ├── api/routes.py            # REST endpoints
│   ├── providers/               # API sources (P1)
│   │   ├── base.py  remoteok.py  arbeitnow.py
│   │   ├── jsearch.py  adzuna.py  jooble.py  rapidapi.py
│   ├── scrapers/                # HTML sources (P2) + ATS boards
│   │   ├── greenhouse.py  lever.py  internshala.py  indeed.py
│   │   ├── linkedin.py  naukri.py  wellfound.py  company_pages.py
│   ├── services/
│   │   ├── aggregator.py  normalizer.py  deduplicator.py
│   │   ├── geocoder.py  cache.py
│   ├── scheduler/cron.py
│   ├── database/postgres.py
│   ├── models/job.py
│   ├── utils/logger.py  helpers.py
│   ├── config.py
│   └── main.py
├── tests/test_pipeline.py
├── logs/
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Provider flow

Every source (provider or scraper) implements the same contract in
`providers/base.py`:

```python
name      # unique id, also the job's `source`
kind      # "api" | "scraper"
enabled   # False when a required key is missing
fetch()   # returns RAW dicts
safe_fetch()  # wraps fetch() so a failure yields [] (never breaks a run)
```

Providers use `utils.helpers.http_request`, which adds **User-Agent rotation,
per-host rate limiting, timeouts, and exponential-backoff retries**.

## Aggregator flow

`services/aggregator.py::collect()`:

1. **Fetch** every enabled source **concurrently** (`asyncio.gather`).
2. **Collect** all raw dicts.
3. **Normalize** into `Job` (`normalizer.py`): infer work mode, employment type,
   skills; geocode city→lat/lon.
4. **Validate**: rows missing title/company are dropped (never faked).
5. **India filter** (`location_filter.py`): when `INDIA_ONLY=true`, drop every
   job not located in India (checked via country code / India keyword / Indian
   city or state / PIN code).
6. **Deduplicate** (`deduplicator.py`): apply-URL → company+title+city →
   fuzzy description similarity.
7. **Cache** (Redis or in-memory) for `CACHE_TTL_SECONDS` and **return** one clean list.

## Scheduler flow

`scheduler/cron.py::start_scheduler()` runs an immediate refresh on boot, then
every `SCHEDULER_INTERVAL_MINUTES` (default **30**):

- re-aggregate real jobs,
- **diff** against the in-memory store → count **new** jobs,
- mark jobs no longer seen as **expired**,
- optionally **persist** to Postgres (only if `DATABASE_URL` is set).

Uses APScheduler if installed, else a built-in asyncio loop.

---

## Job schema

Every job is returned with these fields (see `models/job.py`):

`title, company, location, latitude, longitude, salary, currency, experience,
skills[], description, employmentType, remote, hybrid, onsite, companyLogo,
companyWebsite, applyUrl, source, postedDate, industry, category, education,
city, state, country, pincode`

---

## API documentation

Base URL: `http://localhost:8100`  ·  Interactive docs: `/docs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service + store + scheduler status |
| GET | `/sources` | Which sources are enabled/disabled and why |
| GET | `/jobs` | All jobs (`?query=&location=&remote=&limit=&offset=`) |
| GET | `/jobs/search?q=` | Keyword search over title/company/skills/description |
| GET | `/jobs/latest` | Newest by posted date |
| GET | `/jobs/source/{provider}` | **Live** pull from one provider (e.g. `remoteok`) |
| GET | `/jobs/company/{company}` | Filter by company |
| GET | `/jobs/location/{city}` | Filter by city/location |
| GET | `/jobs/skills/{skill}` | Filter by skill |
| POST | `/refresh` | Trigger an immediate refresh |

---

## Setup

```bash
cd job-scraper
python -m venv venv
venv\Scripts\activate          # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
copy .env.example .env          # then add any API keys you have (all optional)

uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload
# open http://localhost:8100/docs
```

No keys? It still works: **RemoteOK, Arbeitnow, Greenhouse, Lever** need none.
Add `JSEARCH_API_KEY`, `ADZUNA_APP_ID/KEY`, `JOOBLE_API_KEY`, `RAPIDAPI_KEY` to
unlock more sources.

### Docker

```bash
docker compose up --build      # starts the service + Redis on :8100
```

---

## How to add a new provider

1. Create `app/providers/<name>.py` with a class extending `BaseSource`:

   ```python
   from app.providers.base import BaseSource
   from app.utils.helpers import http_get

   class MyProvider(BaseSource):
       name = "myprovider"
       kind = "api"

       @property
       def enabled(self) -> bool:
           return bool(settings.MY_API_KEY)   # skip cleanly if no key

       async def fetch(self, query, location):
           resp = await http_get("https://api.example.com/jobs", params={...})
           if resp is None or resp.status_code != 200:
               return []
           return [
               {"title": ..., "company": ..., "applyUrl": ..., "source": self.name}
               for item in resp.json()
           ]
   ```

2. Register it in `services/aggregator.py::build_sources()`.
3. Add any new keys to `config.py` + `.env.example`.

That's it — normalization, dedup, caching, scheduling, and all API endpoints
pick it up automatically. Return **only real data**; never fabricate jobs.

---

## Tests

```bash
pytest -q          # pipeline: normalization, validation, de-duplication
```
