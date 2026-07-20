"""
wellfound.py — Wellfound (formerly AngelList Talent) scraper (Priority 2).
Wellfound is a JavaScript-heavy SPA behind bot protection. A plain HTTP fetch
usually cannot see the jobs, so this scraper attempts the public role listing
and, if JS rendering is required, returns [] gracefully. When Playwright is
installed and PLAYWRIGHT enabled, it renders the page first.

It never fabricates jobs.
"""

import os
from typing import Any, Dict, List

from app.config import settings
from app.providers.base import BaseSource
from app.utils.helpers import fetch_html, make_soup


class WellfoundScraper(BaseSource):
    name = "wellfound"
    kind = "scraper"

    @property
    def enabled(self) -> bool:
        return settings.ENABLE_SCRAPERS

    @property
    def disabled_reason(self) -> str:
        return "ENABLE_SCRAPERS=false"

    async def _render_with_playwright(self, url: str) -> str | None:
        if os.environ.get("ENABLE_PLAYWRIGHT", "false").lower() != "true":
            return None
        try:
            from playwright.async_api import async_playwright  # optional
        except ImportError:
            self.log.info("Playwright not installed — skipping JS render.")
            return None
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(user_agent="Mozilla/5.0")
                await page.goto(url, timeout=20000, wait_until="networkidle")
                content = await page.content()
                await browser.close()
                return content
        except Exception as exc:
            self.log.warning("Playwright render failed: %s", exc)
            return None

    async def fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        role = (query or "software-engineer").strip().lower().replace(" ", "-")
        url = f"https://wellfound.com/role/{role}"

        html = await self._render_with_playwright(url) or await fetch_html(url)
        soup = make_soup(html)
        if soup is None:
            self.log.info("No parseable HTML (JS-rendered/blocked). Returning none.")
            return []

        out: List[Dict[str, Any]] = []
        for card in soup.select('[data-test="JobSearchCard"], .styles_component__Ei8x5')[
            : settings.MAX_JOBS_PER_PROVIDER
        ]:
            title_el = card.select_one('[data-test="job-title"], a')
            company_el = card.select_one('[data-test="startup-link"], h2')
            if not title_el or not company_el:
                continue
            href = title_el.get("href") if title_el.has_attr("href") else None
            out.append(
                {
                    "title": title_el.get_text(strip=True),
                    "company": company_el.get_text(strip=True),
                    "location": location,
                    "applyUrl": f"https://wellfound.com{href}" if href and href.startswith("/") else href,
                    "source": self.name,
                }
            )
        return out
