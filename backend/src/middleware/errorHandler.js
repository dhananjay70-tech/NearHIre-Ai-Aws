/**
 * Centralised error handler middleware.
 * Must be registered AFTER all routes in app.js.
 *
 * Handles:
 *  - AppError (operational errors)
 *  - Zod validation errors
 *  - PostgreSQL unique constraint violations
 *  - JWT errors (invalid / expired)
 *  - Generic/unexpected errors
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 */

import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Log full error in development only
  if (isDev) {
    console.error('[ErrorHandler]', err);
  }

  // ─── AppError (intentionally thrown operational errors) ─────────────────────
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: [],
    });
  }

  // ─── Zod validation errors ───────────────────────────────────────────────────
  if (err instanceof ZodError || err?.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    const messages = issues.map((e) => e.message || 'Invalid input.');
    return res.status(400).json({
      success: false,
      message: messages[0] || 'Validation failed. Please check the provided information.',
      errors: messages,
    });
  }

  // ─── PostgreSQL unique constraint violation ───────────────────────────────────
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists.',
      errors: [],
    });
  }

  // ─── JWT: invalid signature ──────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token. Please log in again.',
      errors: [],
    });
  }

  // ─── JWT: token expired ──────────────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please log in again.',
      errors: [],
    });
  }

  // ─── Unknown / unexpected error ──────────────────────────────────────────────
  const message = (err && typeof err.message === 'string' && err.message.trim())
    ? err.message
    : 'Something went wrong. Please try again later.';

  return res.status(err.statusCode || 500).json({
    success: false,
    message,
    errors: [],
  });
}
