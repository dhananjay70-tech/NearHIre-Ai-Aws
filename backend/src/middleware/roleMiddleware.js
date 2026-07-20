/**
 * roleMiddleware.js — Role-based authorization guards.
 *
 * Every guard must run AFTER `authenticate` (authenticateJWT), which puts a
 * normalized role on req.user. The role is never read from the request body or
 * a header — only from the verified JWT.
 *
 * Unauthenticated -> 401. Authenticated but wrong role -> 403.
 */

import { AppError } from "../utils/AppError.js";
import { ROLES, normalizeRole, roleMatches } from "../utils/roles.js";

/**
 * Allow only the listed roles. Accepts legacy names too, so an existing
 * `requireRole('ADMIN', 'RECRUITER')` call site keeps working unchanged.
 *
 * @param {...string} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roleMatches(req.user.role, allowedRoles)) {
      const expected = allowedRoles.map(normalizeRole).join(", ");
      return next(
        new AppError(`Access denied. Required role: ${expected}.`, 403)
      );
    }

    next();
  };
}

/** Only job seekers (default role). */
export const verifySeeker = requireRole(ROLES.SEEKER);

/** Only recruiters. */
export const verifyRecruiter = requireRole(ROLES.RECRUITER);

/** Only admins. */
export const verifyAdmin = requireRole(ROLES.ADMIN);
