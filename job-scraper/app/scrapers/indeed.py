"""
indeed.py — Indeed HTML scraper (Priority 2).
Indeed aggressively blocks bots and often requires JS; this is a best-effort
scraper that returns [] gracefully when blocked. For reliable Indeed data,
prefer the JSearch provider (which aggregates Indeed) or Indeed's Publisher API.
"""

from typing import Any, Dict, List
from urllib.parse import quote_plus

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import fetch_html, make_soup, strip_html


class IndeedScraper(BaseSource):
    name = "indeed"
    kind = "scraper"

    @property
    def enabled(self) -> bool:
        return settings.ENABLE_SCRAPERS

    @property
    def disabled_reason(self) -> str:
        return "ENABLE_SCRAPERS=false"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        url = f"https://in.indeed.com/jobs?q={quote_plus(query)}&l={quote_plus(location)}"
        html = await fetch_html(url)
        soup = make_soup(html)
        if soup is None:
            self.log.info("No parseable HTML (Indeed likely blocked the request).")
            return []

        out: List[Dict[str, Any]] = []
        for card in soup.select("div.job_seen_beacon, td.resultContent")[
            : settings.MAX_JOBS_PER_PROVIDER
        ]:
            title_el = card.select_one("h2.jobTitle span, a.jcs-JobTitle span")
            company_el = card.select_one('[data-testid="company-name"], span.companyName')
            loc_el = card.select_one('[data-testid="text-location"], div.companyLocation')
            link_el = card.select_one("a.jcs-JobTitle, h2.jobTitle a")
            snippet_el = card.select_one("div.job-snippet, [data-testid='jobsnippet_footer']")
            if not title_el or not company_el:
                continue
            href = link_el.get("href") if link_el else None
            apply_url = (
                f"https://in.indeed.com{href}" if href and href.startswith("/") else href
            )
            loc = loc_el.get_text(strip=True) if loc_el else location
            out.append(
                {
                    "title": title_el.get_text(strip=True),
                    "company": company_el.get_text(strip=True),
                    "location": loc,
                    "city": loc.split(",")[0].strip() if loc else None,
                    "country": "India",
                    "description": strip_html(snippet_el.get_text(" ", strip=True)) if snippet_el else "",
                    "applyUrl": apply_url,
                    "source": self.name,
                }
            )
        return out
