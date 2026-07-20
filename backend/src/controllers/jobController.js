/**
 * jobController.js — HTTP handlers for job endpoints.
 */

import * as jobService from "../services/jobService.js";
import { geocodeCity } from "../services/geocodingService.js";
import { recordJobView, buildViewerKey } from "../services/jobViewService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const listJobs = asyncHandler(async (req, res) => {
  const result = await jobService.getJobs(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: "Jobs fetched successfully",
    data: result,
  });
});

export const listNearbyJobs = asyncHandler(async (req, res) => {
  const result = await jobService.getNearbyJobs(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: "Nearby jobs fetched successfully",
    data: result,
  });
});

export const geocode = asyncHandler(async (req, res) => {
  const { city, state, country } = req.query;

  const result = await geocodeCity(city, state, country);

  return sendSuccess(res, {
    statusCode: 200,
    message: "City geocoded successfully",
    data: result,
  });
});

export const getJob = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(
    req.params.id,
    req.query
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: "Job fetched successfully",
    data: {
      job,
    },
  });
});

/**
 * POST /api/jobs/:id/view — record that a job details page was opened.
 *
 * Public: anonymous visitors are counted by hashed IP. Repeat views inside the
 * cooldown window return `counted: false` and leave the totals unchanged.
 */
export const trackJobView = asyncHandler(async (req, res) => {
  const result = await recordJobView(req.params.id, buildViewerKey(req));

  if (!result) {
    throw new AppError("Job not found", 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: result.counted ? "View recorded" : "View already counted recently",
    data: result,
  });
});

export const createJob = asyncHandler(async (req, res) => {
  const job = await jobService.createJobRecord(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Job created successfully",
    data: {
      job,
    },
  });
});