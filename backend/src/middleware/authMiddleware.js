/**
 * authMiddleware.js — JWT authentication middleware.
 *
 * Priority order:
 *   1. nearhire_token cookie (httpOnly)
 *   2. Authorization: Bearer <token> header (fallback)
 *
 * On success, attaches req.user = { userId, role }
 */

import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/apiResponse.js';
import { normalizeRole } from '../utils/roles.js';

export function authenticate(req, res, next) {
  // 1. Try cookie first
  let token = req.cookies?.nearhire_token;

  // 2. Fall back to Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return sendError(res, {
      statusCode: 401,
      message: 'Authentication required. Please log in.',
    });
  }

  try {
    const decoded = verifyToken(token);

    // A refresh token must never be usable as an access token. This matters
    // when JWT_REFRESH_SECRET is not set and both share JWT_SECRET.
    if (decoded?.type === 'refresh') {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid authentication token. Please log in again.',
      });
    }

    const userId = decoded.id || decoded.userId;

    // Role is always normalized here so every downstream guard compares
    // canonical values, even for tokens issued before the RBAC migration.
    req.user = {
      id: userId,
      userId, // backward-compatible alias
      email: decoded.email,
      role: normalizeRole(decoded.role),
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return sendError(res, {
        statusCode: 401,
        message: 'Your session has expired. Please log in again.',
      });
    }
    return sendError(res, {
      statusCode: 401,
      message: 'Invalid authentication token. Please log in again.',
    });
  }
}

/**
 * Alias matching the RBAC spec naming. Same behaviour as `authenticate`.
 */
export const authenticateJWT = authenticate;

/**
 * Attach req.user when a valid token is present, but never reject the request.
 * Used by public endpoints that behave differently for signed-in users
 * (e.g. job view tracking, which counts anonymous visitors by hashed IP).
 */
export function optionalAuthenticate(req, res, next) {
  let token = req.cookies?.nearhire_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded?.type !== 'refresh') {
        const userId = decoded.id || decoded.userId;
        req.user = {
          id: userId,
          userId,
          email: decoded.email,
          role: normalizeRole(decoded.role),
        };
      }
    } catch {
      // Invalid/expired token on a public route — continue as anonymous.
    }
  }

  next();
}
