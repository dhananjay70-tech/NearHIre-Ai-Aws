/**
 * AppError — Custom operational error class.
 * Use this to throw predictable HTTP errors from services and controllers.
 *
 * @example
 *   throw new AppError('Email already exists', 409);
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 404, 409)
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes from unexpected errors
    Error.captureStackTrace(this, this.constructor);
  }
}
