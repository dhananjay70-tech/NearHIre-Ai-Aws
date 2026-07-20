/**
 * jwt.js — JWT sign and verify helpers.
 *
 * Access token payload: { id, userId, email, role }
 *   - `id` is the canonical user id (per the RBAC spec).
 *   - `userId` is kept as an alias so older code/tokens keep working.
 *   - `role` is always normalized to 'seeker' | 'recruiter' | 'admin'.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { normalizeRole } from './roles.js';

/**
 * Sign a new access token.
 *
 * @param {{ userId?: string, id?: string, email?: string, role: string }} payload
 * @returns {string} Signed JWT
 */
export function signToken(payload) {
  const userId = payload.id || payload.userId;

  return jwt.sign(
    {
      id: userId,
      userId, // backward-compatible alias
      email: payload.email,
      role: normalizeRole(payload.role),
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * Sign a long-lived refresh token. Marked with `type: 'refresh'` so it can
 * never be mistaken for an access token.
 *
 * @param {{ userId?: string, id?: string, email?: string, role: string }} payload
 * @returns {string}
 */
export function signRefreshToken(payload) {
  const userId = payload.id || payload.userId;

  return jwt.sign(
    {
      id: userId,
      userId,
      email: payload.email,
      role: normalizeRole(payload.role),
      type: 'refresh',
    },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
}

/**
 * Verify an access token and return its decoded payload.
 *
 * @param {string} token
 * @throws jwt.JsonWebTokenError | jwt.TokenExpiredError
 */
export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Verify a refresh token. Rejects tokens that are not of type 'refresh'.
 *
 * @param {string} token
 */
export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, config.jwtRefreshSecret);

  if (decoded?.type !== 'refresh') {
    throw new jwt.JsonWebTokenError('Not a refresh token');
  }

  return decoded;
}
