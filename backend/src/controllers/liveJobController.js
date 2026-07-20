/**
 * liveJobController.js — HTTP handlers that proxy to the Job Scraper (MS3).
 *
 * These power the "live" job endpoints under /api/jobs so the frontend can get
 * real aggregated jobs THROUGH the backend (the frontend never calls MS3
 * directly). Existing DB-backed job endpoints are untouched.
 *
 * If MS3 is down, jobScraperService throws AppError(503) which the global error
 * handler returns as 503 — we never fall back to dummy jobs.
 */

import * as jobScraper from "../services/jobScraperService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// GET /api/jobs/live  -> MS3 GET /jobs
export const listLiveJobs = asyncHandler(async (req, res) => {
  const data = await jobScraper.getJobs(req.query);
  return sendSuccess(res, {
    statusCode: 200,
    message: "Live jobs fetched from Job Scraper",
    data,
  });
});

// GET /api/jobs/search -> MS3 GET /jobs/search
export const searchLiveJobs = asyncHandler(async (req, res) => {
  const data = await jobScraper.searchJobs(req.query);
  return sendSuccess(res, {
    statusCode: 200,
    message: "Live job search results from Job Scraper",
    data,
  });
});

// GET /api/jobs/latest -> MS3 GET /jobs/latest
export const latestLiveJobs = asyncHandler(async (req, res) => {
  const data = await jobScraper.latestJobs(req.query);
  return sendSuccess(res, {
    statusCode: 200,
    message: "Latest live jobs from Job Scraper",
    data,
  });
});

// GET /api/jobs/scraper/health -> MS3 GET /health
export const scraperHealth = asyncHandler(async (req, res) => {
  const data = await jobScraper.health();
  return sendSuccess(res, {
    statusCode: data.ok ? 200 : 503,
    message: data.ok ? "Job Scraper is healthy" : "Job Scraper is unavailable",
    data,
  });
});
