/**
 * authService.js — Authentication business logic.
 * Orchestrates repository calls and enforces business rules.
 */

import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { signToken, signRefreshToken } from '../utils/jwt.js';
import { ROLES, normalizeRole, isPublicSignupRole } from '../utils/roles.js';
import * as userRepo from '../repositories/userRepository.js';
import * as otpRepo from '../repositories/otpRepository.js';
import * as emailService from './emailService.js';

const SALT_ROUNDS = 12;

// ─── Cookie helper ─────────────────────────────────────────────────────────────

/**
 * Attach nearhire_token cookie to the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setAuthCookie(res, token) {
  res.cookie("nearhire_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
/**
 * Clear the nearhire_token cookie.
 * @param {import('express').Response} res
 */
export function clearAuthCookie(res) {
  res.clearCookie("nearhire_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
}
// ─── Register ────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Creates user + preferences in a single transaction.
 *
 * Only 'seeker' and 'recruiter' may be self-assigned. Admin accounts are never
 * creatable from public registration — they are seeded manually or promoted by
 * an existing admin.
 *
 * @param {{ name: string, email: string, password: string, role?: string }} data
 * @returns {{ user: object, token: string }}
 */
export async function register({ name, email, password, role }) {
  // Reject privilege escalation attempts explicitly rather than silently
  // downgrading, so a caller asking for `admin` gets a clear error.
  if (role !== undefined && role !== null && String(role).trim() !== '') {
    if (!isPublicSignupRole(role)) {
      throw new AppError(
        'Admin accounts cannot be created through public registration.',
        403
      );
    }
  }

  const requestedRole = role ? normalizeRole(role) : ROLES.SEEKER;

  // Check for duplicate email
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Use Drizzle transaction to create user + preferences atomically
  const result = await db.transaction(async (tx) => {
    const user = await userRepo.createUser({
      name: name.trim(),
      email,
      password_hash,
      role: requestedRole,
    });

    await userRepo.createPreferences(user.id);

    return user;
  });

  const token = signToken({
    userId: result.id,
    email: result.email,
    role: result.role,
  });

  // Send welcome email via Brevo asynchronously (don't block response)
  emailService.sendWelcomeEmail(result.email, result.name).catch((err) => {
    console.error('[Auth Service] Failed to send welcome email:', err.message);
  });

  return { user: result, token };
}

// ─── Login (Step 1: Credentials Validation & OTP Send) ───────────────────────

/**
 * Initiate login flow. Validates credentials and generates/sends OTP.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ otpRequired: boolean, email: string }>}
 */
export async function login({ email, password }) {
  const INVALID_MSG = 'Invalid email or password.';

  if (!email || !password || typeof password !== 'string') {
    throw new AppError(INVALID_MSG, 401);
  }

  const userRow = await userRepo.findByEmail(email);

  // Same error for unknown email or wrong password (prevents user enumeration)
  if (!userRow || !userRow.passwordHash) {
    throw new AppError(INVALID_MSG, 401);
  }

  const passwordMatches = await bcrypt.compare(password, userRow.passwordHash);
  if (!passwordMatches) {
    throw new AppError(INVALID_MSG, 401);
  }

  if (!userRow.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown

  // Store hashed OTP as LOGIN type
  await otpRepo.upsertOtp({ email, type: 'LOGIN', otpHash, expiresAt, resendAvailableAt });

  // Send via AWS SES
  await emailService.sendOtpEmail(email, otp, 'LOGIN');

  return { otpRequired: true, email };
}

// ─── Login (Step 2: OTP Verification) ────────────────────────────────────────

/**
 * Verify OTP code and issue JWT login session.
 *
 * @param {{ email: string, otp: string }} payload
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function verifyOtp({ email, otp }) {
  const INVALID_OTP_MSG = 'Invalid or expired verification code.';

  if (!email || !otp) {
    throw new AppError('Email and verification code are required.', 400);
  }

  const otpRecord = await otpRepo.findByEmailAndType(email, 'LOGIN');
  if (!otpRecord) {
    throw new AppError(INVALID_OTP_MSG, 401);
  }

  // Check expiry
  if (new Date() > new Date(otpRecord.expiresAt)) {
    await otpRepo.deleteByEmailAndType(email, 'LOGIN');
    throw new AppError(INVALID_OTP_MSG, 401);
  }

  // Compare hashes
  const matches = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!matches) {
    throw new AppError(INVALID_OTP_MSG, 401);
  }

  // Success: invalidate OTP and log user in
  await otpRepo.deleteByEmailAndType(email, 'LOGIN');

  const userRow = await userRepo.findByEmail(email);
  if (!userRow || !userRow.isActive) {
    throw new AppError('User account is invalid or deactivated.', 401);
  }

  // Build safe user object
  const { passwordHash: _omit, ...user } = userRow;

  // Normalize the role so pre-migration rows still yield a canonical value.
  user.role = normalizeRole(user.role);

  const tokenPayload = { userId: user.id, email: user.email, role: user.role };
  const token = signToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  return { user, token, refreshToken };
}

// ─── OTP Resend ──────────────────────────────────────────────────────────────

/**
 * Resend OTP code if the cooldown period has elapsed.
 *
 * @param {{ email: string, type?: string }} payload
 * @returns {Promise<{ success: boolean }>}
 */
export async function resendOtp({ email, type = 'LOGIN' }) {
  if (!email) {
    throw new AppError('Email is required.', 400);
  }

  const userRow = await userRepo.findByEmail(email);
  if (!userRow) {
    // Return success to prevent email enumeration
    return { success: true };
  }

  if (!userRow.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  // Check resend cooldown
  const existingOtp = await otpRepo.findByEmailAndType(email, type);
  if (existingOtp && new Date() < new Date(existingOtp.resendAvailableAt)) {
    const secondsLeft = Math.ceil((new Date(existingOtp.resendAvailableAt) - new Date()) / 1000);
    throw new AppError(`Please wait ${secondsLeft} seconds before requesting another code.`, 429);
  }

  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds

  // Store new OTP
  await otpRepo.upsertOtp({ email, type, otpHash, expiresAt, resendAvailableAt });

  // Send via AWS SES
  await emailService.sendOtpEmail(email, otp, type);

  return { success: true };
}

// ─── Forgot Password Flow ──────────────────────────────────────────────────

/**
 * Initiate Forgot Password flow. Generates and sends a reset OTP.
 *
 * @param {{ email: string }} payload
 * @returns {Promise<{ success: boolean }>}
 */
export async function forgotPassword({ email }) {
  if (!email) {
    throw new AppError('Email is required.', 400);
  }

  const userRow = await userRepo.findByEmail(email);
  if (!userRow) {
    throw new AppError('No account found with this email address.', 404);
  }

  if (!userRow.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown

  // Store hashed OTP as PASSWORD_RESET type
  await otpRepo.upsertOtp({ email, type: 'PASSWORD_RESET', otpHash, expiresAt, resendAvailableAt });

  // Send via AWS SES
  await emailService.sendOtpEmail(email, otp, 'PASSWORD_RESET');

  return { success: true, message: 'Password reset code sent.' };
}

/**
 * Verify reset OTP code (Step 2 of forgot password).
 *
 * @param {{ email: string, otp: string }} payload
 * @returns {Promise<{ success: boolean }>}
 */
export async function verifyResetOtp({ email, otp }) {
  const INVALID_OTP_MSG = 'Invalid or expired verification code.';

  if (!email || !otp) {
    throw new AppError('Email and verification code are required.', 400);
  }

  const otpRecord = await otpRepo.findByEmailAndType(email, 'PASSWORD_RESET');
  if (!otpRecord) {
    throw new AppError(INVALID_OTP_MSG, 401);
  }

  // Check expiry
  if (new Date() > new Date(otpRecord.expiresAt)) {
    await otpRepo.deleteByEmailAndType(email, 'PASSWORD_RESET');
    throw new AppError(INVALID_OTP_MSG, 401);
  }

  // Compare hashes
  const matches = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!matches) {
    throw new AppError(INVALID_OTP_MSG, 401);
  }

  return { success: true, message: 'OTP verified. You can now reset your password.' };
}

/**
 * Complete forgot password flow (Step 3: Reset password).
 *
 * @param {{ email: string, otp: string, password: string }} payload
 * @returns {Promise<{ success: boolean }>}
 */
export async function resetPassword({ email, otp, password }) {
  const INVALID_OTP_MSG = 'Invalid or expired verification code.';

  if (!email || !otp || !password) {
    throw new AppError('Email, code, and new password are required.', 400);
  }

  const otpRecord = await otpRepo.findByEmailAndType(email, 'PASSWORD_RESET');
  if (!otpRecord) {
    throw new AppError(INVALID_OTP_MSG, 401);
  }

  // Check expiry
  if (new Date() > new Date(otpRecord.expiresAt)) {
    await otpRepo.deleteByEmailAndType(email, 'PASSWORD_RESET');
    throw new AppError(INVALID_OTP_MSG, 401);
  }

  // Compare hashes
  const matches = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!matches) {
    throw new AppError(INVALID_OTP_MSG, 401);
  }

  const userRow = await userRepo.findByEmail(email);
  if (!userRow) {
    throw new AppError('User not found.', 404);
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Update password in DB
  await userRepo.updatePassword(userRow.id, newPasswordHash);

  // Invalidate OTP
  await otpRepo.deleteByEmailAndType(email, 'PASSWORD_RESET');

  return { success: true, message: 'Password reset successfully.' };
}

// ─── Get current user ─────────────────────────────────────────────────────────

/**
 * Fetch the currently authenticated user along with their preferences.
 *
 * @param {string} userId
 * @returns {{ user: object, preferences: object }}
 */
export async function getMe(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 401);
  }

  const preferences = await userRepo.getPreferences(userId);
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return { user, preferences, token };
}

// ─── Update profile ──────────────────────────────────────────────────────────

/**
 * Update allowed profile fields for the current user.
 *
 * @param {string} userId
 * @param {object} fields
 * @returns {object} Updated user
 */
export async function updateProfile(userId, fields) {
  const user = await userRepo.updateProfile(userId, fields);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return user;
}

// ─── Preferences ─────────────────────────────────────────────────────────────

/**
 * Get preferences for the current user.
 * @param {string} userId
 * @returns {object}
 */
export async function getPreferences(userId) {
  const prefs = await userRepo.getPreferences(userId);
  if (!prefs) {
    throw new AppError('Preferences not found.', 404);
  }
  return prefs;
}

/**
 * Update preferences for the current user.
 * @param {string} userId
 * @param {object} fields
 * @returns {object}
 */
export async function updatePreferences(userId, fields) {
  const prefs = await userRepo.updatePreferences(userId, fields);
  if (!prefs) {
    throw new AppError('Preferences not found.', 404);
  }
  return prefs;
}
