/**
 * db/relations.js — Drizzle ORM relations
 * Defines relationships between tables
 */

import { relations } from 'drizzle-orm';
import { users, userPreferences, companies, jobs, skills, jobSkills, savedJobs, applications } from './schema.js';

export const usersRelations = relations(users, ({ many, one }) => ({
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  savedJobs: many(savedJobs),
  applications: many(applications),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  skills: many(jobSkills),
  savedJobs: many(savedJobs),
  applications: many(applications),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  jobSkills: many(jobSkills),
}));

export const jobSkillsRelations = relations(jobSkills, ({ one }) => ({
  job: one(jobs, {
    fields: [jobSkills.jobId],
    references: [jobs.id],
  }),
  skill: one(skills, {
    fields: [jobSkills.skillId],
    references: [skills.id],
  }),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  user: one(users, {
    fields: [savedJobs.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [savedJobs.jobId],
    references: [jobs.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
}));
