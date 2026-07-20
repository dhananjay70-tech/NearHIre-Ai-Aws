/**
 * 404 Not Found handler.
 * Register this AFTER all routes but BEFORE errorHandler.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}
