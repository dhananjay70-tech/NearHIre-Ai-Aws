/**
 * adminController.js — Admin job dashboard + scraper controls.
 *
 * Powers the admin dashboard described in Step 17:
 *   Total jobs, jobs today, active jobs, expired jobs, per-source breakdown,
 *   scheduler status, and recent scrape-run logs (API/scraper status).
 */

import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { ALL_ROLES, normalizeRole } from "../utils/roles.js";
import * as userRepo from "../repositories/userRepository.js";
import { runScrapers } from "../scrapers/index.js";
import { schedulerState } from "../scrapers/scheduler.js";

export const getScraperStats = asyncHandler(async (req, res) => {
  const [
    totalsResult,
    perSourceResult,
    recentLogsResult,
    sourcesResult,
  ] = await Promise.all([
    // Aggregate job counts in a single scan.
    pool.query(`
      SELECT
        COUNT(*)                                                         AS total_jobs,
        COUNT(*) FILTER (WHERE is_active = TRUE)                         AS active_jobs,
        COUNT(*) FILTER (WHERE is_active = FALSE)                        AS expired_jobs,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)               AS jobs_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS jobs_this_week
      FROM jobs
    `),
    // Per-source breakdown (active vs total).
    pool.query(`
      SELECT
        source_name,
        source_label,
        COUNT(*)                                  AS total,
        COUNT(*) FILTER (WHERE is_active = TRUE)  AS active,
        MAX(created_at)                           AS last_added
      FROM jobs
      GROUP BY source_name, source_label
      ORDER BY total DESC
    `),
    // Most recent scrape runs (API/scraper status log).
    pool.query(`
      SELECT source_name, started_at, finished_at, jobs_found,
             jobs_inserted, jobs_skipped, jobs_failed, status, error_message
      FROM scrape_logs
      ORDER BY started_at DESC
      LIMIT 20
    `),
    // Registered sources.
    pool.query(`
      SELECT name, label, type, base_url, is_active
      FROM job_sources
      ORDER BY name ASC
    `),
  ]);

  const t = totalsResult.rows[0] || {};

  return sendSuccess(res, {
    statusCode: 200,
    message: "Scraper dashboard stats retrieved.",
    data: {
      totals: {
        totalJobs: Number(t.total_jobs || 0),
        activeJobs: Number(t.active_jobs || 0),
        expiredJobs: Number(t.expired_jobs || 0),
        jobsToday: Number(t.jobs_today || 0),
        jobsThisWeek: Number(t.jobs_this_week || 0),
      },
      perSource: perSourceResult.rows.map((r) => ({
        source: r.source_name,
        label: r.source_label,
        total: Number(r.total),
        active: Number(r.active),
        lastAdded: r.last_added,
      })),
      sources: sourcesResult.rows.map((r) => ({
        name: r.name,
        label: r.label,
        type: r.type,
        baseUrl: r.base_url,
        isActive: r.is_active,
      })),
      recentRuns: recentLogsResult.rows.map((r) => ({
        source: r.source_name,
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        jobsFound: r.jobs_found,
        jobsInserted: r.jobs_inserted,
        jobsSkipped: r.jobs_skipped,
        jobsFailed: r.jobs_failed,
        status: r.status,
        error: r.error_message,
      })),
      scheduler: {
        cronExpression: schedulerState.cronExpression,
        interval: schedulerState.intervalLabel,
        startedAt: schedulerState.startedAt,
        lastRunAt: schedulerState.lastRunAt,
        running: schedulerState.running,
        lastResult: schedulerState.lastResult,
      },
    },
  });
});

/**
 * POST /api/admin/scrape — manually trigger a scrape run (ADMIN only).
 * Useful for demos and on-demand refreshes without waiting for the cron.
 */
export const triggerScrape = asyncHandler(async (req, res) => {
  if (schedulerState.running) {
    return sendSuccess(res, {
      statusCode: 202,
      message: "A scrape is already in progress.",
      data: { running: true },
    });
  }

  schedulerState.running = true;
  schedulerState.lastRunAt = new Date();
  let result;
  try {
    result = await runScrapers();
    schedulerState.lastResult = result;
  } finally {
    schedulerState.running = false;
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "Manual scrape completed.",
    data: result,
  });
});

// ─── POST /api/admin/users — create a privileged account (ADMIN only) ────────
/**
 * Create a user with any role, including 'admin'.
 *
 * This is the ONLY way to create an admin through the API — public
 * registration rejects the admin role. Guarded by verifyAdmin at the route.
 */
export const createPrivilegedUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new AppError("name, email and password are required.", 400);
  }

  if (!ALL_ROLES.includes(normalizeRole(role))) {
    throw new AppError(
      `role must be one of: ${ALL_ROLES.join(", ")}.`,
      400
    );
  }

  const existing = await userRepo.findByEmail(String(email).toLowerCase().trim());
  if (existing) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await userRepo.createUser({
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    password_hash: passwordHash,
    role: normalizeRole(role),
  });

  await userRepo.createPreferences(user.id);

  return sendSuccess(res, {
    statusCode: 201,
    message: `Account created with role '${user.role}'.`,
    data: { user },
  });
});

// ─── GET /api/admin/stats — platform-wide totals ────────────────────────────
export const getPlatformStats = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)::int                              AS "totalUsers",
      (SELECT COUNT(*) FROM users WHERE role = 'RECRUITER')::int     AS "totalRecruiters",
      (SELECT COUNT(*) FROM users WHERE role = 'ADMIN')::int         AS "totalAdmins",
      (SELECT COUNT(*) FROM jobs)::int                               AS "totalJobs",
      (SELECT COUNT(*) FROM jobs WHERE is_active = TRUE)::int        AS "activeJobs",
      (SELECT COUNT(*) FROM companies)::int                          AS "totalCompanies",
      (SELECT COUNT(*) FROM applications)::int                       AS "totalApplications",
      (SELECT COUNT(*) FROM resumes)::int                            AS "totalResumes",
      (SELECT COUNT(*) FROM ai_chats)::int                           AS "totalAiChats",
      (SELECT COALESCE(SUM(total_views), 0) FROM jobs)::int          AS "totalViews",
      (SELECT COALESCE(SUM(unique_views), 0) FROM jobs)::int         AS "uniqueViews"
  `);

  return sendSuccess(res, {
    statusCode: 200,
    message: "Platform statistics fetched successfully",
    data: rows[0],
  });
});

// ─── GET /api/admin/users — list users ──────────────────────────────────────
export const listUsers = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const search = (req.query.search || "").trim();
  const role = req.query.role ? normalizeRole(req.query.role) : null;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }

  params.push(limit);

  const { rows } = await pool.query(
    `SELECT id, name, email, role, is_active, city, state, created_at
     FROM users
     ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: "Users fetched successfully",
    data: {
      users: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.is_active,
        city: u.city,
        state: u.state,
        createdAt: u.created_at,
      })),
    },
  });
});

// ─── PUT /api/admin/users/:userId — activate/deactivate or change role ──────
export const updateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { active, role } = req.body || {};

  if (active === undefined && role === undefined) {
    throw new AppError("Provide 'active' and/or 'role' to update.", 400);
  }

  // An admin must not be able to lock themselves out of the platform.
  if (active === false && userId === req.user.id) {
    throw new AppError("You cannot deactivate your own admin account.", 400);
  }

  const setParts = [];
  const params = [];

  if (active !== undefined) {
    params.push(Boolean(active));
    setParts.push(`is_active = $${params.length}`);
  }
  if (role !== undefined) {
    params.push(normalizeRole(role));
    setParts.push(`role = $${params.length}`);
  }

  params.push(userId);

  const { rows } = await pool.query(
    `UPDATE users SET ${setParts.join(", ")}, updated_at = NOW()
     WHERE id = $${params.length}
     RETURNING id, name, email, role, is_active`,
    params
  );

  if (rows.length === 0) {
    throw new AppError("User not found.", 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "User updated successfully",
    data: {
      user: { ...rows[0], active: rows[0].is_active },
    },
  });
});

// ─── GET /api/admin/jobs — list jobs for moderation ─────────────────────────
export const listAllJobs = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const search = (req.query.search || "").trim();

  const params = [];
  let where = "";

  if (search) {
    params.push(`%${search}%`);
    where = `WHERE j.title ILIKE $1 OR c.name ILIKE $1`;
  }

  params.push(limit);

  const { rows } = await pool.query(
    `SELECT j.id, j.title, j.city, j.state, j.job_type, j.is_active,
            j.posted_at, j.source_name, c.name AS company_name,
            j.total_views, j.unique_views, j.last_viewed_at,
            (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id)::int AS applications
     FROM jobs j
     LEFT JOIN companies c ON c.id = j.company_id
     ${where}
     ORDER BY j.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: "Jobs fetched successfully",
    data: {
      jobs: rows.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company_name,
        location: [j.city, j.state].filter(Boolean).join(", ") || "Remote",
        jobType: j.job_type,
        isActive: j.is_active,
        source: j.source_name,
        applications: j.applications,
        totalViews: j.total_views ?? 0,
        uniqueViews: j.unique_views ?? 0,
        lastViewedAt: j.last_viewed_at ?? null,
        postedAt: j.posted_at,
      })),
    },
  });
});

// ─── DELETE /api/admin/jobs/:jobId — remove a job ───────────────────────────
export const deleteJobAsAdmin = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const { rowCount } = await pool.query(`DELETE FROM jobs WHERE id = $1`, [jobId]);

  if (rowCount === 0) {
    throw new AppError("Job not found.", 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "Job deleted successfully",
    data: { id: jobId },
  });
});
