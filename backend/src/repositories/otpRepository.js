/**
 * repositories/otpRepository.js — Drizzle ORM queries for the otps table.
 */

import { db } from '../db/index.js';
import { otps } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Upsert an OTP record for an email address and type (delete-then-insert pattern).
 * @param {{ email: string, type?: string, otpHash: string, expiresAt: Date, resendAvailableAt: Date }} data
 * @returns {Promise<object>} Created OTP record
 */
export async function upsertOtp({ email, type = 'LOGIN', otpHash, expiresAt, resendAvailableAt }) {
  // Clear any existing record to ensure unique constraint holds
  await db.delete(otps).where(and(eq(otps.email, email), eq(otps.type, type)));

  const result = await db
    .insert(otps)
    .values({
      email,
      type,
      otpHash,
      expiresAt,
      resendAvailableAt,
    })
    .returning();
  return result[0];
}

/**
 * Find an OTP record by email and type.
 * @param {string} email
 * @param {string} type
 * @returns {Promise<object|null>}
 */
export async function findByEmailAndType(email, type = 'LOGIN') {
  const result = await db
    .select()
    .from(otps)
    .where(and(eq(otps.email, email), eq(otps.type, type)))
    .limit(1);
  return result[0] || null;
}

/**
 * Delete an OTP record by email and type.
 * @param {string} email
 * @param {string} type
 * @returns {Promise<object|null>} Deleted OTP record
 */
export async function deleteByEmailAndType(email, type = 'LOGIN') {
  const result = await db
    .delete(otps)
    .where(and(eq(otps.email, email), eq(otps.type, type)))
    .returning();
  return result[0] || null;
}
