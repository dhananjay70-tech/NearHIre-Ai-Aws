"""
linkedin.py — LinkedIn Jobs scraper via the public guest endpoint.
No official free API; we use the unauthenticated guest jobs listing that
returns HTML job cards (Priority 2). Heavily rate-limited by LinkedIn, so this
returns [] gracefully whenever it is blocked — it never fabricates jobs.
"""

from typing import Any, Dict, List
from urllib.parse import quote_plus

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import fetch_html, make_soup


class LinkedInScraper(BaseSource):
    name = "linkedin"
    kind = "scraper"

    @property
    def enabled(self) -> bool:
        return settings.ENABLE_SCRAPERS

    @property
    def disabled_reason(self) -> str:
        return "ENABLE_SCRAPERS=false"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        url = (
            "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
            f"?keywords={quote_plus(query)}&location={quote_plus(location)}&start=0"
        )
        html = await fetch_html(url)
        soup = make_soup(html)
        if soup is None:
            self.log.info("No parseable HTML (blocked or bs4 missing).")
            return []

        out: List[Dict[str, Any]] = []
        for card in soup.select("li")[: settings.MAX_JOBS_PER_PROVIDER]:
            title_el = card.select_one(".base-search-card__title")
            company_el = card.select_one(".base-search-card__subtitle")
            loc_el = card.select_one(".job-search-card__location")
            link_el = card.select_one("a.base-card__full-link")
            time_el = card.select_one("time")
            if not title_el or not company_el:
                continue
            loc = loc_el.get_text(strip=True) if loc_el else location
            out.append(
                {
                    "title": title_el.get_text(strip=True),
                    "company": company_el.get_text(strip=True),
                    "location": loc,
                    "city": loc.split(",")[0].strip() if loc else None,
                    "country": loc.split(",")[-1].strip() if loc and "," in loc else settings.DEFAULT_COUNTRY,
                    "applyUrl": link_el.get("href").split("?")[0] if link_el and link_el.get("href") else None,
                    "postedDate": time_el.get("datetime") if time_el else None,
                    "source": self.name,
                }
            )
        return out
