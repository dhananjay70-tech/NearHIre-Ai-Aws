/**
 * notificationService.js — Create in-app notifications.
 *
 * Notifications are always best-effort: a failure here must never break the
 * business action that triggered it (e.g. a recruiter updating an applicant's
 * status must still succeed if the notification insert fails).
 */

import pool from "../config/db.js";

/**
 * Insert a notification for a user.
 *
 * @param {string} userId
 * @param {{type?: string, title: string, body?: string, metadata?: object}} payload
 * @returns {Promise<object|null>} the created row, or null if it could not be stored
 */
export async function createNotification(userId, { type = "INFO", title, body = null, metadata = null }) {
  if (!userId || !title) return null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, type, title, body, is_read, metadata, created_at`,
      [userId, type, title, body, metadata ? JSON.stringify(metadata) : null]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("[Notifications] Failed to create notification:", error.message);
    return null;
  }
}

/** Human-readable copy for each application status the recruiter can set. */
const STATUS_COPY = {
  PENDING: {
    type: "INFO",
    title: "Application received",
    body: (job) => `Your application for "${job}" is now under review.`,
  },
  SHORTLISTED: {
    type: "SUCCESS",
    title: "You've been shortlisted!",
    body: (job) => `Great news — you were shortlisted for "${job}".`,
  },
  INTERVIEW: {
    type: "SUCCESS",
    title: "Interview scheduled",
    body: (job) => `You've been moved to the interview stage for "${job}".`,
  },
  ACCEPTED: {
    type: "SUCCESS",
    title: "Offer extended 🎉",
    body: (job) => `Congratulations! Your application for "${job}" was accepted.`,
  },
  REJECTED: {
    type: "WARNING",
    title: "Application update",
    body: (job) => `Your application for "${job}" was not taken forward this time.`,
  },
  WITHDRAWN: {
    type: "INFO",
    title: "Application withdrawn",
    body: (job) => `Your application for "${job}" has been withdrawn.`,
  },
};

/**
 * Notify a candidate that a recruiter changed their application status.
 *
 * @param {{candidateId: string, uiStatus: string, jobTitle: string, jobId?: string, applicationId?: string}} params
 */
export async function notifyApplicationStatusChange({
  candidateId,
  uiStatus,
  jobTitle,
  jobId,
  applicationId,
}) {
  const copy = STATUS_COPY[uiStatus];
  if (!copy) return null;

  return createNotification(candidateId, {
    type: copy.type,
    title: copy.title,
    body: copy.body(jobTitle || "a role"),
    metadata: { jobId, applicationId, status: uiStatus },
  });
}
