/**
 * authValidators.js — Zod schemas for all auth-related request bodies.
 */

import { z } from 'zod';

// ─── Register ────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must contain at least 2 characters'),

  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  // Optional at registration — defaults to 'seeker'. 'admin' is deliberately
  // NOT accepted here; the service rejects it with 403.
  role: z
    .enum(['seeker', 'recruiter', 'user', 'USER', 'RECRUITER', 'SEEKER'], {
      errorMap: () => ({ message: "Role must be either 'seeker' or 'recruiter'" }),
    })
    .optional(),
});

// ─── Login ───────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

// ─── Verify OTP ──────────────────────────────────────────────────────────────
export const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase().trim()),

  otp: z
    .string({ required_error: 'Verification code is required' })
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Verification code must contain only numbers'),
});

// ─── Resend OTP ──────────────────────────────────────────────────────────────
export const resendOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase().trim()),
  type: z
    .enum(['LOGIN', 'PASSWORD_RESET'])
    .default('LOGIN')
    .optional(),
});

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase().trim()),
});

// ─── Verify Reset OTP ────────────────────────────────────────────────────────
export const verifyResetOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase().trim()),
  otp: z
    .string({ required_error: 'Verification code is required' })
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Verification code must contain only numbers'),
});

// ─── Reset Password ──────────────────────────────────────────────────────────
export const resetPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase().trim()),
  otp: z
    .string({ required_error: 'Verification code is required' })
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Verification code must contain only numbers'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ─── Profile Update ──────────────────────────────────────────────────────────
export const profileUpdateSchema = z.object({
  name:              z.string().trim().min(2, 'Name must contain at least 2 characters').optional(),
  phone:             z.string().trim().optional(),
  profile_image_url: z.string().url('Must be a valid URL').optional(),
  address:           z.string().trim().optional(),
  city:              z.string().trim().optional(),
  state:             z.string().trim().optional(),
  postal_code:       z.string().trim().optional(),
  latitude:          z.number().min(-90).max(90).optional(),
  longitude:         z.number().min(-180).max(180).optional(),
}).strict(); // reject unknown keys (email, password, role, etc.)

// ─── Preferences Update ──────────────────────────────────────────────────────
export const preferencesUpdateSchema = z.object({
  preferred_role:       z.string().trim().optional(),
  minimum_salary:       z.number().int().min(0, 'Minimum salary cannot be negative').optional(),
  maximum_distance_km:  z.number().positive('Maximum distance must be greater than 0').optional(),
  preferred_job_types:  z.array(z.string()).optional(),
  preferred_work_modes: z.array(z.string()).optional(),
  preferred_locations:  z.array(z.string()).optional(),
}).strict();
