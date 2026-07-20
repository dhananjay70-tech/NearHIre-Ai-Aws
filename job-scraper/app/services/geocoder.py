"""
geocoder.py — City/state → latitude/longitude.

Fast path: an in-memory table of common Indian + global cities (no network).
Slow path: OpenStreetMap Nominatim (optional, rate-limited, cached). Failures
are non-fatal — a job simply keeps null coordinates.
"""

from typing import Dict, Optional, Tuple

from app.config import settings
from app.services.cache import cache
from app.utils.helpers import http_get
from app.utils.logger import get_logger

logger = get_logger("geocoder")

_FALLBACK: Dict[str, Tuple[float, float]] = {
    "delhi": (28.63756, 77.22445),
    "new delhi": (28.63756, 77.22445),
    "noida": (28.5355, 77.3910),
    "gurugram": (28.4595, 77.0266),
    "gurgaon": (28.4595, 77.0266),
    "faridabad": (28.4089, 77.3178),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "hyderabad": (17.3850, 78.4867),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873),
    "indore": (22.7196, 75.8577),
    "chandigarh": (30.7333, 76.7794),
    "kochi": (9.9312, 76.2673),
    "coimbatore": (11.0168, 76.9558),
    "remote": (None, None),  # sentinel handled below
    "san francisco": (37.7749, -122.4194),
    "new york": (40.7128, -74.0060),
    "london": (51.5074, -0.1278),
    "berlin": (52.5200, 13.4050),
    "singapore": (1.3521, 103.8198),
    "toronto": (43.6532, -79.3832),
    "sydney": (-33.8688, 151.2093),
    "india": (20.5937, 78.9629),
    "united states": (37.0902, -95.7129),
}


async def geocode(
    city: Optional[str], state: Optional[str] = None, country: str = "India"
) -> Tuple[Optional[float], Optional[float]]:
    query_parts = [p for p in [city, state, country] if p]
    if not query_parts:
        return None, None

    # Fallback table (substring match on the first meaningful token).
    probe = (city or state or country or "").strip().lower()
    for name, coords in _FALLBACK.items():
        if name != "remote" and name in probe:
            return coords

    if not settings.ENABLE_NOMINATIM:
        return None, None

    query = ", ".join(query_parts)
    cache_key = f"geo:{query.lower()}"
    cached = await cache.get_json(cache_key)
    if cached:
        return cached.get("lat"), cached.get("lon")

    resp = await http_get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": query, "format": "json", "limit": 1},
        headers={"User-Agent": settings.NOMINATIM_USER_AGENT},
        timeout=8,
    )
    if resp is not None and resp.status_code == 200:
        try:
            data = resp.json()
            if data:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                await cache.set_json(cache_key, {"lat": lat, "lon": lon}, ttl=86400)
                return lat, lon
        except Exception as exc:
            logger.debug("Nominatim parse failed for %s: %s", query, exc)

    return None, None
