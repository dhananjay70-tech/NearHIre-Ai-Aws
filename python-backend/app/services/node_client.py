"""
node_client.py — HTTP client to communicate with the Node backend.
Uses httpx with configurable timeout and readable error messages.
"""

import httpx
from typing import Optional, Dict, Any, List
from fastapi import HTTPException

from app.config import settings

TIMEOUT = httpx.Timeout(15.0)


async def fetch_jobs(
    params: Optional[Dict[str, Any]] = None,
) -> List[Dict]:
    """
    Fetch jobs from Node backend GET /api/jobs.
    Returns the jobs array.
    """
    url = f"{settings.CORE_API_URL}/jobs"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("data", {}).get("jobs", [])
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Job service is unavailable. Please ensure the Node backend is running on "
                   f"{settings.CORE_API_URL}."
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Job service timed out. Please try again."
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Job service returned an error: {exc.response.status_code}."
        )


async def fetch_job_by_id(job_id: str) -> Optional[Dict]:
    """
    Fetch a single job from Node backend GET /api/jobs/:id.
    Returns the job object or None.
    """
    url = f"{settings.CORE_API_URL}/jobs/{job_id}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            data = response.json()
            return data.get("data", {}).get("job")
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Job service is unavailable."
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Job service timed out."
        )


async def fetch_nearby_jobs(
    lat: float,
    lng: float,
    radius_km: float = 25,
    params: Optional[Dict[str, Any]] = None,
) -> List[Dict]:
    """
    Fetch nearby jobs from Node backend GET /api/jobs/nearby.
    """
    url = f"{settings.CORE_API_URL}/jobs/nearby"
    query = {"lat": lat, "lng": lng, "radiusKm": radius_km, **(params or {})}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url, params=query)
            response.raise_for_status()
            data = response.json()
            return data.get("data", {}).get("jobs", [])
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Job service is unavailable.")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Job service timed out.")
