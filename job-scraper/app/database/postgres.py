"""
postgres.py — OPTIONAL, independent PostgreSQL persistence layer.

This service returns live provider data directly (per the prompt), so
persistence is OFF by default and only activates when DATABASE_URL is set.
It uses its OWN table (`scraped_jobs`) in whatever database DATABASE_URL points
to — it does NOT touch the main NearHire backend schema.

Uses SQLAlchemy async (asyncpg) when installed; if SQLAlchemy is missing, the
functions log and no-op so the rest of the service keeps working.
"""

from typing import List

from app.config import settings
from app.models.job import Job
from app.utils.logger import get_logger

logger = get_logger("postgres")

_engine = None
_ready = False

_DDL = """
CREATE TABLE IF NOT EXISTS scraped_jobs (
    fingerprint   TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    company       TEXT NOT NULL,
    location      TEXT,
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,
    city          TEXT,
    state         TEXT,
    country       TEXT,
    salary        TEXT,
    currency      TEXT,
    experience    TEXT,
    skills        JSONB,
    description   TEXT,
    employment_type TEXT,
    remote        BOOLEAN,
    hybrid        BOOLEAN,
    onsite        BOOLEAN,
    company_logo  TEXT,
    company_website TEXT,
    apply_url     TEXT,
    source        TEXT,
    posted_date   TEXT,
    industry      TEXT,
    category      TEXT,
    education     TEXT,
    pincode       TEXT,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_source   ON scraped_jobs(source);
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_city     ON scraped_jobs(city);
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_active   ON scraped_jobs(is_active);
"""


async def init_db() -> bool:
    """Create the engine + table. Returns True if persistence is available."""
    global _engine, _ready
    if not settings.DATABASE_URL:
        return False
    if _ready:
        return True
    try:
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import create_async_engine

        url = settings.DATABASE_URL
        if url.startswith("postg://") or url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://").replace(
                "postg://", "postgresql+asyncpg://"
            )
        _engine = create_async_engine(url, pool_pre_ping=True)
        async with _engine.begin() as conn:
            for stmt in _DDL.strip().split(";"):
                if stmt.strip():
                    await conn.execute(text(stmt))
        _ready = True
        logger.info("Postgres persistence ready (scraped_jobs).")
        return True
    except ImportError:
        logger.info("SQLAlchemy/asyncpg not installed — persistence disabled.")
        return False
    except Exception as exc:
        logger.warning("Postgres init failed: %s", exc)
        return False


async def save_jobs(jobs: List[Job]) -> int:
    """Upsert scraped jobs. Marks all not-in-batch as inactive (expired)."""
    if not await init_db() or _engine is None:
        return 0
    from sqlalchemy import text

    upsert = text(
        """
        INSERT INTO scraped_jobs (
            fingerprint, title, company, location, latitude, longitude,
            city, state, country, salary, currency, experience, skills,
            description, employment_type, remote, hybrid, onsite,
            company_logo, company_website, apply_url, source, posted_date,
            industry, category, education, pincode, is_active, updated_at
        ) VALUES (
            :fingerprint, :title, :company, :location, :latitude, :longitude,
            :city, :state, :country, :salary, :currency, :experience, :skills,
            :description, :employment_type, :remote, :hybrid, :onsite,
            :company_logo, :company_website, :apply_url, :source, :posted_date,
            :industry, :category, :education, :pincode, TRUE, now()
        )
        ON CONFLICT (fingerprint) DO UPDATE SET
            title = EXCLUDED.title,
            salary = EXCLUDED.salary,
            description = EXCLUDED.description,
            is_active = TRUE,
            updated_at = now()
        """
    )
    import json as _json

    saved = 0
    async with _engine.begin() as conn:
        for job in jobs:
            d = job.model_dump()
            d["skills"] = _json.dumps(d.get("skills") or [])
            await conn.execute(upsert, d)
            saved += 1
        # Expire everything not in this batch.
        fps = [j.fingerprint for j in jobs if j.fingerprint]
        if fps:
            await conn.execute(
                text("UPDATE scraped_jobs SET is_active = FALSE WHERE fingerprint <> ALL(:fps)"),
                {"fps": fps},
            )
    logger.info("Persisted %d jobs to Postgres.", saved)
    return saved
