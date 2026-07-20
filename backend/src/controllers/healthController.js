/**
 * Health check controller.
 * Used for both GET /health and GET /api/health routes.
 */
export function healthCheck(req, res) {
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'nearhire-node-backend',
    timestamp: new Date().toISOString(),
  });
}
