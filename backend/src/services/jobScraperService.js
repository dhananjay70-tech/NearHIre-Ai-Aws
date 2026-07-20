/**
 * jobScraperService.js — REST client for the Job Scraper microservice (MS3).
 *
 * MS1 NEVER scrapes. It calls the independent Job Scraper over HTTP:
 *   GET {JOB_SCRAPER_URL}/jobs
 *   GET {JOB_SCRAPER_URL}/jobs/search
 *   GET {JOB_SCRAPER_URL}/jobs/latest
 *   GET {JOB_SCRAPER_URL}/health
 *
 * Behaviour:
 *   • URL comes from config.jobScraperUrl (env JOB_SCRAPER_URL) — never hardcoded.
 *   • Responses cached for 5 minutes (Redis if configured, else in-memory).
 *   • On failure the caller receives AppError(503) — we NEVER return dummy jobs.
 *   • Logs each request: path, response time, job count, errors, retries.
 */

import axios from "axios";
import { config } from "../config/config.js";
import { AppError } from "../utils/AppError.js";
import { cacheWrap } from "../utils/cache.js";

const BASE_URL = config.jobScraperUrl.replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 2;
const CACHE_TTL_SECONDS = 300; // 5 minutes (Step 10)

function log(message, meta = {}) {
  const parts = Object.entries(meta)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.log(`[JobScraper] ${message}${parts ? " | " + parts : ""}`);
}

/**
 * Low-level GET with timeout, light retry, and structured logging.
 * Throws AppError(503) when the scraper cannot be reached.
 */
async function scraperGet(path, params = {}) {
  const url = `${BASE_URL}${path}`;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    const start = Date.now();
    try {
      const response = await axios.get(url, {
        params,
        timeout: REQUEST_TIMEOUT_MS,
      });
      const ms = Date.now() - start;
      const jobCount =
        response.data?.count ??
        (Array.isArray(response.data?.jobs) ? response.data.jobs.length : undefined);
      log("request ok", { path, ms, jobs: jobCount ?? "n/a", attempt });
      return response.data;
    } catch (err) {
      lastError = err;
      const ms = Date.now() - start;
      log("request failed", {
        path,
        ms,
        attempt,
        error: err.code || err.message,
      });
      // Retry only on network/timeout errors, not on 4xx/5xx bodies.
      const retriable =
        !err.response &&
        ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ECONNABORTED"].includes(
          err.code
        );
      if (!retriable || attempt > MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }

  log("giving up — scraper unavailable", { path, lastError: lastError?.message });
  throw new AppError(
    "Job Scraper service is unavailable. Please try again shortly.",
    503
  );
}

/** GET /jobs — full job list (optional query, location, remote, limit, offset). */
export async function getJobs(params = {}) {
  const key = `scraper:jobs:${JSON.stringify(params)}`;
  return cacheWrap(key, CACHE_TTL_SECONDS, () => scraperGet("/jobs", params));
}

/** GET /jobs/search — keyword + location search. */
export async function searchJobs(params = {}) {
  const key = `scraper:search:${JSON.stringify(params)}`;
  return cacheWrap(key, CACHE_TTL_SECONDS, () => scraperGet("/jobs/search", params));
}

/** GET /jobs/latest — newest jobs. */
export async function latestJobs(params = {}) {
  const key = `scraper:latest:${JSON.stringify(params)}`;
  return cacheWrap(key, CACHE_TTL_SECONDS, () => scraperGet("/jobs/latest", params));
}

/**
 * GET /health — scraper health. Not cached. Returns a normalized object and
 * never throws (used for the non-fatal startup check); callers inspect `ok`.
 */
export async function health() {
  try {
    const data = await scraperGet("/health");
    return { ok: true, url: BASE_URL, ...data };
  } catch (err) {
    return { ok: false, url: BASE_URL, error: err.message };
  }
}

export const jobScraperBaseUrl = BASE_URL;
