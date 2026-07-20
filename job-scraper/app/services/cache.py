"""
cache.py — TTL cache with optional Redis backend.

Uses Redis (redis.asyncio) when REDIS_URL is set and the `redis` package is
installed; otherwise transparently falls back to an in-process TTL dict, so the
service runs with zero extra infrastructure. Same async API either way.
"""

import json
import time
from typing import Any, Optional

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("cache")


class _MemoryCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, str]] = {}

    async def get(self, key: str) -> Optional[str]:
        item = self._store.get(key)
        if not item:
            return None
        expires_at, value = item
        if time.time() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: str, ttl: int) -> None:
        if len(self._store) > 1000:
            # Drop the oldest entry (cheap bounded eviction).
            oldest = min(self._store, key=lambda k: self._store[k][0])
            self._store.pop(oldest, None)
        self._store[key] = (time.time() + ttl, value)

    async def keys(self, pattern_prefix: str) -> list[str]:
        return [k for k in self._store if k.startswith(pattern_prefix)]


class Cache:
    def __init__(self) -> None:
        self._redis = None
        self._memory = _MemoryCache()
        self._backend = "memory"

        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis  # lazy, optional

                self._redis = aioredis.from_url(
                    settings.REDIS_URL, decode_responses=True
                )
                self._backend = "redis"
                logger.info("Cache backend: Redis (%s)", settings.REDIS_URL)
            except Exception as exc:
                logger.warning(
                    "REDIS_URL set but redis unavailable (%s). Using in-memory cache.",
                    exc,
                )

        if self._backend == "memory":
            logger.info("Cache backend: in-memory TTL (no Redis).")

    @property
    def backend(self) -> str:
        return self._backend

    async def get_json(self, key: str) -> Optional[Any]:
        try:
            raw = (
                await self._redis.get(key)
                if self._redis
                else await self._memory.get(key)
            )
            return json.loads(raw) if raw else None
        except Exception as exc:  # pragma: no cover
            logger.warning("cache get failed for %s: %s", key, exc)
            return None

    async def set_json(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        ttl = ttl or settings.CACHE_TTL_SECONDS
        try:
            payload = json.dumps(value, default=str)
            if self._redis:
                await self._redis.set(key, payload, ex=ttl)
            else:
                await self._memory.set(key, payload, ttl)
        except Exception as exc:  # pragma: no cover
            logger.warning("cache set failed for %s: %s", key, exc)

    async def close(self) -> None:
        if self._redis:
            try:
                await self._redis.aclose()
            except Exception:
                pass


# Shared singleton.
cache = Cache()
