"""
cron.py — Periodic refresh scheduler (every 30 minutes by default).

Uses APScheduler's AsyncIOScheduler when installed; otherwise falls back to a
plain asyncio loop so scheduling works with a minimal install. Each run:
  • re-aggregates REAL jobs from all sources,
  • diffs against the in-memory job store to find NEW jobs,
  • marks jobs no longer seen as EXPIRED,
  • (optionally) persists via the Postgres layer when DATABASE_URL is set.

The in-memory store also backs the REST API so /jobs is instant between runs.
"""

import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.config import settings
from app.models.job import Job
from app.services.aggregator import aggregator
from app.utils.logger import get_logger

logger = get_logger("scheduler")


class JobStore:
    """In-memory store of the latest jobs keyed by fingerprint."""

    def __init__(self) -> None:
        self.jobs: Dict[str, Job] = {}
        self.expired: Dict[str, Job] = {}
        self.last_run: Optional[str] = None
        self.last_new_count: int = 0
        self.last_expired_count: int = 0
        self.total_runs: int = 0

    def upsert(self, fetched: List[Job]) -> None:
        fetched_fps = {j.fingerprint for j in fetched if j.fingerprint}
        new_count = 0
        for job in fetched:
            if job.fingerprint and job.fingerprint not in self.jobs:
                new_count += 1
            if job.fingerprint:
                self.jobs[job.fingerprint] = job
                self.expired.pop(job.fingerprint, None)

        # Mark jobs no longer present as expired.
        expired_count = 0
        for fp in list(self.jobs.keys()):
            if fp not in fetched_fps:
                self.expired[fp] = self.jobs.pop(fp)
                expired_count += 1

        self.last_run = datetime.now(timezone.utc).isoformat()
        self.last_new_count = new_count
        self.last_expired_count = expired_count
        self.total_runs += 1
        logger.info(
            "Store updated: %d active, %d new, %d expired.",
            len(self.jobs),
            new_count,
            expired_count,
        )

    def active(self) -> List[Job]:
        return list(self.jobs.values())


store = JobStore()
_scheduler = None
_fallback_task = None


async def refresh_once() -> Dict:
    """Run one aggregation + store update. Returns a small run summary."""
    logger.info("⏰ Scheduled refresh starting…")
    jobs = await aggregator.collect(use_cache=False)
    store.upsert(jobs)

    # Optional persistence (independent DB — off unless DATABASE_URL set).
    if settings.DATABASE_URL:
        try:
            from app.database.postgres import save_jobs

            await save_jobs(jobs)
        except Exception as exc:
            logger.warning("Persistence skipped/failed: %s", exc)

    return {
        "ranAt": store.last_run,
        "active": len(store.jobs),
        "new": store.last_new_count,
        "expired": store.last_expired_count,
    }


async def _fallback_loop(interval_seconds: int) -> None:
    while True:
        try:
            await refresh_once()
        except Exception as exc:
            logger.error("Refresh failed: %s", exc)
        await asyncio.sleep(interval_seconds)


def start_scheduler() -> str:
    """Start periodic refresh. Returns which backend was used."""
    global _scheduler, _fallback_task
    interval = settings.SCHEDULER_INTERVAL_MINUTES

    # Fire an immediate first run so the store is populated on boot.
    asyncio.create_task(refresh_once())

    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler  # optional
        from apscheduler.triggers.interval import IntervalTrigger

        _scheduler = AsyncIOScheduler(timezone="UTC")
        _scheduler.add_job(
            refresh_once,
            IntervalTrigger(minutes=interval),
            id="job_refresh",
            replace_existing=True,
            max_instances=1,
        )
        _scheduler.start()
        logger.info("APScheduler started — every %d minutes.", interval)
        return "apscheduler"
    except ImportError:
        _fallback_task = asyncio.create_task(_fallback_loop(interval * 60))
        logger.info("APScheduler not installed — using asyncio fallback loop (%d min).", interval)
        return "asyncio-fallback"


def shutdown_scheduler() -> None:
    global _scheduler, _fallback_task
    if _scheduler:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:
            pass
    if _fallback_task:
        _fallback_task.cancel()
