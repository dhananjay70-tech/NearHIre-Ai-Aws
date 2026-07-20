"""
rapidapi.py — Generic, configurable RapidAPI jobs provider.

Many job APIs are published on RapidAPI with slightly different shapes. Rather
than hard-code one, this provider is driven by env vars:

    RAPIDAPI_KEY          required
    RAPIDAPI_JOBS_HOST    e.g. active-jobs-db.p.rapidapi.com
    RAPIDAPI_JOBS_PATH    e.g. /active-ats-7d
    RAPIDAPI_RESULTS_KEY  JSON key holding the job list ("" = response is a list)

It maps results with a flexible field resolver, so pointing it at a different
RapidAPI job API is a config change, not a code change. Skips when no key.
"""

from typing import Any, Dict, List, Optional

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import http_get


def _first(d: Dict[str, Any], *keys: str) -> Optional[Any]:
    for k in keys:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return None


class RapidAPIProvider(BaseSource):
    name = "rapidapi"
    kind = "api"

    @property
    def enabled(self) -> bool:
        return bool(settings.RAPIDAPI_KEY and settings.RAPIDAPI_JOBS_HOST)

    @property
    def disabled_reason(self) -> str:
        return "RAPIDAPI_KEY not set"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        url = f"https://{settings.RAPIDAPI_JOBS_HOST}{settings.RAPIDAPI_JOBS_PATH}"
        resp = await http_get(
            url,
            params={"title_filter": query, "location_filter": location, "limit": settings.MAX_JOBS_PER_PROVIDER},
            headers={
                "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
                "X-RapidAPI-Host": settings.RAPIDAPI_JOBS_HOST,
            },
        )
        if resp is None or resp.status_code != 200:
            return []

        try:
            payload = resp.json()
        except Exception:
            return []

        if settings.RAPIDAPI_RESULTS_KEY:
            items = payload.get(settings.RAPIDAPI_RESULTS_KEY, [])
        else:
            items = payload if isinstance(payload, list) else payload.get("data", payload.get("jobs", []))

        out: List[Dict[str, Any]] = []
        for item in items or []:
            if not isinstance(item, dict):
                continue
            title = _first(item, "title", "job_title", "name", "position")
            company = _first(item, "organization", "company", "employer_name", "company_name")
            if not title or not company:
                continue
            out.append(
                {
                    "title": title,
                    "company": company,
                    "location": _first(item, "locations_derived", "location", "job_location", "city"),
                    "city": _first(item, "city", "job_city"),
                    "country": _first(item, "countries_derived", "country", "job_country"),
                    "remote": bool(_first(item, "remote_derived", "is_remote", "job_is_remote")),
                    "salary": _first(item, "salary", "salary_raw", "job_salary"),
                    "description": _first(item, "description", "description_text", "job_description") or "",
                    "employmentType": _first(item, "employment_type", "job_employment_type", "type"),
                    "companyLogo": _first(item, "organization_logo", "employer_logo", "logo"),
                    "companyWebsite": _first(item, "organization_url", "employer_website", "company_url"),
                    "applyUrl": _first(item, "url", "apply_url", "job_apply_link", "link"),
                    "postedDate": _first(item, "date_posted", "posted_date", "job_posted_at_datetime_utc"),
                    "source": self.name,
                }
            )
        return out
