"""
jooble.py — Jooble official Jobs API. Free.
Requires JOOBLE_API_KEY. Skips cleanly when unset.
https://jooble.org/api/about
"""

from typing import Any, Dict, List

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import http_post


class JoobleProvider(BaseSource):
    name = "jooble"
    kind = "api"

    @property
    def enabled(self) -> bool:
        return bool(settings.JOOBLE_API_KEY)

    @property
    def disabled_reason(self) -> str:
        return "JOOBLE_API_KEY not set"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        resp = await http_post(
            f"https://jooble.org/api/{settings.JOOBLE_API_KEY}",
            json={"keywords": query, "location": location, "page": "1"},
            headers={"Content-Type": "application/json"},
        )
        if resp is None or resp.status_code != 200:
            return []

        try:
            jobs = resp.json().get("jobs", [])
        except Exception:
            return []

        out: List[Dict[str, Any]] = []
        for item in jobs:
            loc = item.get("location") or location
            city = str(loc).split(",")[0].strip() if loc else None
            out.append(
                {
                    "title": item.get("title", ""),
                    "company": item.get("company") or "Unknown",
                    "location": loc,
                    "city": city,
                    "country": settings.DEFAULT_COUNTRY,
                    "salary": item.get("salary") or None,
                    "description": item.get("snippet") or "",
                    "employmentType": item.get("type"),
                    "applyUrl": item.get("link"),
                    "postedDate": item.get("updated"),
                    "source": self.name,
                }
            )
            if len(out) >= settings.MAX_JOBS_PER_PROVIDER:
                break
        return out
