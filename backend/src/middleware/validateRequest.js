/**
 * validateRequest.js — Middleware factory that validates req.body
 * against a Zod schema before the controller runs.
 *
 * Usage:
 *   router.post('/register', validateRequest(registerSchema), asyncHandler(authController.register));
 */

import { sendError } from '../utils/apiResponse.js';

/**
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const messages = issues.map((i) => i.message || 'Validation failed');

      return sendError(res, {
        statusCode: 400,
        message: messages[0] || 'Validation failed. Please check the fields below.',
        errors: messages,
      });
    }

    // Replace req.body with the parsed (and transformed) data
    req.body = result.data;
    next();
  };
}
