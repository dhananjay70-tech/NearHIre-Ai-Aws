"""
routes.py — REST API for the job-scraper service.

All endpoints return REAL, live jobs (served from the scheduler's in-memory
store when populated, otherwise fetched live from the providers on demand and
cached). No dummy/mock/placeholder data is ever returned.

Endpoints:
  GET /health
  GET /jobs
  GET /jobs/search
  GET /jobs/latest
  GET /jobs/source/{provider}
  GET /jobs/company/{company}
  GET /jobs/location/{city}
  GET /jobs/skills/{skill}
  GET /sources        (bonus: source enable/disable status)
  POST /refresh       (bonus: trigger a refresh now)
"""

from typing import List, Optional

from fastapi import APIRouter, Query

from app.config import settings
from app.models.job import Job
from app.services.aggregator import aggregator
from app.scheduler.cron import store, refresh_once
from app.services.cache import cache
from app.services.location_filter import filter_by_location

router = APIRouter()


def _public(jobs: List[Job]) -> List[dict]:
    return [j.to_public_dict() for j in jobs]


async def _base_jobs(query: Optional[str], location: Optional[str]) -> List[Job]:
    """
    Prefer the scheduler's already-collected store; if empty (e.g. right at
    startup) fall back to a live aggregation so the API is never empty by design.
    """
    if store.active():
        return store.active()
    return await aggregator.collect(query=query, location=location)


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "env": settings.ENV,
        "cacheBackend": cache.backend,
        "activeJobs": len(store.jobs),
        "expiredJobs": len(store.expired),
        "lastRun": store.last_run,
        "totalRuns": store.total_runs,
        "scheduler": {
            "enabled": settings.ENABLE_SCHEDULER,
            "intervalMinutes": settings.SCHEDULER_INTERVAL_MINUTES,
        },
    }


@router.get("/sources")
async def sources() -> dict:
    status = aggregator.source_status()
    return {
        "count": len(status),
        "enabled": [s["name"] for s in status if s["enabled"]],
        "disabled": [
            {"name": s["name"], "reason": s["reason"]} for s in status if not s["enabled"]
        ],
        "sources": status,
    }


@router.get("/jobs")
async def get_jobs(
    query: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    remote: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    jobs = await _base_jobs(query, location)
    if location:
        jobs = filter_by_location(jobs, location)
    if remote is not None:
        jobs = [j for j in jobs if j.remote == remote]
    total = len(jobs)
    page = jobs[offset : offset + limit]
    return {"success": True, "count": len(page), "total": total, "jobs": _public(page)}


@router.get("/jobs/search")
async def search_jobs(
    q: str = Query(..., description="Keyword: title, company, skill, or description"),
    location: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
) -> dict:
    jobs = await _base_jobs(q, location)
    # Location filtering first — the returned array must contain ONLY jobs in the
    # requested location (metro-cluster aware, case-insensitive, fuzzy).
    if location:
        jobs = filter_by_location(jobs, location)
    ql = q.lower()
    matched = [
        j
        for j in jobs
        if ql in j.title.lower()
        or ql in j.company.lower()
        or ql in (j.description or "").lower()
        or any(ql in s.lower() for s in j.skills)
    ]
    return {
        "success": True,
        "query": q,
        "location": location,
        "count": len(matched[:limit]),
        "jobs": _public(matched[:limit]),
    }


@router.get("/jobs/latest")
async def latest_jobs(limit: int = Query(30, ge=1, le=200)) -> dict:
    jobs = await _base_jobs(None, None)
    # Sort by postedDate desc when available (string ISO dates sort correctly).
    ordered = sorted(jobs, key=lambda j: (j.posted_date or ""), reverse=True)
    return {"success": True, "count": len(ordered[:limit]), "jobs": _public(ordered[:limit])}


@router.get("/jobs/source/{provider}")
async def jobs_by_source(
    provider: str,
    query: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
) -> dict:
    # Live pull directly from one provider (also proves "live data from providers").
    jobs = await aggregator.collect_from_source(provider.lower(), query, location)
    if not jobs and store.active():
        jobs = [j for j in store.active() if j.source == provider.lower()]
    if location:
        jobs = filter_by_location(jobs, location)
    return {"success": True, "source": provider.lower(), "count": len(jobs), "jobs": _public(jobs)}


@router.get("/jobs/company/{company}")
async def jobs_by_company(company: str) -> dict:
    jobs = await _base_jobs(None, None)
    cl = company.lower()
    matched = [j for j in jobs if cl in j.company.lower()]
    return {"success": True, "company": company, "count": len(matched), "jobs": _public(matched)}


@router.get("/jobs/location/{city}")
async def jobs_by_location(city: str) -> dict:
    jobs = await _base_jobs(None, city)
    matched = filter_by_location(jobs, city)
    return {"success": True, "location": city, "count": len(matched), "jobs": _public(matched)}


@router.get("/jobs/skills/{skill}")
async def jobs_by_skill(skill: str) -> dict:
    jobs = await _base_jobs(skill, None)
    sl = skill.lower()
    matched = [
        j
        for j in jobs
        if any(sl in s.lower() for s in j.skills) or sl in j.title.lower()
    ]
    return {"success": True, "skill": skill, "count": len(matched), "jobs": _public(matched)}


@router.post("/refresh")
async def refresh() -> dict:
    summary = await refresh_once()
    return {"success": True, "refreshed": summary}
