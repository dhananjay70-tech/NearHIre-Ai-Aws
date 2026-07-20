import os
import hashlib
import json
import logging
from typing import Any, Dict, Optional

import asyncpg

logger = logging.getLogger(__name__)

# Build asyncpg-compatible DSN from environment
def _get_dsn() -> str:
    db_url = os.getenv("DATABASE_URL") or ""
    return db_url.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql+psycopg://", "postgresql://"
    )

# ── Hash ────────────────────────────────────────────────────────────────────

def compute_hash(file_bytes: bytes) -> str:
    """Return SHA-256 hex digest of file content."""
    return hashlib.sha256(file_bytes).hexdigest()


# ── DB helpers (asyncpg, connection-per-call) ────────────────────────────────

async def _connect() -> asyncpg.Connection:
    dsn = _get_dsn()
    return await asyncpg.connect(dsn, statement_cache_size=0)


async def get_cached_resume(user_id: str, content_hash: str) -> Optional[Dict[str, Any]]:
    """
    Return cached resume record if it exists for this user + hash, else None.
    """
    try:
        conn = await _connect()
        try:
            row = await conn.fetchrow(
                """
                SELECT id, resume_text, extracted_skills, education,
                       experience_hints, ats_score, ai_cache, analyzed_at
                FROM resumes
                WHERE user_id = $1 AND content_hash = $2
                """,
                user_id,
                content_hash,
            )
            if row:
                return dict(row)
            return None
        finally:
            await conn.close()
    except Exception as exc:
        logger.warning("resume_cache.get_cached_resume failed: %s", exc)
        return None


async def save_resume(
    user_id: str,
    filename: str,
    content_hash: str,
    resume_text: str,
    extracted_skills: list,
    education: list,
    experience_hints: list,
    ats_score: Optional[int] = None,
    ai_cache: Optional[Dict] = None,
) -> Optional[str]:
    """
    Upsert a resume record. Returns the resume UUID.
    """
    try:
        conn = await _connect()
        try:
            row = await conn.fetchrow(
                """
                INSERT INTO resumes
                  (user_id, filename, content_hash, resume_text,
                   extracted_skills, education, experience_hints,
                   ats_score, ai_cache, analyzed_at)
                VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9::jsonb, NOW())
                ON CONFLICT (user_id, content_hash)
                DO UPDATE SET
                  filename         = EXCLUDED.filename,
                  resume_text      = EXCLUDED.resume_text,
                  extracted_skills = EXCLUDED.extracted_skills,
                  education        = EXCLUDED.education,
                  experience_hints = EXCLUDED.experience_hints,
                  ats_score        = EXCLUDED.ats_score,
                  ai_cache         = EXCLUDED.ai_cache,
                  analyzed_at      = NOW()
                RETURNING id
                """,
                user_id,
                filename,
                content_hash,
                resume_text,
                json.dumps(extracted_skills),
                json.dumps(education),
                json.dumps(experience_hints),
                ats_score,
                json.dumps(ai_cache) if ai_cache else None,
            )
            return str(row["id"]) if row else None
        finally:
            await conn.close()
    except Exception as exc:
        logger.warning("resume_cache.save_resume failed: %s", exc)
        return None


async def update_ai_cache(user_id: str, content_hash: str, ai_cache: Dict) -> None:
    """
    Patch only the ai_cache + ats_score fields for an existing resume row.
    """
    ats_score = ai_cache.get("atsScore") or ai_cache.get("ats_score")
    try:
        conn = await _connect()
        try:
            await conn.execute(
                """
                UPDATE resumes
                SET ai_cache    = $1::jsonb,
                    ats_score   = $2,
                    analyzed_at = NOW()
                WHERE user_id = $3 AND content_hash = $4
                """,
                json.dumps(ai_cache),
                int(ats_score) if ats_score else None,
                user_id,
                content_hash,
            )
        finally:
            await conn.close()
    except Exception as exc:
        logger.warning("resume_cache.update_ai_cache failed: %s", exc)


async def get_latest_resume_for_user(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch the most recently analyzed resume for this user.
    Used by the Dashboard to show resume score.
    """
    try:
        conn = await _connect()
        try:
            row = await conn.fetchrow(
                """
                SELECT id, filename, ats_score, extracted_skills, analyzed_at
                FROM resumes
                WHERE user_id = $1
                ORDER BY analyzed_at DESC
                LIMIT 1
                """,
                user_id,
            )
            return dict(row) if row else None
        finally:
            await conn.close()
    except Exception as exc:
        logger.warning("resume_cache.get_latest_resume_for_user failed: %s", exc)
        return None
