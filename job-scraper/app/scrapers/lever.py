"""
lever.py — Lever public postings API (no key).
Placed under scrapers/ per the required layout, but uses the official JSON API.
https://api.lever.co/v0/postings/{company}?mode=json
"""

from typing import Any, Dict, List

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import http_get


class LeverScraper(BaseSource):
    name = "lever"
    kind = "scraper"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for company in settings.LEVER_BOARDS:
            resp = await http_get(
                f"https://api.lever.co/v0/postings/{company}",
                params={"mode": "json"},
            )
            if resp is None or resp.status_code != 200:
                continue
            try:
                postings = resp.json()
            except Exception:
                continue

            for post in postings:
                categories = post.get("categories", {}) or {}
                loc = categories.get("location") or ""
                out.append(
                    {
                        "title": post.get("text", ""),
                        "company": company.capitalize(),
                        "location": loc,
                        "city": loc.split(",")[0].strip() if loc else None,
                        "description": (post.get("descriptionPlain") or post.get("description") or ""),
                        "employmentType": categories.get("commitment"),
                        "category": categories.get("team"),
                        "companyWebsite": f"https://{company}.com",
                        "applyUrl": post.get("hostedUrl") or post.get("applyUrl"),
                        "postedDate": post.get("createdAt"),
                        "source": self.name,
                    }
                )
                if len(out) >= settings.MAX_JOBS_PER_PROVIDER * len(settings.LEVER_BOARDS):
                    break
        return out
