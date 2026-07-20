/**
 * authRoutes.js — Routes for /api/auth/*
 *
 * Route flow:
 *   Route → rate limit → validateRequest → asyncHandler(controller) → service → repository → PostgreSQL
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  preferencesUpdateSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from '../validators/authValidators.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// ─── Auth-specific rate limiter ────────────────────────────────────────────────
// Stricter limit for register and login to prevent brute force / abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 10,
  message: {
    success: false,
    message: 'Too many attempts. Please wait 15 minutes before trying again.',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public routes ────────────────────────────────────────────────────────────
router.post('/register',          authLimiter, validateRequest(registerSchema),          asyncHandler(authController.register));
router.post('/login',             authLimiter, validateRequest(loginSchema),             asyncHandler(authController.login));
router.post('/verify-otp',        authLimiter, validateRequest(verifyOtpSchema),        asyncHandler(authController.verifyOtp));
router.post('/resend-otp',        authLimiter, validateRequest(resendOtpSchema),        asyncHandler(authController.resendOtp));
router.post('/forgot-password',   authLimiter, validateRequest(forgotPasswordSchema),   asyncHandler(authController.forgotPassword));
router.post('/verify-reset-otp',  authLimiter, validateRequest(verifyResetOtpSchema),  asyncHandler(authController.verifyResetOtp));
router.post('/reset-password',     authLimiter, validateRequest(resetPasswordSchema),     asyncHandler(authController.resetPassword));
router.post('/logout',                                                                   asyncHandler(authController.logout));

// ─── Protected routes ─────────────────────────────────────────────────────────
router.get('/me',                    authenticate, asyncHandler(authController.getMe));
router.patch('/profile',             authenticate, validateRequest(profileUpdateSchema),     asyncHandler(authController.updateProfile));
router.get('/preferences',           authenticate, asyncHandler(authController.getPreferences));
router.patch('/preferences',         authenticate, validateRequest(preferencesUpdateSchema), asyncHandler(authController.updatePreferences));

export default router;
