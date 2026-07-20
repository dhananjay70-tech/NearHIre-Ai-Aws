/**
 * recruiterService.js — Business logic for Recruiter Portal.
 */

import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { signToken } from '../utils/jwt.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { notifyApplicationStatusChange } from './notificationService.js';
import {
  JOB_TYPES,
  WORK_MODES,
  normalizeJobType,
  normalizeWorkMode,
  normalizeSalaryPeriod,
} from '../utils/jobEnums.js';

const SALT_ROUNDS = 12;

/**
 * The recruiter UI speaks a hiring-funnel vocabulary while the database uses
 * the `application_status` enum. Translate at the service boundary so neither
 * side has to know about the other's names.
 *
 * SHORTLISTED has no dedicated enum label, so it maps onto INTERVIEW.
 */
const DB_TO_UI_STATUS = {
  APPLIED: 'PENDING',
  INTERVIEW: 'INTERVIEW',
  OFFER: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
};

const UI_TO_DB_STATUS = {
  PENDING: 'APPLIED',
  APPLIED: 'APPLIED',
  SHORTLISTED: 'INTERVIEW',
  INTERVIEW: 'INTERVIEW',
  ACCEPTED: 'OFFER',
  OFFER: 'OFFER',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
};

/** Map a stored enum value to the label the recruiter UI expects. */
function toUiStatus(dbStatus) {
  return DB_TO_UI_STATUS[dbStatus] || dbStatus || 'PENDING';
}

/**
 * Register a new recruiter user.
 */
export async function registerRecruiter({ name, email, password, companyName, industry, phone }) {
  const cleanEmail = email.toLowerCase().trim();

  // Check if account exists
  const existingUserRes = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existingUserRes.rows.length > 0) {
    throw new AppError('An account with this email already exists.', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Begin transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create user
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, phone, profile_image_url AS "profileImageUrl", created_at AS "createdAt"`,
      [name.trim(), cleanEmail, passwordHash, ROLES.RECRUITER, phone || null]
    );
    const user = userRes.rows[0];

    // Create or find company if companyName supplied
    let companyId = null;
    if (companyName && companyName.trim()) {
      const companyRes = await client.query(
        'SELECT id FROM companies WHERE LOWER(name) = LOWER($1)',
        [companyName.trim()]
      );

      if (companyRes.rows.length > 0) {
        companyId = companyRes.rows[0].id;
      } else {
        const newCompanyRes = await client.query(
          `INSERT INTO companies (name, description, is_verified)
           VALUES ($1, $2, TRUE)
           RETURNING id`,
          [companyName.trim(), industry ? `Industry: ${industry}` : null]
        );
        companyId = newCompanyRes.rows[0].id;
      }
    }

    await client.query('COMMIT');

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user: { ...user, companyId }, token };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get stats for Recruiter Dashboard.
 */
export async function getDashboardStats(recruiterId) {
  // Count jobs
  const jobsStatsRes = await pool.query(
    `SELECT
       COUNT(*)::int AS total_jobs,
       COUNT(*) FILTER (
         WHERE is_active = TRUE
           AND (expires_at IS NULL OR expires_at > NOW())
       )::int AS active_jobs,
       COUNT(*) FILTER (
         WHERE is_active = FALSE
            OR (expires_at IS NOT NULL AND expires_at <= NOW())
       )::int AS expired_jobs,
       COALESCE(SUM(total_views), 0)::int  AS total_views,
       COALESCE(SUM(unique_views), 0)::int AS unique_views
     FROM jobs
     WHERE recruiter_id = $1`,
    [recruiterId]
  );

  const {
    total_jobs = 0,
    active_jobs = 0,
    expired_jobs = 0,
    total_views = 0,
    unique_views = 0,
  } = jobsStatsRes.rows[0] || {};

  // Count applicants
  const appStatsRes = await pool.query(
    `SELECT
       COUNT(a.id)::int AS total_applicants,
       COUNT(a.id) FILTER (WHERE a.status IN ('INTERVIEW', 'OFFER'))::int AS shortlisted
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.recruiter_id = $1`,
    [recruiterId]
  );
  const totalApplicants = appStatsRes.rows[0]?.total_applicants || 0;
  const shortlisted = appStatsRes.rows[0]?.shortlisted || 0;

  // Recent applicants
  const recentRes = await pool.query(
    `SELECT 
       a.id AS id,
       a.status AS status,
       a.applied_at AS "appliedAt",
       a.notes AS notes,
       u.name AS "applicantName",
       u.email AS "applicantEmail",
       j.id AS "jobId",
       j.title AS "jobTitle"
     FROM applications a
     JOIN users u ON u.id = a.user_id
     JOIN jobs j ON j.id = a.job_id
     WHERE j.recruiter_id = $1
     ORDER BY a.applied_at DESC
     LIMIT 10`,
    [recruiterId]
  );

  return {
    totalJobs: total_jobs,
    activeJobs: active_jobs,
    expiredJobs: expired_jobs,
    // The dashboard stat card reads `applications`; `totalApplicants` is kept
    // as an alias so existing callers keep working.
    applications: totalApplicants,
    totalApplicants,
    shortlisted,
    // Real aggregated view counts across this recruiter's jobs.
    totalViews: total_views,
    uniqueViews: unique_views,
    recentApplicants: recentRes.rows.map((r) => ({
      ...r,
      status: toUiStatus(r.status),
    })),
  };
}

/**
 * List jobs posted by recruiter.
 */
export async function getRecruiterJobs(recruiterId, options = {}) {
  const { search = '', status = '', jobType = '', page, limit, sortBy = '' } = options;

  const filters = [];
  const params = [recruiterId];

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    filters.push(`(j.title ILIKE $${params.length} OR j.city ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }

  const normalizedType = jobType ? normalizeJobType(jobType) : null;
  if (normalizedType) {
    params.push(normalizedType);
    filters.push(`j.job_type = $${params.length}`);
  }

  const st = String(status || '').toUpperCase();
  if (st === 'ACTIVE' || st === 'PUBLISHED') {
    filters.push(`j.is_active = TRUE AND (j.expires_at IS NULL OR j.expires_at > NOW())`);
  } else if (st === 'CLOSED' || st === 'DRAFT' || st === 'ARCHIVED') {
    filters.push(`j.is_active = FALSE`);
  } else if (st === 'EXPIRED') {
    filters.push(`j.expires_at IS NOT NULL AND j.expires_at <= NOW()`);
  }

  const where = `WHERE j.recruiter_id = $1${filters.length ? ' AND ' + filters.join(' AND ') : ''}`;

  const ORDER = {
    views: 'j.total_views DESC',
    applicants: 'COUNT(a.id) DESC',
    title: 'j.title ASC',
    oldest: 'j.created_at ASC',
  };
  const orderBy = ORDER[String(sortBy)] || 'j.created_at DESC';

  // Total before pagination so the UI can page correctly.
  const countRes = await pool.query(
    `SELECT COUNT(DISTINCT j.id)::int AS total
     FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
     ${where}`,
    params
  );
  const total = countRes.rows[0]?.total ?? 0;

  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  const usePaging = page !== undefined || limit !== undefined;

  let paging = '';
  if (usePaging) {
    params.push(parsedLimit, (parsedPage - 1) * parsedLimit);
    paging = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const res = await pool.query(
    `SELECT 
       j.id,
       j.title,
       j.description,
       j.requirements,
       j.experience_min AS "experienceMin",
       j.experience_max AS "experienceMax",
       j.salary_min AS "salaryMin",
       j.salary_max AS "salaryMax",
       j.salary_period AS "salaryPeriod",
       j.job_type AS "jobType",
       j.work_mode AS "workMode",
       j.address,
       j.city,
       j.state,
       j.postal_code AS "postalCode",
       j.latitude,
       j.longitude,
       j.application_url AS "applicationUrl",
       j.is_active AS "isActive",
       j.total_views AS "totalViews",
       j.unique_views AS "uniqueViews",
       j.last_viewed_at AS "lastViewedAt",
       j.expires_at AS "expiresAt",
       j.salary_min AS "salaryMinValue",
       j.salary_max AS "salaryMaxValue",
       j.created_at AS "createdAt",
       c.id AS "companyId",
       c.name AS "companyName",
       c.logo_url AS "companyLogo",
       COUNT(a.id)::int AS "applicantCount"
     FROM jobs j
     LEFT JOIN companies c ON c.id = j.company_id
     LEFT JOIN applications a ON a.job_id = j.id
     ${where}
     GROUP BY j.id, c.id
     ORDER BY ${orderBy}
     ${paging}`,
    params
  );

  // Add the display fields the recruiter UI reads directly.
  const jobs = res.rows.map((job) => {
    const expired = job.expiresAt ? new Date(job.expiresAt) < new Date() : false;
    return {
      ...job,
      location: [job.city, job.state].filter(Boolean).join(', ') || 'Remote',
      company: job.companyName,
      applications: job.applicantCount,
      totalViews: job.totalViews ?? 0,
      status: !job.isActive ? 'Closed' : expired ? 'Expired' : 'Active',
    };
  });

  return {
    jobs,
    pagination: {
      page: usePaging ? parsedPage : 1,
      limit: usePaging ? parsedLimit : total,
      total,
      totalPages: usePaging ? Math.max(Math.ceil(total / parsedLimit), 1) : 1,
    },
  };
}

/**
 * Post a new job as recruiter.
 */
export async function postJob(recruiterId, jobData) {
  const {
    title,
    description,
    requirements = '',
    companyName = 'NearHire Partner',
    experienceMin = 0,
    experienceMax = 5,
    salaryMin = 300000,
    salaryMax = 800000,
    salaryPeriod = 'YEAR',
    jobType = 'FULL_TIME',
    workMode = 'HYBRID',
    city = 'Bengaluru',
    state = 'Karnataka',
    address = '',
    postalCode = '',
    latitude = 12.9716,
    longitude = 77.5946,
    applicationUrl = 'https://nearhire.ai',
  } = jobData;

  // ── Validation: fail with a friendly message, never a raw enum error ──
  if (!title || !String(title).trim()) {
    throw new AppError('Job title is required.', 400);
  }
  if (!description || !String(description).trim()) {
    throw new AppError('Job description is required.', 400);
  }

  const safeJobType = normalizeJobType(jobType) || 'FULL_TIME';
  const safeWorkMode = normalizeWorkMode(workMode) || 'ONSITE';
  const safeSalaryPeriod = normalizeSalaryPeriod(salaryPeriod) || 'YEAR';

  if (jobType && !normalizeJobType(jobType)) {
    throw new AppError(
      `Invalid job type "${jobType}". Allowed: ${JOB_TYPES.join(', ')}.`,
      400
    );
  }
  if (workMode && !normalizeWorkMode(workMode)) {
    throw new AppError(
      `Invalid work mode "${workMode}". Allowed: ${WORK_MODES.join(', ')}.`,
      400
    );
  }

  const minSal = salaryMin === '' || salaryMin == null ? null : Number(salaryMin);
  const maxSal = salaryMax === '' || salaryMax == null ? null : Number(salaryMax);
  if (minSal !== null && maxSal !== null && minSal > maxSal) {
    throw new AppError('Minimum salary cannot be greater than maximum salary.', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure company exists
    let companyId;
    const compRes = await client.query('SELECT id FROM companies WHERE LOWER(name) = LOWER($1)', [companyName.trim()]);
    if (compRes.rows.length > 0) {
      companyId = compRes.rows[0].id;
    } else {
      const newComp = await client.query(
        'INSERT INTO companies (name, is_verified) VALUES ($1, TRUE) RETURNING id',
        [companyName.trim()]
      );
      companyId = newComp.rows[0].id;
    }

    // Insert job
    const jobRes = await client.query(
      `INSERT INTO jobs (
         recruiter_id, company_id, title, description, requirements,
         experience_min, experience_max, salary_min, salary_max, salary_period,
         job_type, work_mode, city, state, address, postal_code, latitude, longitude,
         application_url, source_name, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'Recruiter Direct', TRUE)
       RETURNING *`,
      [
        recruiterId,
        companyId,
        title.trim(),
        description.trim(),
        requirements || null,
        Number(experienceMin) || 0,
        experienceMax ? Number(experienceMax) : null,
        salaryMin ? Number(salaryMin) : null,
        salaryMax ? Number(salaryMax) : null,
        safeSalaryPeriod,
        safeJobType,
        safeWorkMode,
        city,
        state,
        address || null,
        postalCode || null,
        latitude ? Number(latitude) : null,
        longitude ? Number(longitude) : null,
        applicationUrl || 'https://nearhire.ai',
      ]
    );

    await client.query('COMMIT');
    return jobRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update an existing job.
 */
export async function updateJob(recruiterId, jobId, jobData = {}) {
  const {
    title, description, requirements, city, state, address, postalCode,
    jobType, workMode, salaryPeriod, salaryMin, salaryMax,
    experienceMin, experienceMax, latitude, longitude,
    deadline, expiresAt, isActive,
  } = jobData;

  // Validate enums up front so the user sees a friendly message rather than a
  // raw Postgres "invalid input value for enum" error.
  let safeJobType = null;
  if (jobType !== undefined && jobType !== null && jobType !== '') {
    safeJobType = normalizeJobType(jobType);
    if (!safeJobType) {
      throw new AppError(
        `Invalid job type "${jobType}". Allowed: ${JOB_TYPES.join(', ')}.`,
        400
      );
    }
  }

  let safeWorkMode = null;
  if (workMode !== undefined && workMode !== null && workMode !== '') {
    safeWorkMode = normalizeWorkMode(workMode);
    if (!safeWorkMode) {
      throw new AppError(
        `Invalid work mode "${workMode}". Allowed: ${WORK_MODES.join(', ')}.`,
        400
      );
    }
  }

  const safeSalaryPeriod =
    salaryPeriod === undefined || salaryPeriod === null || salaryPeriod === ''
      ? null
      : normalizeSalaryPeriod(salaryPeriod);

  const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

  const minSal = num(salaryMin);
  const maxSal = num(salaryMax);
  if (minSal !== null && maxSal !== null && minSal > maxSal) {
    throw new AppError('Minimum salary cannot be greater than maximum salary.', 400);
  }

  const res = await pool.query(
    `UPDATE jobs
     SET title          = COALESCE($1,  title),
         description    = COALESCE($2,  description),
         requirements   = COALESCE($3,  requirements),
         city           = COALESCE($4,  city),
         state          = COALESCE($5,  state),
         address        = COALESCE($6,  address),
         postal_code    = COALESCE($7,  postal_code),
         job_type       = COALESCE($8,  job_type),
         work_mode      = COALESCE($9,  work_mode),
         salary_period  = COALESCE($10, salary_period),
         salary_min     = COALESCE($11, salary_min),
         salary_max     = COALESCE($12, salary_max),
         experience_min = COALESCE($13, experience_min),
         experience_max = COALESCE($14, experience_max),
         latitude       = COALESCE($15, latitude),
         longitude      = COALESCE($16, longitude),
         expires_at     = COALESCE($17, expires_at),
         is_active      = COALESCE($18, is_active),
         updated_at     = CURRENT_TIMESTAMP
     WHERE id = $19 AND recruiter_id = $20
     RETURNING *`,
    [
      title || null,
      description || null,
      requirements || null,
      city || null,
      state || null,
      address || null,
      postalCode || null,
      safeJobType,
      safeWorkMode,
      safeSalaryPeriod,
      minSal,
      maxSal,
      num(experienceMin),
      num(experienceMax),
      num(latitude),
      num(longitude),
      deadline || expiresAt || null,
      typeof isActive === 'boolean' ? isActive : null,
      jobId,
      recruiterId,
    ]
  );

  if (res.rows.length === 0) {
    throw new AppError('Job not found, or you do not have access to it.', 404);
  }

  return res.rows[0];
}

/**
 * Fetch a single job owned by this recruiter (for the edit form).
 */
export async function getRecruiterJobById(recruiterId, jobId) {
  const res = await pool.query(
    `SELECT j.*, c.name AS "companyName",
            (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id)::int AS "applicantCount"
     FROM jobs j
     LEFT JOIN companies c ON c.id = j.company_id
     WHERE j.id = $1 AND j.recruiter_id = $2`,
    [jobId, recruiterId]
  );

  if (res.rows.length === 0) {
    throw new AppError('Job not found, or you do not have access to it.', 404);
  }

  const j = res.rows[0];
  return {
    ...j,
    jobType: j.job_type,
    workMode: j.work_mode,
    salaryPeriod: j.salary_period,
    salaryMin: j.salary_min,
    salaryMax: j.salary_max,
    experienceMin: j.experience_min,
    experienceMax: j.experience_max,
    postalCode: j.postal_code,
    isActive: j.is_active,
    totalViews: j.total_views ?? 0,
    uniqueViews: j.unique_views ?? 0,
    location: [j.city, j.state].filter(Boolean).join(', ') || 'Remote',
  };
}

// ─── Company ────────────────────────────────────────────────────────────────

/**
 * Get the company profile linked to this recruiter.
 * Falls back to the company used by their most recent job, and self-heals the
 * users.company_id link when it is missing.
 */
export async function getRecruiterCompany(recruiterId) {
  let res = await pool.query(
    `SELECT c.* FROM companies c
     JOIN users u ON u.company_id = c.id
     WHERE u.id = $1`,
    [recruiterId]
  );

  if (res.rows.length === 0) {
    // Fall back to the company on their most recent job, then persist the link.
    const fallback = await pool.query(
      `SELECT c.* FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE j.recruiter_id = $1
       ORDER BY j.created_at DESC
       LIMIT 1`,
      [recruiterId]
    );

    if (fallback.rows.length > 0) {
      await pool.query(`UPDATE users SET company_id = $1 WHERE id = $2`, [
        fallback.rows[0].id,
        recruiterId,
      ]);
      res = fallback;
    }
  }

  if (res.rows.length === 0) return null;

  const c = res.rows[0];
  const stats = await pool.query(
    `SELECT COUNT(*)::int AS "totalJobs",
            COUNT(*) FILTER (WHERE is_active)::int AS "activeJobs"
     FROM jobs WHERE company_id = $1 AND recruiter_id = $2`,
    [c.id, recruiterId]
  );

  return {
    id: c.id,
    name: c.name,
    description: c.description,
    websiteUrl: c.website_url,
    logoUrl: c.logo_url,
    address: c.address,
    city: c.city,
    state: c.state,
    postalCode: c.postal_code,
    latitude: c.latitude,
    longitude: c.longitude,
    isVerified: c.is_verified,
    createdAt: c.created_at,
    ...stats.rows[0],
  };
}

/**
 * Create or update the recruiter's company profile.
 */
export async function upsertRecruiterCompany(recruiterId, data = {}) {
  const { name, description, websiteUrl, logoUrl, address, city, state, postalCode } = data;

  const existing = await getRecruiterCompany(recruiterId);

  if (!existing) {
    if (!name || !String(name).trim()) {
      throw new AppError('Company name is required.', 400);
    }

    const created = await pool.query(
      `INSERT INTO companies (name, description, website_url, logo_url, address, city, state, postal_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        String(name).trim(), description || null, websiteUrl || null, logoUrl || null,
        address || null, city || null, state || null, postalCode || null,
      ]
    );

    await pool.query(`UPDATE users SET company_id = $1 WHERE id = $2`, [
      created.rows[0].id,
      recruiterId,
    ]);

    return getRecruiterCompany(recruiterId);
  }

  if (name !== undefined && !String(name).trim()) {
    throw new AppError('Company name cannot be empty.', 400);
  }

  await pool.query(
    `UPDATE companies
     SET name        = COALESCE($1, name),
         description = COALESCE($2, description),
         website_url = COALESCE($3, website_url),
         logo_url    = COALESCE($4, logo_url),
         address     = COALESCE($5, address),
         city        = COALESCE($6, city),
         state       = COALESCE($7, state),
         postal_code = COALESCE($8, postal_code),
         updated_at  = CURRENT_TIMESTAMP
     WHERE id = $9`,
    [
      name ? String(name).trim() : null,
      description ?? null, websiteUrl ?? null, logoUrl ?? null,
      address ?? null, city ?? null, state ?? null, postalCode ?? null,
      existing.id,
    ]
  );

  return getRecruiterCompany(recruiterId);
}

/**
 * Delete a job.
 */
export async function deleteJob(recruiterId, jobId) {
  const res = await pool.query(
    `DELETE FROM jobs
     WHERE id = $1 AND recruiter_id = $2
     RETURNING id`,
    [jobId, recruiterId]
  );

  if (res.rows.length === 0) {
    throw new AppError('Job not found or access denied.', 404);
  }

  return { success: true, message: 'Job deleted successfully.' };
}

/**
 * Get applicants for recruiter.
 */
export async function getApplicants(recruiterId, jobId = null, options = {}) {
  // Scoped strictly to jobs this recruiter owns. Rows with a NULL recruiter_id
  // are aggregated/scraped jobs and must never be exposed here.
  let query = `
    SELECT
      a.id AS "id",
      a.status AS status,
      a.notes AS notes,
      a.applied_at AS "appliedAt",
      u.id AS "candidateId",
      u.name AS "candidateName",
      u.email AS "email",
      u.phone AS "candidatePhone",
      u.city AS "candidateCity",
      j.id AS "jobId",
      j.title AS "jobTitle",
      r.ats_score AS "atsScore"
    FROM applications a
    JOIN users u ON u.id = a.user_id
    JOIN jobs j ON j.id = a.job_id
    LEFT JOIN LATERAL (
      SELECT ats_score FROM resumes
      WHERE user_id = u.id
      ORDER BY analyzed_at DESC NULLS LAST, uploaded_at DESC
      LIMIT 1
    ) r ON TRUE
    WHERE j.recruiter_id = $1
  `;

  const params = [recruiterId];
  if (jobId) {
    params.push(jobId);
    query += ` AND j.id = $2`;
  }

  // Optional search / status filter / sorting / pagination.
  const { search = '', status = '', sortBy = '', page, limit } = options;

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    query += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR j.title ILIKE $${params.length})`;
  }

  if (status && String(status).toUpperCase() !== 'ALL') {
    const dbStatus = UI_TO_DB_STATUS[String(status).toUpperCase()];
    if (dbStatus) {
      params.push(dbStatus);
      query += ` AND a.status = $${params.length}`;
    }
  }

  const ORDER = {
    oldest: 'a.applied_at ASC',
    name: 'u.name ASC',
    ats: 'r.ats_score DESC NULLS LAST',
    status: 'a.status ASC',
  };
  query += ` ORDER BY ${ORDER[String(sortBy)] || 'a.applied_at DESC'}`;

  const usePaging = page !== undefined || limit !== undefined;
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);

  if (usePaging) {
    params.push(parsedLimit, (parsedPage - 1) * parsedLimit);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const res = await pool.query(query, params);

  const applicants = res.rows.map((row) => ({
    ...row,
    // Present the recruiter-facing vocabulary the UI uses.
    status: toUiStatus(row.status),
    // Not tracked yet — returned as null rather than invented.
    matchScore: null,
    resumeUrl: null,
  }));

  return { applicants, total: applicants.length };
}

/**
 * Update application status.
 */
export async function updateApplicantStatus(recruiterId, applicationId, status) {
  const dbStatus = UI_TO_DB_STATUS[String(status || '').toUpperCase()];

  if (!dbStatus) {
    throw new AppError(
      `Invalid status. Must be one of: ${Object.keys(UI_TO_DB_STATUS).join(', ')}`,
      400
    );
  }

  // The join to jobs is the authorization check: a recruiter can only change
  // applications made to their OWN jobs.
  const res = await pool.query(
    `UPDATE applications a
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     FROM jobs j
     WHERE a.job_id = j.id
       AND a.id = $2
       AND j.recruiter_id = $3
     RETURNING a.*, j.title AS job_title`,
    [dbStatus, applicationId, recruiterId]
  );

  if (res.rows.length === 0) {
    throw new AppError(
      'Application not found, or you do not have access to it.',
      404
    );
  }

  const row = res.rows[0];
  const uiStatus = String(status).toUpperCase();

  // Tell the candidate their application moved. Best-effort — never blocks.
  await notifyApplicationStatusChange({
    candidateId: row.user_id,
    uiStatus,
    jobTitle: row.job_title,
    jobId: row.job_id,
    applicationId: row.id,
  });

  return { ...row, status: toUiStatus(row.status) };
}

/**
 * Get recruiter analytics summary.
 */
export async function getRecruiterAnalytics(recruiterId) {
  const statusDist = await pool.query(
    `SELECT a.status, COUNT(a.id)::int AS count
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.recruiter_id = $1
     GROUP BY a.status`,
    [recruiterId]
  );

  const topJobs = await pool.query(
    `SELECT j.id, j.title, COUNT(a.id)::int AS applicants,
            j.total_views AS "totalViews",
            j.unique_views AS "uniqueViews",
            j.last_viewed_at AS "lastViewedAt"
     FROM jobs j
     LEFT JOIN applications a ON a.job_id = j.id
     WHERE j.recruiter_id = $1
     GROUP BY j.id
     ORDER BY applicants DESC
     LIMIT 5`,
    [recruiterId]
  );

  // Most-viewed jobs — ranked by real view counts, not applications.
  const mostViewed = await pool.query(
    `SELECT j.id, j.title,
            j.total_views AS "totalViews",
            j.unique_views AS "uniqueViews",
            j.last_viewed_at AS "lastViewedAt"
     FROM jobs j
     WHERE j.recruiter_id = $1
     ORDER BY j.total_views DESC, j.created_at DESC
     LIMIT 5`,
    [recruiterId]
  );

  const viewTotals = await pool.query(
    `SELECT COALESCE(SUM(total_views), 0)::int  AS "totalViews",
            COALESCE(SUM(unique_views), 0)::int AS "uniqueViews",
            MAX(last_viewed_at)                 AS "lastViewedAt"
     FROM jobs WHERE recruiter_id = $1`,
    [recruiterId]
  );

  const totals = viewTotals.rows[0] || {};

  return {
    statusDistribution: statusDist.rows.map((r) => ({
      ...r,
      status: toUiStatus(r.status),
    })),
    topPerformingJobs: topJobs.rows,
    mostViewedJobs: mostViewed.rows,
    totalViews: totals.totalViews ?? 0,
    uniqueViews: totals.uniqueViews ?? 0,
    lastViewedAt: totals.lastViewedAt ?? null,
  };
}
