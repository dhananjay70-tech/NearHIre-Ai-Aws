/**
 * userRepository.js — Drizzle ORM queries for the users table.
 * All queries use Drizzle ORM instead of raw SQL.
 */

import { db } from '../db/index.js';
import { users, userPreferences } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { normalizeRole } from '../utils/roles.js';

// ─── Find ─────────────────────────────────────────────────────────────────────

/**
 * Find a user by email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findByEmail(email) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
}

/**
 * Find a user by UUID id (no password_hash).
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      profileImageUrl: users.profileImageUrl,
      latitude: users.latitude,
      longitude: users.longitude,
      address: users.address,
      city: users.city,
      state: users.state,
      postalCode: users.postalCode,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] || null;
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Create a new user row.
 * @param {{ name, email, password_hash }} data
 * @returns {Promise<object>} Created user (no password_hash)
 */
export async function createUser({ name, email, password_hash, role }) {
  const result = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: password_hash,
      role: normalizeRole(role),
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      profileImageUrl: users.profileImageUrl,
      latitude: users.latitude,
      longitude: users.longitude,
      address: users.address,
      city: users.city,
      state: users.state,
      postalCode: users.postalCode,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
  return result[0];
}

/**
 * Create a default user_preferences row.
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function createPreferences(userId) {
  try {
    const result = await db
      .insert(userPreferences)
      .values({ userId })
      .returning();
    return result[0] || null;
  } catch (err) {
    console.error('[userRepo] Warning: createPreferences failed for user:', userId, err.message);
    return null;
  }
}

// ─── Read preferences ────────────────────────────────────────────────────────

/**
 * Get preferences for a user.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getPreferences(userId) {
  const result = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return result[0] || null;
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update allowed profile fields for a user.
 * Only updates fields that are provided (partial update).
 * @param {string} userId
 * @param {object} fields - Partial profile fields
 * @returns {Promise<object>} Updated user (no password_hash)
 */
export async function updateProfile(userId, fields) {
  const allowed = [
    'name', 'phone', 'profile_image_url', 'address',
    'city', 'state', 'postal_code', 'latitude', 'longitude',
  ];

  const updateData = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      // Convert camelCase to snake_case for database
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateData[dbKey] = fields[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return findById(userId);
  }

  const result = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      profileImageUrl: users.profileImageUrl,
      latitude: users.latitude,
      longitude: users.longitude,
      address: users.address,
      city: users.city,
      state: users.state,
      postalCode: users.postalCode,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
  return result[0];
}

/**
 * Update allowed preferences fields for a user.
 * @param {string} userId
 * @param {object} fields - Partial preference fields
 * @returns {Promise<object>} Updated preferences
 */
export async function updatePreferences(userId, fields) {
  const allowed = [
    'preferred_role', 'minimum_salary', 'maximum_distance_km',
    'preferred_job_types', 'preferred_work_modes', 'preferred_locations',
  ];

  const updateData = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      // Convert camelCase to snake_case for database
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateData[dbKey] = fields[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return getPreferences(userId);
  }

  const result = await db
    .update(userPreferences)
    .set(updateData)
    .where(eq(userPreferences.userId, userId))
    .returning();
  return result[0];
}

/**
 * Update a user's password hash.
 * @param {string} userId
 * @param {string} passwordHash
 * @returns {Promise<object>} Updated user row
 */
export async function updatePassword(userId, passwordHash) {
  const result = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId))
    .returning();
  return result[0];
}
