/**
 * jobEnums.js — Single source of truth for job-related Postgres enums.
 *
 * These MUST match the database enum labels exactly:
 *   job_type          INTERNSHIP | FULL_TIME | PART_TIME | CONTRACT
 *   work_mode         ONSITE | HYBRID | REMOTE
 *   salary_period     MONTH | YEAR | STIPEND
 *   application_status APPLIED | INTERVIEW | REJECTED | OFFER | WITHDRAWN
 *
 * The frontend fetches these via GET /api/recruiter/meta instead of hardcoding
 * its own labels, which is what previously produced
 *   `invalid input value for enum job_type: "PART TIME"`.
 */

export const JOB_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"];
export const WORK_MODES = ["ONSITE", "HYBRID", "REMOTE"];
export const SALARY_PERIODS = ["YEAR", "MONTH", "STIPEND"];

/** Human labels for the UI. Values sent to the API remain the enum labels. */
export const JOB_TYPE_LABELS = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
};

export const WORK_MODE_LABELS = {
  ONSITE: "Onsite",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const SALARY_PERIOD_LABELS = {
  YEAR: "Per year",
  MONTH: "Per month",
  STIPEND: "Stipend",
};

/**
 * Coerce any reasonable input ("Part Time", "part-time", "PART TIME") to the
 * canonical enum label. Returns null when it cannot be mapped, so the caller
 * can raise a friendly validation error instead of hitting the database.
 */
function coerce(value, allowed, aliases = {}) {
  if (value === undefined || value === null || value === "") return null;

  const key = String(value)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_"); // "Part Time" / "part-time" -> "PART_TIME"

  if (allowed.includes(key)) return key;
  if (aliases[key]) return aliases[key];
  return null;
}

export function normalizeJobType(value) {
  return coerce(value, JOB_TYPES, {
    FULLTIME: "FULL_TIME",
    PARTTIME: "PART_TIME",
    FULL: "FULL_TIME",
    PART: "PART_TIME",
    INTERN: "INTERNSHIP",
    INTERNSHIPS: "INTERNSHIP",
    // Freelance is not a database enum value; contract is the closest match.
    FREELANCE: "CONTRACT",
    TEMPORARY: "CONTRACT",
  });
}

export function normalizeWorkMode(value) {
  return coerce(value, WORK_MODES, {
    ON_SITE: "ONSITE",
    IN_OFFICE: "ONSITE",
    WORK_FROM_HOME: "REMOTE",
    WFH: "REMOTE",
  });
}

export function normalizeSalaryPeriod(value) {
  return coerce(value, SALARY_PERIODS, {
    ANNUAL: "YEAR",
    YEARLY: "YEAR",
    PER_YEAR: "YEAR",
    MONTHLY: "MONTH",
    PER_MONTH: "MONTH",
  });
}

/** Payload served to the frontend so dropdowns always match the database. */
export function getJobEnumMetadata() {
  const toOptions = (values, labels) =>
    values.map((value) => ({ value, label: labels[value] || value }));

  return {
    jobTypes: toOptions(JOB_TYPES, JOB_TYPE_LABELS),
    workModes: toOptions(WORK_MODES, WORK_MODE_LABELS),
    salaryPeriods: toOptions(SALARY_PERIODS, SALARY_PERIOD_LABELS),
    applicantStatuses: [
      "PENDING",
      "SHORTLISTED",
      "INTERVIEW",
      "ACCEPTED",
      "REJECTED",
    ],
  };
}
