"""
normalizer.py — Turn a provider's raw dict into a validated `Job`.

Every provider/scraper emits a loosely-shaped dict; the normalizer is the single
place that enforces the common schema, infers work mode / employment type /
skills, and (optionally) fills coordinates via the geocoder. Invalid records
(missing title or company) are dropped, never faked.
"""

from typing import Any, Dict, List, Optional

from app.models.job import Job
from app.services.geocoder import geocode
from app.utils.helpers import (
    extract_skills,
    infer_work_mode,
    normalize_employment_type,
    strip_html,
)
from app.utils.logger import get_logger

logger = get_logger("normalizer")


def _as_str(value: Any) -> Optional[str]:
    """Coerce scalars (ints/floats/etc.) to str; keep None as None."""
    if value is None:
        return None
    if isinstance(value, str):
        return value.strip() or None
    return str(value)


async def normalize_one(raw: Dict[str, Any], *, do_geocode: bool = True) -> Optional[Job]:
    title = (raw.get("title") or "").strip()
    company = (raw.get("company") or raw.get("companyName") or "").strip()
    if not title or not company:
        return None  # Required-field validation — drop, don't fabricate.

    def _loc(value: Any) -> Optional[str]:
        # Some APIs return location as a list; take the first meaningful entry.
        if isinstance(value, (list, tuple)):
            value = next((v for v in value if v), None)
        return _as_str(value)

    description = strip_html(raw.get("description"))
    location = _loc(raw.get("location"))
    city = _loc(raw.get("city"))
    state = _loc(raw.get("state"))
    country = _loc(raw.get("country"))

    work_mode_text = " ".join(
        filter(None, [location, city, raw.get("employmentType"), description[:400]])
    )
    modes = infer_work_mode(work_mode_text)
    # Explicit remote flag from source wins.
    if raw.get("remote") is True:
        modes = {"remote": True, "hybrid": False, "onsite": False}

    skills = raw.get("skills")
    if not isinstance(skills, list) or not skills:
        skills = extract_skills(f"{title} {description}", extra=raw.get("tags"))

    latitude = raw.get("latitude")
    longitude = raw.get("longitude")
    if do_geocode and (latitude is None or longitude is None) and not modes["remote"]:
        if city or location:
            latitude, longitude = await geocode(city or location, state, country or "India")

    job = Job(
        title=title,
        company=company,
        location=location,
        latitude=latitude,
        longitude=longitude,
        city=city,
        state=state,
        country=country,
        pincode=_as_str(raw.get("pincode")),
        salary=_as_str(raw.get("salary")),
        currency=_as_str(raw.get("currency")),
        experience=_as_str(raw.get("experience")),
        skills=[str(s) for s in skills if s],
        description=description or None,
        employmentType=_as_str(raw.get("employmentType"))
        or normalize_employment_type(title, description[:400]),
        education=_as_str(raw.get("education")),
        industry=_as_str(raw.get("industry")),
        category=_as_str(raw.get("category")),
        remote=modes["remote"],
        hybrid=modes["hybrid"],
        onsite=modes["onsite"],
        companyLogo=(raw.get("companyLogo") or None),
        companyWebsite=(raw.get("companyWebsite") or None),
        applyUrl=(raw.get("applyUrl") or raw.get("url") or None),
        source=raw.get("source") or "unknown",
        postedDate=_as_str(raw.get("postedDate")),
    )
    job.fingerprint = job.compute_fingerprint()
    return job


async def normalize_many(
    raws: List[Dict[str, Any]], *, do_geocode: bool = True
) -> List[Job]:
    jobs: List[Job] = []
    for raw in raws:
        try:
            job = await normalize_one(raw, do_geocode=do_geocode)
            if job:
                jobs.append(job)
        except Exception as exc:
            logger.debug("normalize failed (%s): %s", raw.get("source"), exc)
    return jobs
