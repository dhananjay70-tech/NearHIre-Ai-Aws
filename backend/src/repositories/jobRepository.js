/**
 * jobRepository.js — Raw SQL queries for jobs.
 * All queries use parameterized SQL.
 */

import pool from "../config/db.js";

const globalSkillCache = new Map();

const JOB_SELECT = `
  SELECT
    j.id,
    j.title,
    j.description,
    j.requirements,
    j.experience_min,
    j.experience_max,
    j.salary_min,
    j.salary_max,
    j.salary_period,
    j.job_type,
    j.work_mode,
    j.address,
    j.city,
    j.state,
    j.postal_code,
    j.latitude,
    j.longitude,
    j.application_url,
    j.source_name,
    j.source_job_id,
    j.source_label,
    j.posted_at,
    j.expires_at,
    j.is_active,
    j.created_at,
    j.total_views,
    j.unique_views,
    j.last_viewed_at,

    c.id AS company_id,
    c.name AS company_name,
    c.website_url AS company_website,
    c.logo_url AS company_logo,
    c.is_verified AS company_verified,

    COALESCE(
      JSON_AGG(
        DISTINCT JSONB_BUILD_OBJECT(
          'id', s.id,
          'name', s.name,
          'normalizedName', s.normalized_name,
          'category', s.category,
          'importance', js.importance
        )
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS skills

  FROM jobs j
  JOIN companies c ON c.id = j.company_id
  LEFT JOIN job_skills js ON js.job_id = j.id
  LEFT JOIN skills s ON s.id = js.skill_id
`;

const JOB_GROUP = `
  GROUP BY j.id, c.id
`;

function buildFilters(filters = {}) {
  const {
    search,
    city,
    state,
    jobType,
    workMode,
    minSalary,
    maxExperience,
    skill,
  } = filters;

  const conditions = ["j.is_active = TRUE"];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (search) {
    const placeholder = addParam(`%${search}%`);

    conditions.push(`
      (
        j.title ILIKE ${placeholder}
        OR c.name ILIKE ${placeholder}
        OR j.description ILIKE ${placeholder}
        OR EXISTS (
          SELECT 1
          FROM job_skills search_js
          JOIN skills search_s ON search_s.id = search_js.skill_id
          WHERE search_js.job_id = j.id
          AND search_s.name ILIKE ${placeholder}
        )
      )
    `);
  }

  if (city) {
    // "Sohna, Haryana" -> "Sohna"
    const cityOnly = city.split(",")[0].trim();

    const placeholder = addParam(`%${cityOnly}%`);

    conditions.push(`
    (
      j.city ILIKE ${placeholder}
      OR j.address ILIKE ${placeholder}
    )
  `);
  }

  if (state) {
    const placeholder = addParam(`%${state}%`);
    conditions.push(`j.state ILIKE ${placeholder}`);
  }

  if (jobType) {
    const placeholder = addParam(jobType);
    conditions.push(`j.job_type = ${placeholder}`);
  }

  if (workMode) {
    const placeholder = addParam(workMode);
    conditions.push(`j.work_mode = ${placeholder}`);
  }

  if (minSalary !== undefined && minSalary !== null) {
    const placeholder = addParam(Number(minSalary));

    conditions.push(`
      (
        j.salary_max >= ${placeholder}
        OR (
          j.salary_max IS NULL
          AND j.salary_min >= ${placeholder}
        )
      )
    `);
  }

  if (maxExperience !== undefined && maxExperience !== null) {
    const placeholder = addParam(Number(maxExperience));
    conditions.push(`j.experience_min <= ${placeholder}`);
  }

  if (skill) {
    const placeholder = addParam(`%${skill}%`);

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM job_skills filter_js
        JOIN skills filter_s ON filter_s.id = filter_js.skill_id
        WHERE filter_js.job_id = j.id
        AND filter_s.name ILIKE ${placeholder}
      )
    `);
  }

  return {
    whereClause: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

function getOrderBy(sortBy) {
  switch (sortBy) {
    case "salary_high":
      return "ORDER BY j.salary_max DESC NULLS LAST, j.posted_at DESC";

    case "salary_low":
      return "ORDER BY j.salary_min ASC NULLS LAST, j.posted_at DESC";

    case "title":
      return "ORDER BY j.title ASC";

    case "newest":
    default:
      return "ORDER BY j.posted_at DESC NULLS LAST";
  }
}

/**
 * Find jobs with filtering, sorting and pagination.
 */
export async function findJobs(filters) {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 50);

  const { whereClause, params } = buildFilters(filters);

  const countSql = `
    SELECT COUNT(DISTINCT j.id) AS total
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    ${whereClause}
  `;

  const countResult = await pool.query(countSql, params);
  const total = Number(countResult.rows[0].total);

  const orderBy = getOrderBy(filters.sortBy);
  const offset = (page - 1) * limit;

  const queryParams = [...params, limit, offset];
  const limitPlaceholder = `$${queryParams.length - 1}`;
  const offsetPlaceholder = `$${queryParams.length}`;

  const dataSql = `
    ${JOB_SELECT}
    ${whereClause}
    ${JOB_GROUP}
    ${orderBy}
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}
  `;

  const result = await pool.query(dataSql, queryParams);

  return {
    rows: result.rows,
    total,
  };
}

/**
 * Find nearby jobs using the Haversine formula inside PostgreSQL.
 */
export async function findNearbyJobs(filters) {
  const latitude = Number(filters.lat);
  const longitude = Number(filters.lng);
  const radiusKm = Number(filters.radiusKm) || 10;
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 50);

  const { whereClause, params } = buildFilters(filters);

  params.push(latitude);
  const latPlaceholder = `$${params.length}`;

  params.push(longitude);
  const lngPlaceholder = `$${params.length}`;

  params.push(radiusKm);
  const radiusPlaceholder = `$${params.length}`;

  const distanceExpression = `
    (
      6371 * ACOS(
        LEAST(
          1,
          GREATEST(
            -1,
            COS(RADIANS(${latPlaceholder}))
            * COS(RADIANS(j.latitude))
            * COS(RADIANS(j.longitude) - RADIANS(${lngPlaceholder}))
            + SIN(RADIANS(${latPlaceholder}))
            * SIN(RADIANS(j.latitude))
          )
        )
      )
    )
  `;

  const nearbyConditions = `
    ${whereClause}
    AND j.latitude IS NOT NULL
    AND j.longitude IS NOT NULL
    AND ${distanceExpression} <= ${radiusPlaceholder}
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT j.id
      FROM jobs j
      JOIN companies c ON c.id = j.company_id
      ${nearbyConditions}
      GROUP BY j.id
    ) nearby_jobs
  `;

  const countResult = await pool.query(countSql, params);
  const total = Number(countResult.rows[0].total);

  const offset = (page - 1) * limit;
  const queryParams = [...params, limit, offset];

  const limitPlaceholder = `$${queryParams.length - 1}`;
  const offsetPlaceholder = `$${queryParams.length}`;

  let orderBy = "ORDER BY distance_km ASC";

  if (filters.sortBy === "salary_high") {
    orderBy =
      "ORDER BY j.salary_max DESC NULLS LAST, distance_km ASC";
  } else if (filters.sortBy === "salary_low") {
    orderBy =
      "ORDER BY j.salary_min ASC NULLS LAST, distance_km ASC";
  } else if (filters.sortBy === "title") {
    orderBy = "ORDER BY j.title ASC";
  } else if (filters.sortBy === "newest") {
    orderBy = "ORDER BY j.posted_at DESC NULLS LAST";
  }

  const dataSql = `
    SELECT
      j.id,
      j.title,
      j.description,
      j.requirements,
      j.experience_min,
      j.experience_max,
      j.salary_min,
      j.salary_max,
      j.salary_period,
      j.job_type,
      j.work_mode,
      j.address,
      j.city,
      j.state,
      j.postal_code,
      j.latitude,
      j.longitude,
      j.application_url,
      j.source_name,
      j.source_job_id,
      j.source_label,
      j.posted_at,
      j.expires_at,
      j.is_active,
      j.created_at,
      j.total_views,
      j.unique_views,
      j.last_viewed_at,

      c.id AS company_id,
      c.name AS company_name,
      c.website_url AS company_website,
      c.logo_url AS company_logo,
      c.is_verified AS company_verified,

      ROUND(${distanceExpression}::NUMERIC, 2) AS distance_km,

      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', s.id,
            'name', s.name,
            'normalizedName', s.normalized_name,
            'category', s.category,
            'importance', js.importance
          )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::json
      ) AS skills

    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    LEFT JOIN job_skills js ON js.job_id = j.id
    LEFT JOIN skills s ON s.id = js.skill_id

    ${nearbyConditions}

    GROUP BY j.id, c.id

    ${orderBy}

    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}
  `;

  const result = await pool.query(dataSql, queryParams);

  return {
    rows: result.rows,
    total,
  };
}

/**
 * Find one job with complete company and skills information.
 */
export async function findJobById(id) {
  const sql = `
    ${JOB_SELECT}
    WHERE j.id = $1
    ${JOB_GROUP}
  `;

  const result = await pool.query(sql, [id]);
  return result.rows[0] || null;
}

/**
 * Create a job and related skill mappings inside one transaction.
 */
export async function findJobBySource(sourceName, sourceJobId) {
  const sql = `
    SELECT id
    FROM jobs
    WHERE source_name = $1 AND source_job_id = $2
  `;
  const result = await pool.query(sql, [sourceName, sourceJobId]);
  return result.rows[0] || null;
}

export async function deleteExpiredJobs(sourceName, activeSourceJobIds) {
  if (!activeSourceJobIds || activeSourceJobIds.length === 0) {
    return;
  }
  const placeholders = activeSourceJobIds.map((_, idx) => `$${idx + 2}`).join(", ");
  const sql = `
    UPDATE jobs
    SET is_active = FALSE
    WHERE source_name = $1 AND source_job_id NOT IN (${placeholders})
  `;
  await pool.query(sql, [sourceName, ...activeSourceJobIds]);
}

export async function createJob(
  jobData,
  requiredSkills = [],
  preferredSkills = []
) {
  // 1. Resolve skills using pool (OUTSIDE the transaction block to avoid transaction aborts)
  const skillMappings = [
    ...requiredSkills.map((name) => ({ name, importance: "REQUIRED" })),
    ...preferredSkills.map((name) => ({ name, importance: "PREFERRED" })),
  ];

  const resolvedSkills = [];

  for (const skill of skillMappings) {
    const trimmedName = String(skill.name).trim();
    if (!trimmedName) {
      continue;
    }

    const normalizedName = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let skillId = globalSkillCache.get(normalizedName);
    if (!skillId) {
      try {
        const existRes = await pool.query(
          `SELECT id FROM skills WHERE normalized_name = $1`,
          [normalizedName]
        );
        if (existRes.rows.length > 0) {
          skillId = existRes.rows[0].id;
        } else {
          try {
            const insertRes = await pool.query(
              `INSERT INTO skills (name, normalized_name) VALUES ($1, $2) RETURNING id`,
              [trimmedName, normalizedName]
            );
            skillId = insertRes.rows[0].id;
          } catch (err) {
            const fetchRes = await pool.query(
              `SELECT id FROM skills WHERE normalized_name = $1`,
              [normalizedName]
);
            if (fetchRes.rows.length > 0) {
              skillId = fetchRes.rows[0].id;
            } else {
              console.error(`Failed to resolve/create skill: ${trimmedName}`, err.message);
              continue;
            }
          }
        }
        globalSkillCache.set(normalizedName, skillId);
      } catch (err) {
        console.error(`Error in skill resolution for ${trimmedName}:`, err.message);
        continue;
      }
    }
    resolvedSkills.push({ id: skillId, importance: skill.importance });
  }

  // 2. Insert job and mappings inside transaction
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      companyId,
      title,
      description,
      requirements = null,
      experienceMin = 0,
      experienceMax = null,
      salaryMin = null,
      salaryMax = null,
      salaryPeriod = "YEAR",
      jobType,
      workMode,
      address = null,
      city = null,
      state = null,
      postalCode = null,
      latitude = null,
      longitude = null,
      applicationUrl,
      sourceName = "RECRUITER",
      sourceJobId = null,
      sourceLabel = "Recruiter Posted",
      postedAt = new Date(),
      expiresAt = null,
    } = jobData;

    const insertJobSql = `
      INSERT INTO jobs (
        company_id,
        title,
        description,
        requirements,
        experience_min,
        experience_max,
        salary_min,
        salary_max,
        salary_period,
        job_type,
        work_mode,
        address,
        city,
        state,
        postal_code,
        latitude,
        longitude,
        application_url,
        source_name,
        source_job_id,
        source_label,
        posted_at,
        expires_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23
      )
      RETURNING id
    `;

    const insertJobResult = await client.query(insertJobSql, [
      companyId,
      title,
      description,
      requirements,
      experienceMin,
      experienceMax,
      salaryMin,
      salaryMax,
      salaryPeriod,
      jobType,
      workMode,
      address,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      applicationUrl,
      sourceName,
      sourceJobId,
      sourceLabel,
      postedAt,
      expiresAt,
    ]);

    const jobId = insertJobResult.rows[0].id;

    for (const skill of resolvedSkills) {
      const jsExist = await client.query(
        `SELECT 1 FROM job_skills WHERE job_id = $1 AND skill_id = $2`,
        [jobId, skill.id]
      );
      if (jsExist.rows.length === 0) {
        try {
          await client.query(
            `INSERT INTO job_skills (job_id, skill_id, importance) VALUES ($1, $2, $3)`,
            [jobId, skill.id, skill.importance]
          );
        } catch (err) {
          // Ignore
        }
      }
    }

    await client.query("COMMIT");

    return jobId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}