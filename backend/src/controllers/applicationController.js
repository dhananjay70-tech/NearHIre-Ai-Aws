/**
 * applicationController.js — HTTP handlers for applications.
 */

import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  trackApplication,
  getApplications,
  updateApplicationStatus,
  deleteApplicationRecord,
  ALLOWED_STATUSES,
} from '../services/applicationService.js';

/**
 * POST /api/applications
 * Body: { jobId, status?, notes? }
 */
export async function createApplicationHandler(req, res, next) {
  try {
    const { userId } = req.user;
    const { jobId, status, notes } = req.body;

    if (!jobId) {
      return sendError(res, { statusCode: 400, message: 'jobId is required.' });
    }

    const result = await trackApplication(userId, jobId, status, notes);

    if (!result.created) {
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Application already tracked.',
        data: { application: result.application, alreadyExists: true },
      });
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Application recorded successfully.',
      data: { application: result.application },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/applications
 */
export async function listApplications(req, res, next) {
  try {
    const { userId } = req.user;
    const applications = await getApplications(userId);
    return sendSuccess(res, {
      message: 'Applications retrieved successfully.',
      data: { applications, count: applications.length },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/applications/:id
 * Body: { status?, notes? }
 */
export async function updateApplicationHandler(req, res, next) {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { status, notes } = req.body;

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return sendError(res, {
        statusCode: 400,
        message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    const updated = await updateApplicationStatus(id, userId, { status, notes });

    return sendSuccess(res, {
      message: 'Application updated.',
      data: { application: updated },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/applications/:id
 */
export async function deleteApplicationHandler(req, res, next) {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    await deleteApplicationRecord(id, userId);

    return sendSuccess(res, { message: 'Application record deleted.' });
  } catch (err) {
    next(err);
  }
}
