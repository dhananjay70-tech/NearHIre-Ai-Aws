"""
config.py — Central configuration loaded from environment / .env.

Deliberately dependency-light (os + python-dotenv) so the service boots with a
minimal install. Every API key is optional: a provider with no key simply
skips itself, so the service is always runnable and never fabricates jobs.
"""

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover - dotenv is optional
    pass


def _get(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


def _get_int(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, default))
    except (TypeError, ValueError):
        return default


class Settings:
    # ── Service ─────────────────────────────────────────────────────────
    SERVICE_NAME = "nearhire-job-scraper"
    HOST = _get("HOST", "0.0.0.0")
    PORT = _get_int("PORT", 8100)
    ENV = _get("ENV", "development")
    LOG_LEVEL = _get("LOG_LEVEL", "INFO")

    # ── Provider API keys (all optional) ────────────────────────────────
    JSEARCH_API_KEY = _get("JSEARCH_API_KEY")            # RapidAPI JSearch
    RAPIDAPI_KEY = _get("RAPIDAPI_KEY")                  # generic RapidAPI key
    # Generic RapidAPI jobs endpoint (works with many RapidAPI job APIs).
    RAPIDAPI_JOBS_HOST = _get("RAPIDAPI_JOBS_HOST", "active-jobs-db.p.rapidapi.com")
    RAPIDAPI_JOBS_PATH = _get("RAPIDAPI_JOBS_PATH", "/active-ats-7d")
    RAPIDAPI_RESULTS_KEY = _get("RAPIDAPI_RESULTS_KEY", "")  # JSON key holding the list ("" = root list)
    ADZUNA_APP_ID = _get("ADZUNA_APP_ID")
    ADZUNA_APP_KEY = _get("ADZUNA_APP_KEY")
    ADZUNA_COUNTRY = _get("ADZUNA_COUNTRY", "in")
    JOOBLE_API_KEY = _get("JOOBLE_API_KEY")
    USAJOBS_API_KEY = _get("USAJOBS_API_KEY")
    USAJOBS_EMAIL = _get("USAJOBS_EMAIL")

    # ── Additional RapidAPI job source hosts (all use RAPIDAPI_KEY) ─────
    LINKEDIN_RAPIDAPI_HOST = _get("LINKEDIN_RAPIDAPI_HOST", "linkedin-data-api.p.rapidapi.com")
    INDEED_RAPIDAPI_HOST = _get("INDEED_RAPIDAPI_HOST", "indeed12.p.rapidapi.com")
    GLASSDOOR_RAPIDAPI_HOST = _get("GLASSDOOR_RAPIDAPI_HOST", "real-time-glassdoor-data.p.rapidapi.com")
    INDIAN_JOBS_RAPIDAPI_HOST = _get("INDIAN_JOBS_RAPIDAPI_HOST", "indian-jobs-api.p.rapidapi.com")

    # ── Search defaults ─────────────────────────────────────────────────
    DEFAULT_QUERY = _get("DEFAULT_QUERY", "software developer")
    DEFAULT_LOCATION = _get("DEFAULT_LOCATION", "India")
    DEFAULT_COUNTRY = _get("DEFAULT_COUNTRY", "India")
    MAX_JOBS_PER_PROVIDER = _get_int("MAX_JOBS_PER_PROVIDER", 30)

    # ── India-only mode ─────────────────────────────────────────────────
    # When true, every job that is not located in India is dropped, no matter
    # which source produced it. This is the hard guarantee the service makes.
    INDIA_ONLY = _get("INDIA_ONLY", "true").lower() == "true"
    # Whether to keep worldwide/remote jobs that don't explicitly mention India.
    # Default false: "located in India" means India, not "remote anywhere".
    INCLUDE_WORLDWIDE_REMOTE = _get("INCLUDE_WORLDWIDE_REMOTE", "false").lower() == "true"

    # ── Boards to pull from the no-key ATS providers ────────────────────
    GREENHOUSE_BOARDS = [
        b.strip()
        for b in _get(
            "GREENHOUSE_BOARDS", "vercel,figma,stripe,airtable,dropbox"
        ).split(",")
        if b.strip()
    ]
    LEVER_BOARDS = [
        b.strip()
        for b in _get("LEVER_BOARDS", "netflix,spotify,plaid,ramp").split(",")
        if b.strip()
    ]

    # ── HTTP behaviour ──────────────────────────────────────────────────
    HTTP_TIMEOUT = _get_int("HTTP_TIMEOUT", 15)
    HTTP_MAX_RETRIES = _get_int("HTTP_MAX_RETRIES", 3)
    HTTP_RETRY_BACKOFF = float(_get("HTTP_RETRY_BACKOFF", "0.75"))
    RATE_LIMIT_DELAY = float(_get("RATE_LIMIT_DELAY", "0.4"))  # seconds between calls

    # ── Feature toggles ─────────────────────────────────────────────────
    ENABLE_SCRAPERS = _get("ENABLE_SCRAPERS", "true").lower() == "true"
    ENABLE_SCHEDULER = _get("ENABLE_SCHEDULER", "true").lower() == "true"
    SCHEDULER_INTERVAL_MINUTES = _get_int("SCHEDULER_INTERVAL_MINUTES", 30)
    # Playwright is needed for dynamic-JS sites (e.g., Naukri). Off by default.
    ENABLE_PLAYWRIGHT = _get("ENABLE_PLAYWRIGHT", "false").lower() == "true"

    # ── Cache ───────────────────────────────────────────────────────────
    REDIS_URL = _get("REDIS_URL")               # empty -> in-memory fallback
    CACHE_TTL_SECONDS = _get_int("CACHE_TTL_SECONDS", 1800)  # 30 minutes

    # ── Optional Postgres persistence (independent DB, off by default) ──
    DATABASE_URL = _get("DATABASE_URL")         # empty -> persistence disabled

    # ── Geocoding ───────────────────────────────────────────────────────
    ENABLE_NOMINATIM = _get("ENABLE_NOMINATIM", "true").lower() == "true"
    NOMINATIM_USER_AGENT = _get(
        "NOMINATIM_USER_AGENT", "NearHireJobScraper/1.0 (+https://nearhire.ai)"
    )


settings = Settings()
