/**
 * db/schema.js — Drizzle ORM schema definitions
 * Converts all SQL tables to Drizzle schema
 */

import { pgTable, varchar, text, integer, boolean, timestamp, uuid, numeric, index, pgEnum, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────

// users.role is a real Postgres ENUM (`user_role`) in the live database with
// labels 'USER' | 'ADMIN' | 'RECRUITER'. 'USER' is the job-seeker role.
export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN', 'RECRUITER']);
export const USER_ROLES = ['USER', 'ADMIN', 'RECRUITER'];
export const jobTypeEnum = pgEnum('job_type', ['INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'CONTRACT']);
export const workModeEnum = pgEnum('work_mode', ['ONSITE', 'HYBRID', 'REMOTE']);
export const salaryPeriodEnum = pgEnum('salary_period', ['MONTH', 'YEAR', 'STIPEND']);
export const skillImportanceEnum = pgEnum('skill_importance', ['REQUIRED', 'PREFERRED']);
export const applicationStatusEnum = pgEnum('application_status', ['APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN']);

// ─── Users Table ─────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('USER').notNull(),
  phone: varchar('phone', { length: 20 }),
  profileImageUrl: text('profile_image_url'),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  roleIdx: index('idx_users_role').on(table.role),
  cityIdx: index('idx_users_city').on(table.city),
}));

// ─── User Preferences Table ─────────────────────────────────────────────────

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  preferredRole: varchar('preferred_role', { length: 150 }),
  minimumSalary: integer('minimum_salary'),
  maximumDistanceKm: numeric('maximum_distance_km', { precision: 8, scale: 2 }).default('10').notNull(),
  preferredJobTypes: jsonb('preferred_job_types').default([]).notNull(),
  preferredWorkModes: jsonb('preferred_work_modes').default([]).notNull(),
  preferredLocations: jsonb('preferred_locations').default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_user_prefs_user_id').on(table.userId),
}));

// ─── Companies Table ─────────────────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  websiteUrl: text('website_url'),
  logoUrl: text('logo_url'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_companies_name').on(table.name),
  cityIdx: index('idx_companies_city').on(table.city),
}));

// ─── Jobs Table ──────────────────────────────────────────────────────────────

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 180 }).notNull(),
  description: text('description').notNull(),
  requirements: text('requirements'),
  experienceMin: integer('experience_min').default(0).notNull(),
  experienceMax: integer('experience_max'),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryPeriod: salaryPeriodEnum('salary_period').default('YEAR').notNull(),
  jobType: jobTypeEnum('job_type').notNull(),
  workMode: workModeEnum('work_mode').notNull(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  applicationUrl: text('application_url').notNull(),
  sourceName: varchar('source_name', { length: 100 }).notNull(),
  sourceJobId: varchar('source_job_id', { length: 200 }),
  sourceLabel: varchar('source_label', { length: 100 }),
  postedAt: timestamp('posted_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  titleIdx: index('idx_jobs_title').on(table.title),
  cityIdx: index('idx_jobs_city').on(table.city),
  jobTypeIdx: index('idx_jobs_job_type').on(table.jobType),
  workModeIdx: index('idx_jobs_work_mode').on(table.workMode),
  isActiveIdx: index('idx_jobs_is_active').on(table.isActive),
  postedAtIdx: index('idx_jobs_posted_at').on(table.postedAt),
  latLngIdx: index('idx_jobs_lat_lng').on(table.latitude, table.longitude),
}));

// ─── Skills Table ───────────────────────────────────────────────────────────

export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  normalizedName: varchar('normalized_name', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  normalizedNameIdx: index('idx_skills_normalized_name').on(table.normalizedName),
}));

// ─── Job Skills Table (Many-to-Many) ─────────────────────────────────────────

export const jobSkills = pgTable('job_skills', {
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  importance: skillImportanceEnum('importance').default('REQUIRED').notNull(),
}, (table) => ({
  pk: {
    columns: [table.jobId, table.skillId],
  },
  jobIdIdx: index('idx_job_skills_job_id').on(table.jobId),
  skillIdIdx: index('idx_job_skills_skill_id').on(table.skillId),
}));

// ─── Saved Jobs Table ───────────────────────────────────────────────────────

export const savedJobs = pgTable('saved_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_saved_jobs_user_id').on(table.userId),
  jobIdIdx: index('idx_saved_jobs_job_id').on(table.jobId),
  uniqueUserJob: {
    columns: [table.userId, table.jobId],
  },
}));

// ─── Applications Table ───────────────────────────────────────────────────────

export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  status: applicationStatusEnum('status').default('APPLIED').notNull(),
  notes: text('notes'),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_applications_user_id').on(table.userId),
  jobIdIdx: index('idx_applications_job_id').on(table.jobId),
  statusIdx: index('idx_applications_status').on(table.status),
  uniqueUserJob: {
    columns: [table.userId, table.jobId],
  },
}));

// ─── OTPs Table ─────────────────────────────────────────────────────────────

export const otps = pgTable('otps', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 150 }).notNull(),
  type: varchar('type', { length: 20 }).default('LOGIN').notNull(),
  otpHash: text('otp_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  resendAvailableAt: timestamp('resend_available_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailTypeUq: uniqueIndex('idx_otps_email_type').on(table.email, table.type),
}));
