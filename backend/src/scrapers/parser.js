import axios from "axios";

const cache = new Map();
let nominatimDisabled = false;

/**
 * Geocode address/city/state to lat/lon using OpenStreetMap Nominatim.
 */
export async function geocode(city, state, country = "India") {
  const query = [city, state, country].filter(Boolean).join(", ");
  if (!query) return { lat: null, lon: null };

  const cacheKey = query.toLowerCase().trim();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Pre-configured coordinates for common cities to ensure fast/reliable response
  const fallbacks = {
    "delhi": { lat: 28.63756, lon: 77.22445 },
    "new delhi": { lat: 28.63756, lon: 77.22445 },
    "noida": { lat: 28.5451, lon: 77.3389 },
    "gurugram": { lat: 28.4051, lon: 77.0425 },
    "gurgaon": { lat: 28.4051, lon: 77.0425 },
    "bangalore": { lat: 12.9716, lon: 77.5946 },
    "bengaluru": { lat: 12.9716, lon: 77.5946 },
    "mumbai": { lat: 19.0760, lon: 72.8777 },
    "pune": { lat: 18.5204, lon: 73.8567 },
    "hyderabad": { lat: 17.3850, lon: 78.4867 },
    "chennai": { lat: 13.0827, lon: 80.2707 },
    "kolkata": { lat: 22.5726, lon: 88.3639 },
    "san francisco": { lat: 37.7749, lon: -122.4194 },
    "new york": { lat: 40.7128, lon: -74.0060 },
    "london": { lat: 51.5074, lon: -0.1278 },
    "sydney": { lat: -33.8688, lon: 151.2093 },
    "berlin": { lat: 52.5200, lon: 13.4050 },
    "tokyo": { lat: 35.6762, lon: 139.6503 },
    "singapore": { lat: 1.3521, lon: 103.8198 },
    "paris": { lat: 48.8566, lon: 2.3522 },
    "munich": { lat: 48.1351, lon: 11.5820 },
    "austin": { lat: 30.2672, lon: -97.7431 },
    "seattle": { lat: 47.6062, lon: -122.3321 },
    "united states": { lat: 37.0902, lon: -95.7129 },
    "us": { lat: 37.0902, lon: -95.7129 },
    "usa": { lat: 37.0902, lon: -95.7129 },
    "australia": { lat: -25.2744, lon: 133.7751 },
    "germany": { lat: 51.1657, lon: 10.4515 },
    "united kingdom": { lat: 55.3781, lon: -3.4360 },
    "uk": { lat: 55.3781, lon: -3.4360 }
  };

  const queryLower = query.toLowerCase();
  for (const [cityName, coords] of Object.entries(fallbacks)) {
    if (queryLower.includes(cityName)) {
      cache.set(cacheKey, coords);
      return coords;
    }
  }

  if (nominatimDisabled) {
    return { lat: null, lon: null };
  }

  try {
    // Delay 1 second to respect Nominatim's strict usage policy
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: query,
        format: "json",
        limit: 1
      },
      headers: {
        "User-Agent": "NearHireJobDiscoveryPlatform/1.0 (contact@nearhire.ai)"
      },
      timeout: 5000
    });

    if (response.data && response.data.length > 0) {
      const result = {
        lat: parseFloat(response.data[0].lat),
        lon: parseFloat(response.data[0].lon)
      };
      cache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.error(`[Geocoding] Failed to geocode "${query}":`, error.message);
    if (error.response && error.response.status === 429) {
      console.warn("[Geocoding] Nominatim returned 429. Disabling Nominatim API calls for this run.");
      nominatimDisabled = true;
    }
  }

  return { lat: null, lon: null };
}

/**
 * Normalise job work mode.
 */
export function normalizeWorkMode(modeStr, description = "") {
  const text = (modeStr || "").toLowerCase() + (description || "").toLowerCase();
  if (text.includes("remote") || text.includes("work from home") || text.includes("wfh")) {
    return "REMOTE";
  }
  if (text.includes("hybrid") || text.includes("flexible onsite")) {
    return "HYBRID";
  }
  return "ONSITE";
}

/**
 * Normalise employment type.
 */
export function normalizeJobType(typeStr, title = "") {
  const text = (typeStr || "").toLowerCase() + (title || "").toLowerCase();
  if (text.includes("intern") || text.includes("co-op")) {
    return "INTERNSHIP";
  }
  if (text.includes("contract") || text.includes("freelance") || text.includes("temporary")) {
    return "CONTRACT";
  }
  if (text.includes("part-time") || text.includes("part time")) {
    return "PART_TIME";
  }
  return "FULL_TIME";
}

/**
 * Format salary.
 */
export function parseSalary(salaryStr) {
  if (!salaryStr) return { min: null, max: null, period: "YEAR", display: "Not disclosed" };
  // Simple parser regex to extract numbers
  const numbers = salaryStr.match(/\d+[\d,.]*/g);
  if (!numbers) return { min: null, max: null, period: "YEAR", display: salaryStr };

  const parsed = numbers.map(n => parseInt(n.replace(/,/g, ""), 10));
  const isMonth = salaryStr.toLowerCase().includes("month") || salaryStr.toLowerCase().includes("pm");
  
  return {
    min: parsed[0] || null,
    max: parsed[1] || parsed[0] || null,
    period: isMonth ? "MONTH" : "YEAR",
    display: salaryStr
  };
}
