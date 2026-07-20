"""
aggregator.py — Orchestrates every source into one clean job list.

Flow:
  1. Call every enabled provider + scraper CONCURRENTLY (asyncio.gather).
  2. Collect all raw dicts.
  3. Normalize into the common `Job` schema (+ geocode, work-mode, skills).
  4. Validate required fields (done in the normalizer — invalid rows dropped).
  5. Remove duplicates across sources.
  6. Return one clean list of `Job`.

Results are cached (Redis or in-memory) for CACHE_TTL_SECONDS so repeated API
calls within the window are instant. The cache holds only REAL fetched jobs.
"""

import asyncio
from typing import Dict, List, Optional

from app.config import settings
from app.models.job import Job
from app.services.cache import cache
from app.services.deduplicator import deduplicate
from app.services.location_filter import filter_india, filter_by_location, is_country_or_blank
from app.services.normalizer import normalize_many
from app.utils.logger import get_logger

# Providers (Priority 1 — APIs)
from app.providers.remoteok import RemoteOKProvider
from app.providers.jsearch import JSearchProvider
from app.providers.adzuna import AdzunaProvider
from app.providers.jooble import JoobleProvider
from app.providers.rapidapi import RapidAPIProvider

# Scrapers (Priority 2 — HTML, + API-backed ATS boards)
from app.scrapers.greenhouse import GreenhouseScraper
from app.scrapers.lever import LeverScraper
from app.scrapers.internshala import InternshalaScraper
from app.scrapers.indeed import IndeedScraper
from app.scrapers.linkedin import LinkedInScraper
from app.scrapers.naukri import NaukriScraper
from app.scrapers.wellfound import WellfoundScraper
from app.scrapers.company_pages import CompanyPagesScraper

logger = get_logger("aggregator")


def build_sources() -> list:
    """Instantiate every source. Order is informational only (runs concurrently)."""
    sources = [
        # Priority 1 — official / free APIs
        RemoteOKProvider(),
        JSearchProvider(),
        AdzunaProvider(),
        JoobleProvider(),
        RapidAPIProvider(),
        GreenhouseScraper(),
        LeverScraper(),
    ]
    if settings.ENABLE_SCRAPERS:
        # Priority 2 — HTML scrapers
        sources += [
            InternshalaScraper(),
            IndeedScraper(),
            LinkedInScraper(),
            NaukriScraper(),
            WellfoundScraper(),
            CompanyPagesScraper(),
        ]
    return sources


class Aggregator:
    def __init__(self) -> None:
        self.sources = build_sources()

    def source_status(self) -> List[Dict]:
        return [
            {
                "name": s.name,
                "kind": s.kind,
                "enabled": s.enabled,
                "reason": "" if s.enabled else s.disabled_reason,
            }
            for s in self.sources
        ]

    async def collect(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        *,
        use_cache: bool = True,
        do_geocode: bool = True,
    ) -> List[Job]:
        query = query or settings.DEFAULT_QUERY
        location = location or settings.DEFAULT_LOCATION
        cache_key = f"jobs:agg:{query.lower()}:{location.lower()}"

        if use_cache:
            cached = await cache.get_json(cache_key)
            if cached:
                logger.info("Cache HIT for %s @ %s (%d jobs)", query, location, len(cached))
                return [Job(**j) for j in cached]

        logger.info("Collecting from %d sources for '%s' @ '%s'…", len(self.sources), query, location)

        # 1–2. Fetch all sources concurrently, collect raw dicts.
        results = await asyncio.gather(
            *(s.safe_fetch(query, location) for s in self.sources),
            return_exceptions=False,
        )
        raw: List[dict] = []
        per_source: Dict[str, int] = {}
        for src, jobs in zip(self.sources, results):
            per_source[src.name] = len(jobs)
            raw.extend(jobs)
        logger.info("Raw jobs by source: %s", per_source)

        # 3–4. Normalize + validate.
        normalized = await normalize_many(raw, do_geocode=do_geocode)

        # 4b. India-only enforcement (drop everything not located in India).
        if settings.INDIA_ONLY:
            normalized = filter_india(normalized)

        # 4c. City/location filter — when a specific location is requested,
        # keep ONLY jobs in that location (metro-cluster aware).
        if not is_country_or_blank(location):
            normalized = filter_by_location(normalized, location)

        # 5. Deduplicate.
        unique = deduplicate(normalized)

        # 6. Cache + return.
        if use_cache and unique:
            await cache.set_json(
                cache_key, [j.model_dump() for j in unique], ttl=settings.CACHE_TTL_SECONDS
            )
        logger.info(
            "Aggregation complete: %d raw -> %d normalized -> %d unique.",
            len(raw),
            len(normalized),
            len(unique),
        )
        return unique

    async def collect_from_source(
        self, source_name: str, query: Optional[str] = None, location: Optional[str] = None
    ) -> List[Job]:
        source = next((s for s in self.sources if s.name == source_name), None)
        if source is None:
            return []
        raw = await source.safe_fetch(
            query or settings.DEFAULT_QUERY, location or settings.DEFAULT_LOCATION
        )
        normalized = await normalize_many(raw)
        if settings.INDIA_ONLY:
            normalized = filter_india(normalized)
        if not is_country_or_blank(location or settings.DEFAULT_LOCATION):
            normalized = filter_by_location(normalized, location or settings.DEFAULT_LOCATION)
        return deduplicate(normalized)


# Shared singleton used by the API and scheduler.
aggregator = Aggregator()
