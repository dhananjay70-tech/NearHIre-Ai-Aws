/**
 * geocodingService.js — Convert a free-text city (or "city, state") into
 * latitude/longitude so the existing radius/Haversine search can be driven by a
 * city name instead of only GPS/manual coordinates.
 *
 * Fast path : an in-memory table of common Indian (and a few global) cities —
 *             zero network, instant, always available.
 * Slow path : OpenStreetMap Nominatim (rate-limited, cached 24h). Failures are
 *             non-fatal — the caller receives a 404-style null result and can
 *             fall back to plain text search.
 */

import axios from "axios";
import { config } from "../config/config.js";
import { cacheGet, cacheSet } from "../utils/cache.js";
import { AppError } from "../utils/AppError.js";

const GEO_TTL_SECONDS = 24 * 60 * 60; // 24h — city coordinates never really change.

// Fast, offline lookup for the cities NearHire targets most (India-first).
// Keys are lowercase; values are [lat, lng].
const CITY_TABLE = {
  "mumbai": [19.076, 72.8777],
  "delhi": [28.63756, 77.22445],
  "new delhi": [28.63756, 77.22445],
  "noida": [28.5355, 77.391],
  "gurugram": [28.4595, 77.0266],
  "gurgaon": [28.4595, 77.0266],
  "faridabad": [28.4089, 77.3178],
  "ghaziabad": [28.6692, 77.4538],
  "bangalore": [12.9716, 77.5946],
  "bengaluru": [12.9716, 77.5946],
  "pune": [18.5204, 73.8567],
  "hyderabad": [17.385, 78.4867],
  "chennai": [13.0827, 80.2707],
  "kolkata": [22.5726, 88.3639],
  "ahmedabad": [23.0225, 72.5714],
  "jaipur": [26.9124, 75.7873],
  "lucknow": [26.8467, 80.9462],
  "kanpur": [26.4499, 80.3319],
  "nagpur": [21.1458, 79.0882],
  "indore": [22.7196, 75.8577],
  "bhopal": [23.2599, 77.4126],
  "surat": [21.1702, 72.8311],
  "vadodara": [22.3072, 73.1812],
  "coimbatore": [11.0168, 76.9558],
  "kochi": [9.9312, 76.2673],
  "thiruvananthapuram": [8.5241, 76.9366],
  "chandigarh": [30.7333, 76.7794],
  "mohali": [30.7046, 76.7179],
  "mysore": [12.2958, 76.6394],
  "mysuru": [12.2958, 76.6394],
  "visakhapatnam": [17.6868, 83.2185],
  "patna": [25.5941, 85.1376],
  "bhubaneswar": [20.2961, 85.8245],
  "guwahati": [26.1445, 91.7362],
  "dehradun": [30.3165, 78.0322],
  "ranchi": [23.3441, 85.3096],
  "raipur": [21.2514, 81.6296],
  "nashik": [19.9975, 73.7898],
  "rajkot": [22.3039, 70.8022],
  "jodhpur": [26.2389, 73.0243],
  "amritsar": [31.634, 74.8723],
  "ludhiana": [30.901, 75.8573],
};

/**
 * Try the offline table first. Matches an exact city name, then a substring
 * (so "Sohna, Haryana" still resolves via "haryana" only if listed — otherwise
 * the primary token wins). Returns [lat, lng] or null.
 */
function lookupTable(rawCity) {
  const probe = String(rawCity || "").trim().toLowerCase();
  if (!probe) return null;

  // Exact match on the full string or the first comma-separated token.
  const primary = probe.split(",")[0].trim();
  if (CITY_TABLE[probe]) return CITY_TABLE[probe];
  if (CITY_TABLE[primary]) return CITY_TABLE[primary];

  // Substring fallback: "greater mumbai" -> mumbai.
  for (const [name, coords] of Object.entries(CITY_TABLE)) {
    if (primary.includes(name) || name.includes(primary)) {
      return coords;
    }
  }
  return null;
}

/**
 * Geocode a city (optionally with state/country) to coordinates.
 *
 * @param {string} city    - required, free text ("Mumbai", "Sohna, Haryana")
 * @param {string} [state] - optional
 * @param {string} [country="India"]
 * @returns {Promise<{latitude:number, longitude:number, displayName:string, source:'table'|'nominatim'}>}
 * @throws  {AppError} 400 if city is empty, 404 if the city cannot be resolved.
 */
export async function geocodeCity(city, state = "", country = "India") {
  const cityText = String(city || "").trim();
  if (!cityText) {
    throw new AppError("A city name is required to geocode.", 400);
  }

  // 1) Offline table — instant, no dependency on the network or a key.
  const tableHit = lookupTable(cityText) || (state ? lookupTable(state) : null);
  if (tableHit) {
    return {
      latitude: tableHit[0],
      longitude: tableHit[1],
      displayName: [cityText, state, country].filter(Boolean).join(", "),
      source: "table",
    };
  }

  // 2) Cache (covers previously-resolved Nominatim lookups).
  const queryParts = [cityText, state, country].filter(Boolean);
  const query = queryParts.join(", ");
  const cacheKey = `geo:${query.toLowerCase()}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  // 3) Nominatim (OpenStreetMap). Rate-limited & polite via a User-Agent.
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: { q: query, format: "json", limit: 1, countrycodes: "in" },
        headers: { "User-Agent": config.nominatimUserAgent },
        timeout: 8000,
      }
    );

    const hit = Array.isArray(response.data) ? response.data[0] : null;
    if (hit && hit.lat && hit.lon) {
      const result = {
        latitude: Number(hit.lat),
        longitude: Number(hit.lon),
        displayName: hit.display_name || query,
        source: "nominatim",
      };
      await cacheSet(cacheKey, result, GEO_TTL_SECONDS);
      return result;
    }
  } catch (error) {
    // Non-fatal — surface a clean 404 below so the client can fall back.
    console.warn(`[Geocode] Nominatim lookup failed for "${query}":`, error.message);
  }

  throw new AppError(
    `Could not find coordinates for "${cityText}". Try a nearby major city or enter coordinates manually.`,
    404
  );
}
