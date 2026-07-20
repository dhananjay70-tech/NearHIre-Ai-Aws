/**
 * asyncHandler — Wraps async route handlers so that thrown errors
 * are automatically forwarded to Express's centralised error middleware.
 *
 * Usage:
 *   router.get('/me', asyncHandler(authController.getMe));
 *
 * @param {Function} fn - Async Express route handler
 * @returns {Function} Express middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
