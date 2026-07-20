"""
helpers.py — Small shared utilities: HTML cleaning, skill extraction,
User-Agent rotation, and a resilient async HTTP GET/POST with retry,
timeout, and rate limiting (built on httpx).
"""

import asyncio
import random
import re
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("helpers")

# Rotated per request to reduce trivial bot-blocking.
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")

# A compact, extendable tech-skill dictionary for extracting skills from text.
TECH_SKILLS = [
    "React", "Vue", "Angular", "Node.js", "Python", "Django", "FastAPI",
    "Flask", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind CSS",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
    "AWS", "GCP", "Azure", "Git", "REST API", "GraphQL", "Java", "Spring Boot",
    "C++", "C#", "Go", "Rust", "PHP", "Laravel", "Next.js", "Express.js",
    "Linux", "CI/CD", "Machine Learning", "Deep Learning", "TensorFlow",
    "PyTorch", "Pandas", "NumPy", "Selenium", "Kafka", "Spark", "Figma",
]


def random_user_agent() -> str:
    return random.choice(USER_AGENTS)


def strip_html(text: Optional[str]) -> str:
    if not text:
        return ""
    return _WS_RE.sub(" ", _TAG_RE.sub(" ", text)).strip()


def extract_skills(text: str, extra: Optional[List[str]] = None) -> List[str]:
    text = text or ""
    found = [
        s
        for s in TECH_SKILLS
        if re.search(rf"\b{re.escape(s)}\b", text, re.IGNORECASE)
    ]
    if extra:
        for e in extra:
            e = str(e).strip()
            if e and e not in found:
                found.append(e)
    # Preserve order, cap length.
    seen: set = set()
    unique = []
    for s in found:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            unique.append(s)
    return unique[:15]


def infer_work_mode(*texts: str) -> Dict[str, bool]:
    blob = " ".join(t.lower() for t in texts if t)
    remote = bool(re.search(r"\bremote\b|work from home|\bwfh\b", blob))
    hybrid = bool(re.search(r"\bhybrid\b", blob))
    onsite = not remote and not hybrid
    if hybrid:  # hybrid implies some onsite; keep remote false unless stated
        onsite = False
    return {"remote": remote, "hybrid": hybrid, "onsite": onsite}


def normalize_employment_type(*texts: str) -> str:
    blob = " ".join(t.lower() for t in texts if t)
    if "intern" in blob or "co-op" in blob:
        return "INTERNSHIP"
    if "contract" in blob or "freelance" in blob or "temporary" in blob:
        return "CONTRACT"
    if "part-time" in blob or "part time" in blob:
        return "PART_TIME"
    return "FULL_TIME"


# Simple in-process token bucket per host to be polite.
_last_call: Dict[str, float] = {}


async def _respect_rate_limit(host: str) -> None:
    now = asyncio.get_event_loop().time()
    last = _last_call.get(host, 0.0)
    wait = settings.RATE_LIMIT_DELAY - (now - last)
    if wait > 0:
        await asyncio.sleep(wait)
    _last_call[host] = asyncio.get_event_loop().time()


async def http_request(
    method: str,
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    json: Optional[Dict[str, Any]] = None,
    timeout: Optional[int] = None,
) -> Optional[httpx.Response]:
    """
    Resilient HTTP call: UA rotation, per-host rate limiting, timeout, and
    exponential-backoff retries. Returns the Response on success, or None on
    exhaustion (callers treat None as "no jobs from this source").
    """
    host = httpx.URL(url).host or url
    hdrs = {"User-Agent": random_user_agent(), "Accept": "application/json"}
    if headers:
        hdrs.update(headers)

    attempts = settings.HTTP_MAX_RETRIES
    for attempt in range(1, attempts + 1):
        try:
            await _respect_rate_limit(host)
            async with httpx.AsyncClient(
                timeout=timeout or settings.HTTP_TIMEOUT, follow_redirects=True
            ) as client:
                resp = await client.request(
                    method, url, headers=hdrs, params=params, json=json
                )
            if resp.status_code == 429:
                raise httpx.HTTPStatusError(
                    "rate limited", request=resp.request, response=resp
                )
            if resp.status_code >= 500:
                raise httpx.HTTPStatusError(
                    f"server error {resp.status_code}",
                    request=resp.request,
                    response=resp,
                )
            return resp
        except (httpx.TimeoutException, httpx.TransportError, httpx.HTTPStatusError) as exc:
            backoff = settings.HTTP_RETRY_BACKOFF * (2 ** (attempt - 1))
            logger.warning(
                "HTTP %s %s failed (attempt %d/%d): %s — retrying in %.2fs",
                method,
                host,
                attempt,
                attempts,
                exc,
                backoff,
            )
            if attempt < attempts:
                await asyncio.sleep(backoff)
    logger.error("HTTP %s %s exhausted retries.", method, host)
    return None


async def http_get(url: str, **kwargs) -> Optional[httpx.Response]:
    return await http_request("GET", url, **kwargs)


async def http_post(url: str, **kwargs) -> Optional[httpx.Response]:
    return await http_request("POST", url, **kwargs)


async def fetch_html(url: str, **kwargs) -> Optional[str]:
    """Fetch a page as HTML with a browser-like Accept header. None on failure."""
    kwargs.setdefault(
        "headers",
        {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    resp = await http_get(url, **kwargs)
    if resp is None or resp.status_code != 200:
        return None
    return resp.text


def make_soup(html: Optional[str]):
    """
    Lazily build a BeautifulSoup tree. Returns None if html is empty or if
    BeautifulSoup/lxml are not installed — callers then yield no jobs (never
    fabricate). Prefers the lxml parser, falls back to the stdlib parser.
    """
    if not html:
        return None
    try:
        from bs4 import BeautifulSoup  # optional dependency
    except ImportError:
        logger.warning("beautifulsoup4 not installed — HTML scrapers disabled.")
        return None
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        try:
            return BeautifulSoup(html, "html.parser")
        except Exception as exc:
            logger.warning("Failed to parse HTML: %s", exc)
            return None
