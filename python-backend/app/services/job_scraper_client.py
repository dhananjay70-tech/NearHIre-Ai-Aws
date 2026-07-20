"""
job_scraper_client.py — HTTP client to the Job Scraper microservice (MS3).

MS2 (the AI backend) NEVER scrapes and NEVER uses dummy jobs. When it needs real
jobs for resume matching / ATS / recommendations / interview prep, it calls the
independent Job Scraper over REST:

    GET {JOB_SCRAPER_URL}/jobs
    GET {JOB_SCRAPER_URL}/jobs/search
    GET {JOB_SCRAPER_URL}/jobs/latest
    GET {JOB_SCRAPER_URL}/health

If the scraper is unreachable, we raise HTTPException(503) — never fabricate jobs.
`to_node_shape()` maps a scraper job to the field names the matching service
expects, so real scraper jobs flow straight into rank_jobs / score_job.
"""

import logging
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = settings.JOB_SCRAPER_URL.rstrip("/")
TIMEOUT = httpx.Timeout(15.0)


async def _get(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{BASE_URL}{path}"
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        ms = (time.perf_counter() - start) * 1000
        count = data.get("count") if isinstance(data, dict) else None
        logger.info("[JobScraper] GET %s ok | %.0fms | jobs=%s", path, ms, count)
        return data
    except httpx.ConnectError:
        logger.warning("[JobScraper] GET %s — connection refused", path)
        raise HTTPException(
            status_code=503,
            detail=f"Job Scraper service is unavailable at {BASE_URL}.",
        )
    except httpx.TimeoutException:
        logger.warning("[JobScraper] GET %s — timed out", path)
        raise HTTPException(status_code=504, detail="Job Scraper timed out.")
    except httpx.HTTPStatusError as exc:
        logger.warning("[JobScraper] GET %s — %s", path, exc.response.status_code)
        raise HTTPException(
            status_code=502,
            detail=f"Job Scraper returned {exc.response.status_code}.",
        )


async def search_jobs(
    query: str,
    location: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """GET /jobs/search — keyword (+ optional location) search."""
    params: Dict[str, Any] = {"q": query, "limit": limit}
    if location:
        params["location"] = location
    data = await _get("/jobs/search", params)
    return data.get("jobs", [])


async def latest_jobs(limit: int = 30) -> List[Dict[str, Any]]:
    """GET /jobs/latest — newest jobs."""
    data = await _get("/jobs/latest", {"limit": limit})
    return data.get("jobs", [])


async def get_jobs(
    query: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """GET /jobs — full list with optional filters."""
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if query:
        params["query"] = query
    if location:
        params["location"] = location
    data = await _get("/jobs", params)
    return data.get("jobs", [])


async def get_job(fingerprint: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a single job by its fingerprint id. MS3 has no /jobs/{id} endpoint,
    so we pull the current list and match by fingerprint (best-effort).
    """
    jobs = await get_jobs(limit=500)
    for job in jobs:
        if job.get("fingerprint") == fingerprint:
            return job
    return None


async def health() -> Dict[str, Any]:
    """GET /health — never raises; returns {'ok': bool, ...}."""
    try:
        data = await _get("/health")
        return {"ok": True, "url": BASE_URL, **data}
    except HTTPException as exc:
        return {"ok": False, "url": BASE_URL, "error": exc.detail}


def to_node_shape(job: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map a Job Scraper job (camelCase public schema) to the shape the matching
    service (score_job / rank_jobs) expects, so real scraper jobs can be scored
    exactly like DB jobs.
    """
    remote = bool(job.get("remote"))
    hybrid = bool(job.get("hybrid"))
    work_mode = "REMOTE" if remote else ("HYBRID" if hybrid else "ONSITE")
    skills = job.get("skills") or []

    return {
        "id": job.get("fingerprint"),
        "title": job.get("title"),
        "company": job.get("company"),
        "company_name": job.get("company"),
        "companyLogo": job.get("companyLogo"),
        "companyWebsite": job.get("companyWebsite"),
        # matching_service reads requiredSkills/preferredSkills as string lists
        "requiredSkills": skills,
        "preferredSkills": [],
        "skills": skills,
        "latitude": job.get("latitude"),
        "longitude": job.get("longitude"),
        "city": job.get("city"),
        "state": job.get("state"),
        "country": job.get("country"),
        "workMode": work_mode,
        "jobType": job.get("employmentType"),
        "experience": job.get("experience"),
        "salary": job.get("salary"),
        "applicationUrl": job.get("applyUrl"),
        "source": job.get("source"),
        "sourceLabel": job.get("source"),
        "postedAt": job.get("postedDate"),
        "description": job.get("description"),
    }
