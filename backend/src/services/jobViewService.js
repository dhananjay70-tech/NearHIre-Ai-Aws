/**
 * jobViewService.js — Real job view tracking.
 *
 * Counting rules:
 *   - One view per viewer per cooldown window (default 24h). Refreshing the
 *     page inside that window does NOT increase the count.
 *   - A viewer is the signed-in user when available, otherwise a salted hash
 *     of their IP address. The raw IP is never stored.
 *   - `unique_views` increments only the first time a viewer ever opens a job.
 *
 * Concurrency: the whole read-modify-write happens inside ONE SQL statement
 * built from CTEs, so concurrent requests cannot double count or lose an
 * increment (no SELECT-then-UPDATE race).
 */

import crypto from "crypto";
import pool from "../config/db.js";
import { config } from "../config/config.js";

/** Hours a viewer is "cooled down" before another view is counted. */
export const VIEW_COOLDOWN_HOURS = Number(process.env.JOB_VIEW_COOLDOWN_HOURS) || 24;

/**
 * Build a stable, privacy-preserving key identifying the viewer.
 * Signed-in users are tracked by id; anonymous visitors by hashed IP.
 */
export function buildViewerKey(req) {
  const userId = req.user?.id || req.user?.userId;
  if (userId) return `u:${userId}`;

  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown";

  const hash = crypto
    .createHmac("sha256", config.jwtSecret)
    .update(String(ip))
    .digest("hex")
    .slice(0, 40);

  return `ip:${hash}`;
}

/**
 * Record a view for a job, honouring the cooldown window.
 *
 * @param {string} jobId
 * @param {string} viewerKey
 * @returns {Promise<{counted: boolean, isUnique: boolean, totalViews: number,
 *                    uniqueViews: number, lastViewedAt: Date|null}>}
 */
export async function recordJobView(jobId, viewerKey) {
  const { rows } = await pool.query(
    `
    WITH ledger AS (
      INSERT INTO job_views (job_id, viewer_key, view_count, first_viewed_at, last_viewed_at)
      -- Guarded by EXISTS so a missing job yields an empty result (-> 404)
      -- instead of a foreign-key violation.
      SELECT $1, $2, 1, NOW(), NOW()
      WHERE EXISTS (SELECT 1 FROM jobs WHERE id = $1)
      ON CONFLICT (job_id, viewer_key) DO UPDATE
        SET last_viewed_at = NOW(),
            view_count     = job_views.view_count + 1
        -- Skip the update entirely while the viewer is still cooling down,
        -- which makes the whole statement a no-op for a refresh.
        WHERE job_views.last_viewed_at < NOW() - ($3 * INTERVAL '1 hour')
      RETURNING (xmax = 0) AS is_unique
    ),
    bumped AS (
      UPDATE jobs
      SET total_views    = total_views + 1,
          unique_views   = unique_views
                           + (SELECT CASE WHEN l.is_unique THEN 1 ELSE 0 END FROM ledger l),
          last_viewed_at = NOW()
      WHERE id = $1 AND EXISTS (SELECT 1 FROM ledger)
      RETURNING total_views, unique_views, last_viewed_at
    )
    SELECT
      (SELECT COUNT(*) FROM ledger)::int > 0                AS counted,
      COALESCE((SELECT is_unique FROM ledger), FALSE)       AS is_unique,
      COALESCE((SELECT total_views  FROM bumped), j.total_views)  AS total_views,
      COALESCE((SELECT unique_views FROM bumped), j.unique_views) AS unique_views,
      COALESCE((SELECT last_viewed_at FROM bumped), j.last_viewed_at) AS last_viewed_at
    FROM jobs j
    WHERE j.id = $1
    `,
    [jobId, viewerKey, VIEW_COOLDOWN_HOURS]
  );

  const row = rows[0];
  if (!row) return null; // job does not exist

  return {
    counted: row.counted,
    isUnique: row.is_unique,
    totalViews: Number(row.total_views ?? 0),
    uniqueViews: Number(row.unique_views ?? 0),
    lastViewedAt: row.last_viewed_at,
    cooldownHours: VIEW_COOLDOWN_HOURS,
  };
}
