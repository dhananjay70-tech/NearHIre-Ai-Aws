/**
 * apiResponse — Standardised JSON response helpers.
 *
 * Success shape:
 *   { success: true, message: "...", data: {} }
 *
 * Error shape:
 *   { success: false, message: "...", errors: [] }
 */

/**
 * Send a successful JSON response.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number}  options.statusCode - HTTP status code (default 200)
 * @param {string}  options.message    - Human-readable success message
 * @param {*}       options.data       - Response payload
 */
export function sendSuccess(res, { statusCode = 200, message = 'Success', data = null } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send an error JSON response.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number}   options.statusCode - HTTP status code (default 500)
 * @param {string}   options.message    - Human-readable error message
 * @param {Array}    options.errors      - Optional array of validation/field errors
 */
export function sendError(res, { statusCode = 500, message = 'Something went wrong', errors = [] } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}
