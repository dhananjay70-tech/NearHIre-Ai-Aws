/**
 * roles.js — Canonical roles for the UI.
 *
 * The backend is always the authority on a user's role; these helpers only
 * decide what to *render* and where to redirect. Never use them to grant
 * access to data — every protected API re-checks the role server-side.
 */

export const ROLES = Object.freeze({
  SEEKER: "seeker",
  RECRUITER: "recruiter",
  ADMIN: "admin",
});

// Legacy/uppercase values from older sessions map onto the canonical set.
const LEGACY_MAP = {
  user: ROLES.SEEKER,
  seeker: ROLES.SEEKER,
  candidate: ROLES.SEEKER,
  job_seeker: ROLES.SEEKER,
  jobseeker: ROLES.SEEKER,
  recruiter: ROLES.RECRUITER,
  employer: ROLES.RECRUITER,
  admin: ROLES.ADMIN,
  administrator: ROLES.ADMIN,
};

/** Normalize any role value to 'seeker' | 'recruiter' | 'admin'. */
export function normalizeRole(role) {
  if (!role) return ROLES.SEEKER;
  return LEGACY_MAP[String(role).trim().toLowerCase()] || ROLES.SEEKER;
}

/** The landing route for a role immediately after login. */
export function homePathForRole(role) {
  switch (normalizeRole(role)) {
    case ROLES.RECRUITER:
      return "/recruiter/dashboard";
    case ROLES.ADMIN:
      return "/admin/dashboard";
    default:
      return "/dashboard";
  }
}

/** Human-readable label for a role. */
export function roleLabel(role) {
  switch (normalizeRole(role)) {
    case ROLES.RECRUITER:
      return "Recruiter";
    case ROLES.ADMIN:
      return "Admin";
    default:
      return "Job Seeker";
  }
}
