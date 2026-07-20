/**
 * authController.js — Express route handlers for all /api/auth/* endpoints.
 * Each handler delegates to authService and returns a standardised response.
 */

import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/apiResponse.js';

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export async function register(req, res) {
  const { name, email, password, role } = req.body;

  const { user, token } = await authService.register({ name, email, password, role });

  authService.setAuthCookie(res, token);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Account created successfully. Welcome to NearHire.AI!',
    data: { user, token },
  });
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export async function login(req, res) {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Verification code sent to your email address.',
    data: result,
  });
}

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
export async function verifyOtp(req, res) {
  const { email, otp } = req.body;

  const { user, token, refreshToken } = await authService.verifyOtp({ email, otp });

  authService.setAuthCookie(res, token);

  // Response shape per the RBAC spec: token + refreshToken + a compact user.
  // The full `user` object is kept alongside it for backward compatibility.
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logged in successfully.',
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImageUrl ?? null,
        ...user,
      },
    },
  });
}

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────
export async function resendOtp(req, res) {
  const { email, type } = req.body;

  await authService.resendOtp({ email, type });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Verification code resent successfully.',
    data: null,
  });
}

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
export async function forgotPassword(req, res) {
  const { email } = req.body;

  const result = await authService.forgotPassword({ email });

  return sendSuccess(res, {
    statusCode: 200,
    message: result.message,
    data: null,
  });
}

// ─── POST /api/auth/verify-reset-otp ────────────────────────────────────────
export async function verifyResetOtp(req, res) {
  const { email, otp } = req.body;

  const result = await authService.verifyResetOtp({ email, otp });

  return sendSuccess(res, {
    statusCode: 200,
    message: result.message,
    data: null,
  });
}

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
export async function resetPassword(req, res) {
  const { email, otp, password } = req.body;

  const result = await authService.resetPassword({ email, otp, password });

  return sendSuccess(res, {
    statusCode: 200,
    message: result.message,
    data: null,
  });
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
export async function getMe(req, res) {
  const { userId } = req.user;

  const { user, preferences, token } = await authService.getMe(userId);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'User fetched successfully.',
    data: { user, preferences, token },
  });
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
export async function logout(req, res) {
  authService.clearAuthCookie(res);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logged out successfully.',
    data: null,
  });
}

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
export async function updateProfile(req, res) {
  const { userId } = req.user;

  const user = await authService.updateProfile(userId, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Profile updated successfully.',
    data: { user },
  });
}

// ─── GET /api/auth/preferences ────────────────────────────────────────────────
export async function getPreferences(req, res) {
  const { userId } = req.user;

  const preferences = await authService.getPreferences(userId);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Preferences fetched successfully.',
    data: { preferences },
  });
}

// ─── PATCH /api/auth/preferences ─────────────────────────────────────────────
export async function updatePreferences(req, res) {
  const { userId } = req.user;

  const preferences = await authService.updatePreferences(userId, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Preferences updated successfully.',
    data: { preferences },
  });
}
