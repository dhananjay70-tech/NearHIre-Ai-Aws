"""
adzuna.py — Adzuna official Jobs API. Free tier.
Requires ADZUNA_APP_ID + ADZUNA_APP_KEY. Skips cleanly when unset.
https://developer.adzuna.com/
"""

from typing import Any, Dict, List

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import http_get


class AdzunaProvider(BaseSource):
    name = "adzuna"
    kind = "api"

    @property
    def enabled(self) -> bool:
        return bool(settings.ADZUNA_APP_ID and settings.ADZUNA_APP_KEY)

    @property
    def disabled_reason(self) -> str:
        return "ADZUNA_APP_ID / ADZUNA_APP_KEY not set"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        # Force the India endpoint in India-only mode.
        country = "in" if settings.INDIA_ONLY else (settings.ADZUNA_COUNTRY or "in")
        resp = await http_get(
            f"https://api.adzuna.com/v1/api/jobs/{country}/search/1",
            params={
                "app_id": settings.ADZUNA_APP_ID,
                "app_key": settings.ADZUNA_APP_KEY,
                "what": query,
                "where": location,
                "results_per_page": settings.MAX_JOBS_PER_PROVIDER,
                "content-type": "application/json",
            },
        )
        if resp is None or resp.status_code != 200:
            return []

        try:
            results = resp.json().get("results", [])
        except Exception:
            return []

        out: List[Dict[str, Any]] = []
        for item in results:
            loc = item.get("location", {}) or {}
            areas = loc.get("area", []) or []
            out.append(
                {
                    "title": item.get("title", ""),
                    "company": (item.get("company", {}) or {}).get("display_name") or "Unknown",
                    "location": loc.get("display_name"),
                    "city": areas[-1] if areas else None,
                    "state": areas[1] if len(areas) > 1 else None,
                    "country": areas[0] if areas else country.upper(),
                    "latitude": item.get("latitude"),
                    "longitude": item.get("longitude"),
                    "salary": (
                        f"{int(item['salary_min'])} - {int(item['salary_max'])}"
                        if item.get("salary_min") and item.get("salary_max")
                        else None
                    ),
                    "currency": "INR" if country == "in" else None,
                    "description": item.get("description") or "",
                    "employmentType": item.get("contract_time"),
                    "category": (item.get("category", {}) or {}).get("label"),
                    "applyUrl": item.get("redirect_url"),
                    "postedDate": item.get("created"),
                    "source": self.name,
                }
            )
        return out
