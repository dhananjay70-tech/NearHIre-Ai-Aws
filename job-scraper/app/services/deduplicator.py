"""
deduplicator.py — Remove duplicate jobs across all sources.

Layered strategy (cheapest signal first):
  1. Exact apply-URL match.
  2. Exact (company + title + city) key.
  3. Fuzzy description similarity within the same company+title bucket
     (difflib ratio) to catch the same posting reworded across boards.
"""

from difflib import SequenceMatcher
from typing import List

from app.models.job import Job
from app.utils.logger import get_logger

logger = get_logger("deduplicator")

_SIMILARITY_THRESHOLD = 0.90


def _norm(text: str) -> str:
    return " ".join((text or "").lower().split())


def deduplicate(jobs: List[Job]) -> List[Job]:
    seen_urls: set[str] = set()
    seen_keys: set[str] = set()
    # bucket -> list of description snippets already kept
    desc_buckets: dict[str, List[str]] = {}

    unique: List[Job] = []
    removed = 0

    for job in jobs:
        url = _norm(job.apply_url or "").split("?")[0]
        key = "|".join(
            [_norm(job.company), _norm(job.title), _norm(job.city or job.location or "")]
        )

        if url and url in seen_urls:
            removed += 1
            continue
        if key in seen_keys:
            removed += 1
            continue

        # Fuzzy description check within the same company+title bucket.
        bucket_key = "|".join([_norm(job.company), _norm(job.title)])
        desc = _norm(job.description or "")[:600]
        is_dupe = False
        if desc:
            for existing in desc_buckets.get(bucket_key, []):
                if SequenceMatcher(None, desc, existing).ratio() >= _SIMILARITY_THRESHOLD:
                    is_dupe = True
                    break
        if is_dupe:
            removed += 1
            continue

        # Keep it.
        if url:
            seen_urls.add(url)
        seen_keys.add(key)
        desc_buckets.setdefault(bucket_key, []).append(desc)
        unique.append(job)

    logger.info("Dedup: %d in -> %d unique (%d removed)", len(jobs), len(unique), removed)
    return unique
