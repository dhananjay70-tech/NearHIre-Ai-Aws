"""
jsearch.py — JSearch via RapidAPI (aggregates LinkedIn, Indeed, Glassdoor…).
Requires JSEARCH_API_KEY (or RAPIDAPI_KEY). Skips cleanly when unset.
https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
"""

from typing import Any, Dict, List

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import http_get


class JSearchProvider(BaseSource):
    name = "jsearch"
    kind = "api"

    @property
    def _key(self) -> str:
        return settings.JSEARCH_API_KEY or settings.RAPIDAPI_KEY

    @property
    def enabled(self) -> bool:
        return bool(self._key)

    @property
    def disabled_reason(self) -> str:
        return "JSEARCH_API_KEY / RAPIDAPI_KEY not set"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        resp = await http_get(
            "https://jsearch.p.rapidapi.com/search",
            params={
                "query": f"{query} in {location}",
                "page": "1",
                "num_pages": "1",
                "date_posted": "week",
            },
            headers={
                "X-RapidAPI-Key": self._key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            },
        )
        if resp is None or resp.status_code != 200:
            return []

        try:
            data = resp.json().get("data", [])
        except Exception:
            return []

        out: List[Dict[str, Any]] = []
        for item in data:
            out.append(
                {
                    "title": item.get("job_title", ""),
                    "company": item.get("employer_name") or "Unknown",
                    "location": ", ".join(
                        filter(
                            None,
                            [item.get("job_city"), item.get("job_state"), item.get("job_country")],
                        )
                    ),
                    "city": item.get("job_city"),
                    "state": item.get("job_state"),
                    "country": item.get("job_country"),
                    "latitude": item.get("job_latitude"),
                    "longitude": item.get("job_longitude"),
                    "remote": bool(item.get("job_is_remote")),
                    "salary": (
                        f"{item.get('job_min_salary')} - {item.get('job_max_salary')}"
                        if item.get("job_min_salary")
                        else None
                    ),
                    "currency": item.get("job_salary_currency"),
                    "description": item.get("job_description") or "",
                    "employmentType": item.get("job_employment_type"),
                    "companyLogo": item.get("employer_logo"),
                    "companyWebsite": item.get("employer_website"),
                    "applyUrl": item.get("job_apply_link"),
                    "postedDate": item.get("job_posted_at_datetime_utc"),
                    "category": item.get("job_category"),
                    "source": self.name,
                }
            )
            if len(out) >= settings.MAX_JOBS_PER_PROVIDER:
                break
        return out
