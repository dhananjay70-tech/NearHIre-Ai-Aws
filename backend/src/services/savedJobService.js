/**
 * savedJobService.js — Business logic for saved jobs.
 */

import {
  createSavedJob,
  getSavedJobsByUser,
  findSavedJob,
  deleteSavedJob,
} from '../repositories/savedJobRepository.js';

function formatSavedJob(row) {
  return {
    savedId: row.saved_id,
    savedAt: row.saved_at,
    job: {
      id: row.id,
      title: row.title,
      description: row.description,
      jobType: row.job_type,
      workMode: row.work_mode,
      city: row.city,
      state: row.state,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      salaryPeriod: row.salary_period,
      experienceMin: row.experience_min,
      experienceMax: row.experience_max,
      postedAt: row.posted_at,
      applicationUrl: row.application_url,
      sourceName: row.source_name,
      sourceLabel: row.source_label,
      latitude: row.latitude,
      longitude: row.longitude,
      company: {
        id: row.company_id,
        name: row.company_name,
        website: row.company_website,
        logo: row.company_logo,
        isVerified: row.company_verified,
      },
      skills: row.skills || [],
    },
  };
}

export async function saveJob(userId, jobId) {
  try {
    const row = await createSavedJob(userId, jobId);
    return { saved: true, savedId: row.id };
  } catch (err) {
    if (err.code === '23505') {
      // Unique violation — already saved
      return { saved: true, alreadySaved: true };
    }
    if (err.code === '23503') {
      throw Object.assign(new Error('Job not found.'), { statusCode: 404 });
    }
    throw err;
  }
}

export async function getSavedJobs(userId) {
  const rows = await getSavedJobsByUser(userId);
  return rows.map(formatSavedJob);
}

export async function removeSavedJob(userId, jobId) {
  const existing = await findSavedJob(userId, jobId);
  if (!existing) {
    throw Object.assign(new Error('Saved job not found.'), { statusCode: 404 });
  }
  await deleteSavedJob(userId, jobId);
}
