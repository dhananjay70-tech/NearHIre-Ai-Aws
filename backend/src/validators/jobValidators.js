/**
 * jobValidators.js — Zod schemas for job creation.
 */

import { z } from 'zod';

export const createJobSchema = z.object({
  companyId:       z.string().uuid('companyId must be a valid UUID'),
  title:           z.string().trim().min(2).max(180),
  description:     z.string().trim().min(10),
  requirements:    z.string().trim().optional(),
  experienceMin:   z.number().int().min(0).default(0),
  experienceMax:   z.number().int().min(0).optional(),
  salaryMin:       z.number().int().min(0).optional(),
  salaryMax:       z.number().int().min(0).optional(),
  salaryPeriod:    z.enum(['MONTH', 'YEAR', 'STIPEND']).default('YEAR'),
  jobType:         z.enum(['INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'CONTRACT']),
  workMode:        z.enum(['ONSITE', 'HYBRID', 'REMOTE']),
  address:         z.string().trim().optional(),
  city:            z.string().trim().max(100).optional(),
  state:           z.string().trim().max(100).optional(),
  postalCode:      z.string().trim().max(20).optional(),
  latitude:        z.number().min(-90).max(90).optional(),
  longitude:       z.number().min(-180).max(180).optional(),
  applicationUrl:  z.string().url('applicationUrl must be a valid URL'),
  sourceName:      z.string().trim().max(100).default('MANUAL'),
  sourceJobId:     z.string().trim().max(200).optional(),
  sourceLabel:     z.string().trim().max(100).optional(),
  postedAt:        z.string().datetime().optional(),
  expiresAt:       z.string().datetime().optional(),
  requiredSkills:  z.array(z.string().trim()).default([]),
  preferredSkills: z.array(z.string().trim()).default([]),
});

export const createCompanySchema = z.object({
  name:        z.string().trim().min(2).max(150),
  description: z.string().trim().optional(),
  websiteUrl:  z.string().url().optional(),
  logoUrl:     z.string().url().optional(),
  address:     z.string().trim().optional(),
  city:        z.string().trim().max(100).optional(),
  state:       z.string().trim().max(100).optional(),
  postalCode:  z.string().trim().max(20).optional(),
  latitude:    z.number().min(-90).max(90).optional(),
  longitude:   z.number().min(-180).max(180).optional(),
});
