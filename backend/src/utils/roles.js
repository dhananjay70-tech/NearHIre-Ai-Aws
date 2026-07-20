/**
 * roles.js — Single source of truth for user roles.
 *
 * The platform has exactly three roles: seeker, recruiter, admin.
 *
 * Backward compatibility: earlier releases stored uppercase roles
 * ('USER', 'RECRUITER', 'ADMIN'). `normalizeRole()` maps those (and any
 * casing) onto the canonical lowercase values so old JWTs, old rows and old
 * `requireRole('ADMIN')` call sites keep working during/after the migration.
 */

export const ROLES = Object.freeze({
  SEEKER: "USER",
  RECRUITER: "RECRUITER",
  ADMIN: "ADMIN",
});

export const ALL_ROLES = Object.freeze([
  "USER",
  "RECRUITER",
  "ADMIN",
]);

/** Roles a visitor may self-assign at public registration. Never 'ADMIN'. */
export const PUBLIC_SIGNUP_ROLES = Object.freeze([
  "USER",
  "RECRUITER",
]);

// Legacy / input role string mapping -> Supabase database user_role enum values ('USER', 'RECRUITER', 'ADMIN').
const LEGACY_MAP = {
  user: "USER",
  seeker: "USER",
  job_seeker: "USER",
  jobseeker: "USER",
  candidate: "USER",
  recruiter: "RECRUITER",
  employer: "RECRUITER",
  admin: "ADMIN",
  administrator: "ADMIN",
};

/**
 * Normalize any stored/received role to a database user_role enum value ('USER' | 'RECRUITER' | 'ADMIN').
 * Unknown values fall back to 'USER' (least privilege).
 *
 * @param {string|null|undefined} role
 * @returns {'USER'|'RECRUITER'|'ADMIN'}
 */
export function normalizeRole(role) {
  if (!role) return "USER";
  const key = String(role).trim().toLowerCase();
  return LEGACY_MAP[key] || "USER";
}

/**
 * True when `role` matches any of `allowed` (both sides normalized).
 */
export function roleMatches(role, allowed = []) {
  const actual = normalizeRole(role);
  return allowed.some((candidate) => normalizeRole(candidate) === actual);
}

/** True when the role may be chosen during public registration. */
export function isPublicSignupRole(role) {
  return PUBLIC_SIGNUP_ROLES.includes(normalizeRole(role));
}
