"""
base.py — Common interface for all API providers and scrapers.

A source is either an API *provider* (Priority 1) or an HTML *scraper*
(Priority 2). Both implement the same tiny contract so the aggregator can treat
them uniformly:

    name      -> unique source id (also the `source` field on jobs)
    kind      -> "api" | "scraper"
    enabled   -> bool (e.g. false when a required API key is missing)
    fetch()   -> list of RAW dicts (normalization happens later)

`safe_fetch()` wraps fetch() so one failing source never breaks a run.
"""

from typing import Any, Dict, List

from app.config import settings
from app.utils.logger import get_logger


class BaseSource:
    name: str = "base"
    kind: str = "api"

    def __init__(self) -> None:
        self.log = get_logger(self.name)

    @property
    def enabled(self) -> bool:
        return True

    @property
    def disabled_reason(self) -> str:
        return ""

    async def fetch(
        self, query: str, location: str
    ) -> List[Dict[str, Any]]:  # pragma: no cover - abstract
        raise NotImplementedError

    async def safe_fetch(self, query: str, location: str) -> List[Dict[str, Any]]:
        if not self.enabled:
            self.log.info("Skipped (%s).", self.disabled_reason or "disabled")
            return []
        try:
            jobs = await self.fetch(
                query or settings.DEFAULT_QUERY, location or settings.DEFAULT_LOCATION
            )
            self.log.info("Fetched %d raw jobs.", len(jobs))
            return jobs or []
        except Exception as exc:
            self.log.error("Fetch failed: %s", exc)
            return []
