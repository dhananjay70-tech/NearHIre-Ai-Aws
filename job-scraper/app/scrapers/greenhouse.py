"""
greenhouse.py — Greenhouse public Job Board API (no key).
Placed under scrapers/ per the required layout, but uses the official JSON API
(Priority 1) rather than HTML scraping.
https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
"""

from typing import Any, Dict, List

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import http_get


class GreenhouseScraper(BaseSource):
    name = "greenhouse"
    kind = "scraper"  # categorised with company boards, though API-backed

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for token in settings.GREENHOUSE_BOARDS:
            resp = await http_get(
                f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs",
                params={"content": "true"},
            )
            if resp is None or resp.status_code != 200:
                continue
            try:
                jobs = resp.json().get("jobs", [])
            except Exception:
                continue

            for job in jobs:
                loc = (job.get("location") or {}).get("name") or ""
                parts = [p.strip() for p in loc.split(",")]
                out.append(
                    {
                        "title": job.get("title", ""),
                        "company": token.capitalize(),
                        "location": loc,
                        "city": parts[0] if parts else None,
                        "state": parts[1] if len(parts) > 1 else None,
                        "country": parts[-1] if len(parts) > 2 else None,
                        "description": job.get("content") or "",
                        "companyWebsite": f"https://{token}.com",
                        "applyUrl": job.get("absolute_url"),
                        "postedDate": job.get("updated_at"),
                        "source": self.name,
                    }
                )
                if len(out) >= settings.MAX_JOBS_PER_PROVIDER * len(settings.GREENHOUSE_BOARDS):
                    break
        return out
