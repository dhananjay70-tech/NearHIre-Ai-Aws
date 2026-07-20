/**
 * jobService.js — Business logic for jobs.
 */

import * as jobRepo from "../repositories/jobRepository.js";
import { haversineDistance } from "../utils/distance.js";
import { AppError } from "../utils/AppError.js";
import { cacheWrap, CACHE_TTL_SECONDS } from "../utils/cache.js";

/**
 * Build a stable cache key from an endpoint name + query params.
 * Params are sorted so key order never changes the key.
 */
function buildCacheKey(prefix, params = {}) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `jobs:${prefix}:${sorted}`;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parsePagination(page, limit) {
  const parsedPage = Math.max(
    1,
    Number.parseInt(page, 10) || DEFAULT_PAGE
  );

  const parsedLimit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Number.parseInt(limit, 10) || DEFAULT_LIMIT
    )
  );

  return {
    page: parsedPage,
    limit: parsedLimit,
  };
}

function parseOptionalInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? null : parsed;
}

function formatIndianCurrency(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return new Intl.NumberFormat("en-IN").format(Number(value));
}

function createSalaryLabel(row) {
  const min = row.salary_min;
  const max = row.salary_max;
  const period = row.salary_period;

  if (min === null && max === null) {
    return "Not disclosed";
  }

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (period === "YEAR") {
      const lpa = Number(value) / 100000;

      return `₹${Number.isInteger(lpa) ? lpa : lpa.toFixed(1)} LPA`;
    }

    const formatted = formatIndianCurrency(value);

    if (period === "STIPEND") {
      return `₹${formatted}/month`;
    }

    if (period === "MONTH") {
      return `₹${formatted}/month`;
    }

    return `₹${formatted}`;
  };

  const formattedMin = formatValue(min);
  const formattedMax = formatValue(max);

  if (formattedMin && formattedMax) {
    return `${formattedMin} – ${formattedMax}`;
  }

  return formattedMin || formattedMax || "Not disclosed";
}

/**
 * Generate a human-friendly display job ID.
 * Format: NH-<last 8 alphanumeric UUID characters in uppercase>
 * Example: "22222222-0000-0000-0000-000000000005" → "NH-00000005"
 */
function makeDisplayJobId(uuid) {
  if (!uuid) return null;
  // Remove dashes, take last 8 chars, uppercase
  const stripped = String(uuid).replace(/-/g, '');
  return `NH-${stripped.slice(-8).toUpperCase()}`;
}

function formatJob(row, userLat = null, userLng = null) {
  const skills = Array.isArray(row.skills) ? row.skills : [];

  const requiredSkills = skills.filter(
    (skill) => skill.importance === "REQUIRED"
  );

  const preferredSkills = skills.filter(
    (skill) => skill.importance === "PREFERRED"
  );

  const latitude =
    row.latitude !== null && row.latitude !== undefined
      ? Number(row.latitude)
      : null;

  const longitude =
    row.longitude !== null && row.longitude !== undefined
      ? Number(row.longitude)
      : null;

  const job = {
    id: row.id,
    displayJobId: makeDisplayJobId(row.id),
    title: row.title,
    description: row.description,
    requirements: row.requirements,

    company: {
      id: row.company_id,
      name: row.company_name,
      website: row.company_website,
      logo: row.company_logo,
      verified: row.company_verified,
    },

    salary: createSalaryLabel(row),

    salaryRaw: {
      min: row.salary_min,
      max: row.salary_max,
      period: row.salary_period,
    },

    experience: {
      min: row.experience_min,
      max: row.experience_max,
    },

    jobType: row.job_type,
    workMode: row.work_mode,

    location: {
      address: row.address,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      latitude,
      longitude,
    },

    address: row.address,
    city: row.city,
    state: row.state,
    latitude,
    longitude,

    skills: requiredSkills.slice(0, 5),
    requiredSkills,
    preferredSkills,

    source: {
      name: row.source_name,
      label: row.source_label,
      jobId: row.source_job_id,
    },

    sourceLabel: row.source_label,
    sourceName: row.source_name,

    postedAt: row.posted_at,
    expiresAt: row.expires_at,
    applicationUrl: row.application_url,

    // View tracking — always a number, never null.
    totalViews: Number(row.total_views ?? 0),
    uniqueViews: Number(row.unique_views ?? 0),
    lastViewedAt: row.last_viewed_at ?? null,
  };

  if (
    row.distance_km !== null &&
    row.distance_km !== undefined
  ) {
    job.distanceKm = Number(row.distance_km);
  } else if (
    userLat !== null &&
    userLng !== null &&
    latitude !== null &&
    longitude !== null
  ) {
    const distance = haversineDistance(
      Number(userLat),
      Number(userLng),
      latitude,
      longitude
    );

    job.distanceKm = Math.round(distance * 100) / 100;
  }

  return job;
}

function buildFilters(queryParams, page, limit) {
  return {
    search: queryParams.search?.trim() || null,
    city: queryParams.city?.trim() || null,
    state: queryParams.state?.trim() || null,
    jobType: queryParams.jobType || null,
    workMode: queryParams.workMode || null,
    minSalary: parseOptionalInteger(queryParams.minSalary),
    maxExperience: parseOptionalInteger(
      queryParams.maxExperience
    ),
    skill: queryParams.skill?.trim() || null,
    sortBy: queryParams.sortBy || "newest",
    page,
    limit,
  };
}

export async function getJobs(queryParams = {}) {
  const cacheKey = buildCacheKey("list", queryParams);

  return cacheWrap(cacheKey, CACHE_TTL_SECONDS, async () => {
    const { page, limit } = parsePagination(
      queryParams.page,
      queryParams.limit
    );

    const filters = buildFilters(queryParams, page, limit);

    const { rows, total } = await jobRepo.findJobs(filters);

    const userLat =
      queryParams.userLat !== undefined
        ? Number(queryParams.userLat)
        : null;

    const userLng =
      queryParams.userLng !== undefined
        ? Number(queryParams.userLng)
        : null;

    return {
      jobs: rows.map((row) =>
        formatJob(row, userLat, userLng)
      ),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}

export async function getNearbyJobs(queryParams = {}) {
  const lat = Number(queryParams.lat);
  const lng = Number(queryParams.lng);
  const radiusKm =
    queryParams.radiusKm !== undefined
      ? Number(queryParams.radiusKm)
      : 10;

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new AppError(
      "lat must be a valid number between -90 and 90",
      400
    );
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new AppError(
      "lng must be a valid number between -180 and 180",
      400
    );
  }

  if (
    !Number.isFinite(radiusKm) ||
    radiusKm <= 0 ||
    radiusKm > 200
  ) {
    throw new AppError(
      "radiusKm must be greater than 0 and at most 200",
      400
    );
  }

  const { page, limit } = parsePagination(
    queryParams.page,
    queryParams.limit
  );

  const cacheKey = buildCacheKey("nearby", queryParams);

  return cacheWrap(cacheKey, CACHE_TTL_SECONDS, async () => {
    const filters = {
      ...buildFilters(queryParams, page, limit),
      lat,
      lng,
      radiusKm,
    };

    const { rows, total } =
      await jobRepo.findNearbyJobs(filters);

    return {
      jobs: rows.map((row) => formatJob(row, lat, lng)),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      searchArea: {
        center: {
          lat,
          lng,
        },
        radiusKm,
      },
    };
  });
}

export async function getJobById(
  id,
  queryParams = {}
) {
  if (!id) {
    throw new AppError("Job ID is required", 400);
  }

  const row = await jobRepo.findJobById(id);

  if (!row) {
    throw new AppError("Job not found", 404);
  }

  let userLat = null;
  let userLng = null;

  if (
    queryParams.lat !== undefined &&
    queryParams.lng !== undefined
  ) {
    userLat = Number(queryParams.lat);
    userLng = Number(queryParams.lng);

    if (
      !Number.isFinite(userLat) ||
      userLat < -90 ||
      userLat > 90
    ) {
      throw new AppError(
        "lat must be a valid number between -90 and 90",
        400
      );
    }

    if (
      !Number.isFinite(userLng) ||
      userLng < -180 ||
      userLng > 180
    ) {
      throw new AppError(
        "lng must be a valid number between -180 and 180",
        400
      );
    }
  }

  return formatJob(row, userLat, userLng);
}

export async function createJobRecord(data) {
  const {
    requiredSkills = [],
    preferredSkills = [],
    ...jobData
  } = data;

  if (!Array.isArray(requiredSkills)) {
    throw new AppError(
      "requiredSkills must be an array",
      400
    );
  }

  if (!Array.isArray(preferredSkills)) {
    throw new AppError(
      "preferredSkills must be an array",
      400
    );
  }

  const jobId = await jobRepo.createJob(
    jobData,
    requiredSkills,
    preferredSkills
  );

  const createdJob = await jobRepo.findJobById(jobId);

  return formatJob(createdJob);
}