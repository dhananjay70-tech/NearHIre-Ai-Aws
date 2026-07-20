"""
naukri.py — Naukri.com scraper (Priority 2).
Naukri renders results client-side from an internal JSON API and blocks
non-browser clients. We attempt its public search API endpoint with a
browser-like header set and return [] gracefully when blocked. Never fakes data.
"""

from typing import Any, Dict, List

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import http_get, strip_html


class NaukriScraper(BaseSource):
    name = "naukri"
    kind = "scraper"

    @property
    def enabled(self) -> bool:
        return settings.ENABLE_SCRAPERS

    @property
    def disabled_reason(self) -> str:
        return "ENABLE_SCRAPERS=false"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        # Naukri's frontend calls this JSON endpoint; it requires specific headers.
        resp = await http_get(
            "https://www.naukri.com/jobapi/v3/search",
            params={
                "noOfResults": settings.MAX_JOBS_PER_PROVIDER,
                "urlType": "search_by_keyword",
                "searchType": "adv",
                "keyword": query,
                "location": location,
            },
            headers={
                "Accept": "application/json",
                "appid": "109",
                "systemid": "Naukri",
                "Referer": "https://www.naukri.com/",
            },
        )
        if resp is None or resp.status_code != 200:
            self.log.info("Naukri blocked or unavailable (status handled).")
            return []

        try:
            details = resp.json().get("jobDetails", [])
        except Exception:
            return []

        out: List[Dict[str, Any]] = []
        for job in details:
            placeholders = {p.get("type"): p.get("label") for p in job.get("placeholders", [])}
            out.append(
                {
                    "title": job.get("title", ""),
                    "company": job.get("companyName") or "Unknown",
                    "location": placeholders.get("location"),
                    "city": (placeholders.get("location") or "").split(",")[0] or None,
                    "country": "India",
                    "experience": placeholders.get("experience"),
                    "salary": placeholders.get("salary"),
                    "currency": "INR",
                    "description": strip_html(job.get("jobDescription") or ""),
                    "skills": [t.get("title") for t in job.get("tagsAndSkills", "").split(",") if t] if isinstance(job.get("tagsAndSkills"), str) else [],
                    "companyLogo": job.get("logoPath"),
                    "applyUrl": f"https://www.naukri.com{job.get('jdURL')}" if job.get("jdURL") else None,
                    "postedDate": job.get("footerPlaceholderLabel"),
                    "source": self.name,
                }
            )
        return out
