/**
 * savedJobController.js — HTTP handlers for saved jobs.
 */

import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { saveJob, getSavedJobs, removeSavedJob } from '../services/savedJobService.js';

/**
 * POST /api/saved-jobs/:jobId
 */
export async function savejob(req, res, next) {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    if (!jobId) {
      return sendError(res, { statusCode: 400, message: 'jobId is required.' });
    }

    const result = await saveJob(userId, jobId);

    if (result.alreadySaved) {
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Job was already saved.',
        data: result,
      });
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Job saved successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/saved-jobs
 */
export async function listSavedJobs(req, res, next) {
  try {
    const { userId } = req.user;
    const jobs = await getSavedJobs(userId);
    return sendSuccess(res, {
      message: 'Saved jobs retrieved successfully.',
      data: { savedJobs: jobs, count: jobs.length },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/saved-jobs/:jobId
 */
export async function unsaveJob(req, res, next) {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    await removeSavedJob(userId, jobId);

    return sendSuccess(res, { message: 'Job removed from saved list.' });
  } catch (err) {
    next(err);
  }
}
