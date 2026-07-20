/**
 * savedJobRepository.js — Raw SQL for saved_jobs table.
 */

import pool from '../config/db.js';

const SAVED_JOB_SELECT = `
  SELECT
    sj.id AS saved_id,
    sj.created_at AS saved_at,

    j.id,
    j.title,
    j.description,
    j.job_type,
    j.work_mode,
    j.city,
    j.state,
    j.salary_min,
    j.salary_max,
    j.salary_period,
    j.experience_min,
    j.experience_max,
    j.posted_at,
    j.application_url,
    j.source_name,
    j.source_label,
    j.latitude,
    j.longitude,

    c.id   AS company_id,
    c.name AS company_name,
    c.website_url AS company_website,
    c.logo_url    AS company_logo,
    c.is_verified AS company_verified,

    COALESCE(
      JSON_AGG(
        DISTINCT JSONB_BUILD_OBJECT(
          'id', s.id,
          'name', s.name,
          'normalizedName', s.normalized_name,
          'importance', js.importance
        )
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS skills

  FROM saved_jobs sj
  JOIN jobs j        ON j.id = sj.job_id
  JOIN companies c   ON c.id = j.company_id
  LEFT JOIN job_skills js ON js.job_id = j.id
  LEFT JOIN skills s      ON s.id = js.skill_id
`;

/**
 * Save a job for a user. Returns the saved_jobs row.
 * Throws 23505 (unique violation) on duplicate.
 */
export async function createSavedJob(userId, jobId) {
  const result = await pool.query(
    `INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2) RETURNING *`,
    [userId, jobId]
  );
  return result.rows[0];
}

/**
 * Return all saved jobs for a user, with full job card data.
 */
export async function getSavedJobsByUser(userId) {
  const result = await pool.query(
    `${SAVED_JOB_SELECT}
     WHERE sj.user_id = $1
     GROUP BY sj.id, j.id, c.id
     ORDER BY sj.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Check whether a user already saved a specific job.
 */
export async function findSavedJob(userId, jobId) {
  const result = await pool.query(
    `SELECT id FROM saved_jobs WHERE user_id = $1 AND job_id = $2`,
    [userId, jobId]
  );
  return result.rows[0] || null;
}

/**
 * Delete a saved job by (userId, jobId). Returns number of deleted rows.
 */
export async function deleteSavedJob(userId, jobId) {
  const result = await pool.query(
    `DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2`,
    [userId, jobId]
  );
  return result.rowCount;
}
