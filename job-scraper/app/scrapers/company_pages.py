"""
company_pages.py — Generic company career-page scraper (Priority 2).

Driven by the COMPANY_CAREER_URLS env var (comma-separated URLs). For each page
it extracts anchor links that look like job postings (href contains /job, /career,
/opening, etc.) and emits them as jobs. This is intentionally generic — a
config change adds a new company, no code change. Returns [] gracefully.

Never fabricates jobs: if a page yields no job-like links, it contributes none.
"""

import os
import re
from typing import Any, Dict, List
from urllib.parse import urljoin, urlparse

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import fetch_html, make_soup

_JOB_HREF_RE = re.compile(r"(/jobs?/|/careers?/|/opening|/position|/vacan|greenhouse|lever\.co)", re.I)


class CompanyPagesScraper(BaseSource):
    name = "company_pages"
    kind = "scraper"

    @property
    def _urls(self) -> List[str]:
        raw = os.environ.get("COMPANY_CAREER_URLS", "")
        return [u.strip() for u in raw.split(",") if u.strip()]

    @property
    def enabled(self) -> bool:
        return settings.ENABLE_SCRAPERS and bool(self._urls)

    @property
    def disabled_reason(self) -> str:
        if not settings.ENABLE_SCRAPERS:
            return "ENABLE_SCRAPERS=false"
        return "COMPANY_CAREER_URLS not set"

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for url in self._urls:
            html = await fetch_html(url)
            soup = make_soup(html)
            if soup is None:
                continue
            company = urlparse(url).netloc.replace("www.", "").split(".")[0].capitalize()
            seen: set = set()
            for a in soup.find_all("a", href=True):
                href = a["href"]
                text = a.get_text(strip=True)
                if not text or len(text) < 4:
                    continue
                if not _JOB_HREF_RE.search(href):
                    continue
                full = urljoin(url, href)
                if full in seen:
                    continue
                seen.add(full)
                out.append(
                    {
                        "title": text[:180],
                        "company": company,
                        "location": location,
                        "companyWebsite": url,
                        "applyUrl": full,
                        "source": self.name,
                    }
                )
                if len(out) >= settings.MAX_JOBS_PER_PROVIDER:
                    break
        return out
