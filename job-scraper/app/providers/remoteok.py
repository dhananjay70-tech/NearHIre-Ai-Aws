"""
remoteok.py — RemoteOK public API (no key required).
https://remoteok.com/api
"""

from typing import Any, Dict, List

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import http_get


class RemoteOKProvider(BaseSource):
    name = "remoteok"
    kind = "api"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        resp = await http_get(
            "https://remoteok.com/api",
            headers={"User-Agent": settings.NOMINATIM_USER_AGENT, "Accept": "application/json"},
        )
        if resp is None or resp.status_code != 200:
            return []

        try:
            data = resp.json()
        except Exception:
            return []

        q = (query or "").lower()
        out: List[Dict[str, Any]] = []
        for item in data:
            if not isinstance(item, dict) or not item.get("id") or not item.get("position"):
                continue  # first element is a legal notice
            title = item.get("position", "")
            if q and q not in title.lower() and q not in " ".join(item.get("tags", [])).lower():
                continue
            out.append(
                {
                    "title": title,
                    "company": item.get("company") or "Unknown",
                    "location": item.get("location") or "Remote",
                    "city": "Remote",
                    "country": "Worldwide",
                    "remote": True,
                    "salary": (
                        f"${item.get('salary_min')} - ${item.get('salary_max')}"
                        if item.get("salary_min")
                        else None
                    ),
                    "currency": "USD" if item.get("salary_min") else None,
                    "description": item.get("description") or "",
                    "skills": item.get("tags") or [],
                    "tags": item.get("tags") or [],
                    "companyLogo": item.get("company_logo") or item.get("logo"),
                    "companyWebsite": item.get("url"),
                    "applyUrl": item.get("apply_url") or item.get("url"),
                    "postedDate": item.get("date"),
                    "source": self.name,
                }
            )
            if len(out) >= settings.MAX_JOBS_PER_PROVIDER:
                break
        return out
