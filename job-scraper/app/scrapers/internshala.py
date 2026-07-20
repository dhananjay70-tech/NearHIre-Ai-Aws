"""
internshala.py — Internshala internships/jobs HTML scraper.
No public API, so we scrape the public listing pages (Priority 2).
Returns [] gracefully if the layout changes or the site blocks us.
"""

from typing import Any, Dict, List

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import fetch_html, make_soup


class InternshalaScraper(BaseSource):
    name = "internshala"
    kind = "scraper"

    @property
    def enabled(self) -> bool:
        return settings.ENABLE_SCRAPERS

    @property
    def disabled_reason(self) -> str:
        return "ENABLE_SCRAPERS=false"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        slug = (query or "software-development").strip().lower().replace(" ", "-")
        url = f"https://internshala.com/internships/keywords-{slug}/"
        html = await fetch_html(url)
        soup = make_soup(html)
        if soup is None:
            self.log.info("No parseable HTML (blocked or bs4 missing).")
            return []

        out: List[Dict[str, Any]] = []
        cards = soup.select(".individual_internship")
        for card in cards[: settings.MAX_JOBS_PER_PROVIDER]:
            title_el = card.select_one(".job-internship-name, .profile")
            company_el = card.select_one(".company-name, .company_name")
            loc_el = card.select_one(".locations, .location_link")
            stipend_el = card.select_one(".stipend")
            link_el = card.select_one("a.job-title-href, a")

            if not title_el or not company_el:
                continue
            href = link_el.get("href") if link_el else None
            apply_url = (
                f"https://internshala.com{href}" if href and href.startswith("/") else href
            )
            out.append(
                {
                    "title": title_el.get_text(strip=True),
                    "company": company_el.get_text(strip=True),
                    "location": loc_el.get_text(strip=True) if loc_el else "India",
                    "city": loc_el.get_text(strip=True).split(",")[0] if loc_el else None,
                    "country": "India",
                    "salary": stipend_el.get_text(strip=True) if stipend_el else None,
                    "currency": "INR",
                    "employmentType": "INTERNSHIP",
                    "applyUrl": apply_url,
                    "source": self.name,
                }
            )
        return out
