"""
location_filter.py — India-only enforcement.

The single source of truth for "is this job located in India?". Applied by the
aggregator AFTER normalization, so every job returned by the service is India-
located regardless of which provider/scraper produced it.

A job is kept when ANY India signal is present in its country / state / city /
location text (or an explicit `IN` country code). Absence of an India signal
means the job is dropped — the service never guesses a job into India.

Worldwide/remote jobs that don't mention India are dropped unless
INCLUDE_WORLDWIDE_REMOTE is enabled.
"""

import re
from difflib import SequenceMatcher
from typing import List, Set, Tuple

from app.config import settings
from app.models.job import Job
from app.utils.logger import get_logger

logger = get_logger("location_filter")

# 28 states + 8 union territories (common names + variants).
INDIAN_STATES = {
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
    "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
    "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
    "nagaland", "odisha", "orissa", "punjab", "rajasthan", "sikkim", "tamil nadu",
    "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
    "andaman and nicobar", "chandigarh", "dadra and nagar haveli", "daman and diu",
    "delhi", "jammu and kashmir", "jammu", "kashmir", "ladakh", "lakshadweep",
    "puducherry", "pondicherry", "ncr",
}

# Major Indian cities (+ common alternate spellings).
INDIAN_CITIES = {
    "delhi", "new delhi", "mumbai", "bombay", "bengaluru", "bangalore",
    "hyderabad", "chennai", "madras", "kolkata", "calcutta", "pune", "ahmedabad",
    "jaipur", "surat", "lucknow", "kanpur", "nagpur", "indore", "thane", "bhopal",
    "visakhapatnam", "vizag", "patna", "vadodara", "baroda", "ghaziabad", "noida",
    "greater noida", "gurugram", "gurgaon", "faridabad", "coimbatore", "kochi",
    "cochin", "mysore", "mysuru", "guwahati", "trivandrum", "thiruvananthapuram",
    "nashik", "nasik", "rajkot", "jodhpur", "raipur", "ranchi", "amritsar",
    "allahabad", "prayagraj", "gwalior", "vijayawada", "madurai", "jabalpur",
    "dehradun", "mangalore", "mangaluru", "tiruchirappalli", "trichy", "salem",
    "bhubaneswar", "aurangabad", "jamshedpur", "hubli", "belgaum", "ernakulam",
    "udaipur", "kozhikode", "calicut", "warangal", "guntur", "gandhinagar",
    "navi mumbai", "vellore", "tirupati", "shimla", "panaji", "goa",
}

# Precompiled word-boundary patterns.
_INDIA_WORD = re.compile(r"\bindia\b|\bbharat\b|\bhindustan\b", re.IGNORECASE)
_STATE_RE = re.compile(
    r"\b(" + "|".join(re.escape(s) for s in sorted(INDIAN_STATES, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)
_CITY_RE = re.compile(
    r"\b(" + "|".join(re.escape(c) for c in sorted(INDIAN_CITIES, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)
# Indian PIN code: 6 digits, first digit 1-9.
_PIN_RE = re.compile(r"\b[1-9]\d{5}\b")


def _has_india_signal(text: str) -> bool:
    if not text:
        return False
    if _INDIA_WORD.search(text):
        return True
    if _CITY_RE.search(text):
        return True
    if _STATE_RE.search(text):
        return True
    return False


def is_india_job(job: Job) -> bool:
    """Return True if the job is located in India."""
    # Explicit country code / name.
    country = (job.country or "").strip().lower()
    if country in {"in", "ind", "india", "bharat"}:
        return True

    haystack = " ".join(
        filter(
            None,
            [job.country, job.state, job.city, job.location],
        )
    )
    if _has_india_signal(haystack):
        return True

    # An Indian PIN code alongside no foreign-country signal is a strong hint.
    if job.pincode and _PIN_RE.fullmatch(job.pincode.strip()):
        return True

    # Remote/worldwide with no India mention — opt-in only.
    if job.remote and settings.INCLUDE_WORLDWIDE_REMOTE:
        return True

    return False


def filter_india(jobs: List[Job]) -> List[Job]:
    """Keep only India-located jobs; tag missing country as 'India' for consistency."""
    kept: List[Job] = []
    for job in jobs:
        if is_india_job(job):
            if not job.country:
                job.country = "India"
            kept.append(job)
    dropped = len(jobs) - len(kept)
    logger.info("India filter: %d in -> %d India jobs (%d non-India dropped).", len(jobs), len(kept), dropped)
    return kept


# ─────────────────────────────────────────────────────────────────────────
# City / location filtering
#
# A search for `location=Mumbai` must return ONLY Mumbai-area jobs, never
# Delhi/Bangalore/Pune/etc. Cities are normalized into metro clusters so that a
# city and its suburbs / satellite towns all match the parent city, but distinct
# cities never cross-match.
# ─────────────────────────────────────────────────────────────────────────

METRO_CLUSTERS: dict[str, Set[str]] = {
    "mumbai": {
        "navi mumbai", "thane", "powai", "andheri", "bandra", "borivali", "dadar",
        "kurla", "malad", "goregaon", "vashi", "mulund", "chembur", "worli",
        "colaba", "juhu", "vile parle", "ghatkopar", "kalyan", "dombivli",
        "panvel", "mira road", "bhayandar", "kandivali", "santacruz", "sion",
        "byculla", "lower parel", "vikhroli", "bhandup", "nerul", "airoli",
    },
    "delhi": {
        "new delhi", "noida", "greater noida", "gurugram", "gurgaon", "ghaziabad",
        "faridabad", "ncr", "dwarka", "rohini", "saket", "nehru place", "okhla",
        "connaught place", "janakpuri", "pitampura", "vasant kunj", "karol bagh",
    },
    "bangalore": {
        "bengaluru", "whitefield", "electronic city", "marathahalli", "koramangala",
        "indiranagar", "hsr layout", "btm layout", "jayanagar", "yelahanka",
        "hebbal", "bellandur", "sarjapur", "jp nagar", "malleshwaram", "rajajinagar",
    },
    "pune": {
        "pimpri", "chinchwad", "pimpri-chinchwad", "hinjewadi", "hinjawadi",
        "kharadi", "wakad", "hadapsar", "viman nagar", "baner", "aundh",
        "kothrud", "magarpatta", "kharadmi",
    },
    "hyderabad": {
        "secunderabad", "gachibowli", "hitech city", "hitec city", "madhapur",
        "kondapur", "kukatpally", "begumpet", "banjara hills", "jubilee hills", "uppal",
    },
    "chennai": {
        "madras", "omr", "tambaram", "velachery", "guindy", "adyar", "porur",
        "anna nagar", "t nagar", "sholinganallur", "perungudi",
    },
    "kolkata": {
        "calcutta", "howrah", "salt lake", "new town", "rajarhat", "behala", "dumdum",
    },
    "ahmedabad": {"gandhinagar", "sabarmati", "maninagar", "bopal", "satellite"},
    "noida": {"greater noida"},
    "gurugram": {"gurgaon"},
}

# canonical names (a canonical always resolves to itself, even if it also appears
# as an alias/suburb of a larger metro — e.g. Noida within Delhi NCR).
_CANONICALS: Set[str] = set(METRO_CLUSTERS.keys())

# alias -> canonical (canonicals win; first alias mapping otherwise).
_ALIAS_TO_CANON: dict[str, str] = {}
for _canon, _aliases in METRO_CLUSTERS.items():
    for _a in _aliases:
        _ALIAS_TO_CANON.setdefault(_a, _canon)

_COUNTRY_TERMS = {"", "india", "in", "ind", "bharat", "hindustan"}
_FUZZY_THRESHOLD = 0.88


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _word_in(term: str, text: str) -> bool:
    if not term or not text:
        return False
    return re.search(rf"\b{re.escape(term)}\b", text) is not None


def is_country_or_blank(requested: str) -> bool:
    """True when the requested location is country-level (India) or empty —
    in that case no city filtering is applied."""
    r = _norm(requested)
    return r in _COUNTRY_TERMS


def resolve_location(requested: str) -> Tuple[str, Set[str]]:
    """
    Resolve a requested location into (kind, accepted_terms):
      kind = "city"  -> match accepted_terms against city/location
      kind = "state" -> match the state name against state/location/city
      kind = "country" -> no filtering
    """
    r = _norm(requested)
    if r in _COUNTRY_TERMS:
        return "country", set()

    # Try the whole string and each comma-separated segment (e.g. "Mumbai, MH").
    candidates = [r] + [seg.strip() for seg in r.split(",") if seg.strip()]

    for c in candidates:
        if c in _CANONICALS:
            return "city", {c} | METRO_CLUSTERS[c]
        if c in _ALIAS_TO_CANON:
            canon = _ALIAS_TO_CANON[c]
            return "city", {canon} | METRO_CLUSTERS[canon]

    for c in candidates:
        if c in INDIAN_STATES:
            return "state", {c}

    # Unknown city/town: match on the requested term itself (substring + fuzzy).
    return "city", {r}


def _matches(job: Job, kind: str, terms: Set[str]) -> bool:
    if kind == "country":
        return True

    city = _norm(job.city or "")
    loc = _norm(job.location or "")
    state = _norm(job.state or "")

    if kind == "state":
        term = next(iter(terms))
        return _word_in(term, state) or _word_in(term, loc) or _word_in(term, city)

    # city / unknown-city
    haystack = f"{city} {loc}".strip()
    for term in terms:
        if _word_in(term, haystack):
            return True

    # Fuzzy fallback on the city and each location segment (typos/variants).
    segments = [city] + [s.strip() for s in loc.split(",") if s.strip()]
    for seg in segments:
        if not seg:
            continue
        for term in terms:
            if SequenceMatcher(None, seg, term).ratio() >= _FUZZY_THRESHOLD:
                return True
    return False


def matches_location(job: Job, requested: str) -> bool:
    """Public single-job check used by the API and aggregator."""
    if is_country_or_blank(requested):
        return True
    kind, terms = resolve_location(requested)
    return _matches(job, kind, terms)


def filter_by_location(jobs: List[Job], requested: str) -> List[Job]:
    """
    Keep only jobs matching the requested location. Country-level/blank requests
    are passed through unchanged (India filtering already applied elsewhere).
    """
    if is_country_or_blank(requested):
        return jobs
    kind, terms = resolve_location(requested)
    if kind == "country":
        return jobs
    kept = [j for j in jobs if _matches(j, kind, terms)]
    logger.info(
        "Location filter (%s -> %s): %d in -> %d match (%d dropped).",
        requested,
        kind,
        len(jobs),
        len(kept),
        len(jobs) - len(kept),
    )
    return kept
