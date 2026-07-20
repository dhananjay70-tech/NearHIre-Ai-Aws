/**
 * applicationRepository.js — Raw SQL for applications table.
 */

import pool from '../config/db.js';

const APPLICATION_SELECT = `
  SELECT
    a.id,
    a.status,
    a.notes,
    a.applied_at,
    a.updated_at,

    j.id     AS job_id,
    j.title  AS job_title,
    j.city   AS job_city,
    j.state  AS job_state,
    j.job_type,
    j.work_mode,
    j.salary_min,
    j.salary_max,
    j.salary_period,
    j.application_url,
    j.source_name,
    j.source_label,

    c.id   AS company_id,
    c.name AS company_name,
    c.website_url AS company_website,
    c.logo_url    AS company_logo,
    c.is_verified AS company_verified

  FROM applications a
  JOIN jobs j      ON j.id = a.job_id
  JOIN companies c ON c.id = j.company_id
`;

const ALLOWED_STATUSES = ['APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN'];

/**
 * Create a new application. Throws 23505 on duplicate.
 */
export async function createApplication(userId, jobId, status = 'APPLIED', notes = null) {
  const result = await pool.query(
    `INSERT INTO applications (user_id, job_id, status, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, jobId, status, notes]
  );
  return result.rows[0];
}

/**
 * Return all applications for a user with job + company details.
 */
export async function getApplicationsByUser(userId) {
  const result = await pool.query(
    `${APPLICATION_SELECT}
     WHERE a.user_id = $1
     ORDER BY a.applied_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Fetch a single application by id, asserting ownership.
 */
export async function getApplicationById(applicationId, userId) {
  const result = await pool.query(
    `${APPLICATION_SELECT}
     WHERE a.id = $1 AND a.user_id = $2`,
    [applicationId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Check whether an application exists for (userId, jobId).
 */
export async function findApplication(userId, jobId) {
  const result = await pool.query(
    `SELECT id, status FROM applications WHERE user_id = $1 AND job_id = $2`,
    [userId, jobId]
  );
  return result.rows[0] || null;
}

/**
 * Update status and/or notes for a user's application.
 */
export async function updateApplication(applicationId, userId, { status, notes }) {
  if (status && !ALLOWED_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(status);
  }
  if (notes !== undefined) {
    fields.push(`notes = $${idx++}`);
    values.push(notes);
  }

  if (fields.length === 0) return null;

  values.push(applicationId, userId);
  const result = await pool.query(
    `UPDATE applications SET ${fields.join(', ')}
     WHERE id = $${idx++} AND user_id = $${idx}
     RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Delete an application by id, asserting ownership.
 */
export async function deleteApplication(applicationId, userId) {
  const result = await pool.query(
    `DELETE FROM applications WHERE id = $1 AND user_id = $2`,
    [applicationId, userId]
  );
  return result.rowCount;
}

export { ALLOWED_STATUSES };
