/**
 * applicationService.js — Business logic for applications.
 */

import {
  createApplication,
  getApplicationsByUser,
  getApplicationById,
  findApplication,
  updateApplication,
  deleteApplication,
  ALLOWED_STATUSES,
} from '../repositories/applicationRepository.js';

function formatApplication(row) {
  return {
    id: row.id,
    status: row.status,
    notes: row.notes,
    appliedAt: row.applied_at,
    updatedAt: row.updated_at,
    job: {
      id: row.job_id,
      title: row.job_title,
      city: row.job_city,
      state: row.job_state,
      jobType: row.job_type,
      workMode: row.work_mode,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      salaryPeriod: row.salary_period,
      applicationUrl: row.application_url,
      sourceName: row.source_name,
      sourceLabel: row.source_label,
      company: {
        id: row.company_id,
        name: row.company_name,
        website: row.company_website,
        logo: row.company_logo,
        isVerified: row.company_verified,
      },
    },
  };
}

export async function trackApplication(userId, jobId, status = 'APPLIED', notes = null) {
  if (status && !ALLOWED_STATUSES.includes(status)) {
    throw Object.assign(
      new Error(`Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`),
      { statusCode: 400 }
    );
  }

  const existing = await findApplication(userId, jobId);
  if (existing) {
    return { created: false, application: { id: existing.id, status: existing.status } };
  }

  try {
    const row = await createApplication(userId, jobId, status, notes);
    return { created: true, application: row };
  } catch (err) {
    if (err.code === '23505') {
      const existing2 = await findApplication(userId, jobId);
      return { created: false, application: existing2 };
    }
    if (err.code === '23503') {
      throw Object.assign(new Error('Job not found.'), { statusCode: 404 });
    }
    throw err;
  }
}

export async function getApplications(userId) {
  const rows = await getApplicationsByUser(userId);
  return rows.map(formatApplication);
}

export async function updateApplicationStatus(applicationId, userId, updates) {
  if (updates.status && !ALLOWED_STATUSES.includes(updates.status)) {
    throw Object.assign(
      new Error(`Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`),
      { statusCode: 400 }
    );
  }

  const row = await updateApplication(applicationId, userId, updates);
  if (!row) {
    throw Object.assign(new Error('Application not found.'), { statusCode: 404 });
  }
  return row;
}

export async function deleteApplicationRecord(applicationId, userId) {
  const app = await getApplicationById(applicationId, userId);
  if (!app) {
    throw Object.assign(new Error('Application not found.'), { statusCode: 404 });
  }
  await deleteApplication(applicationId, userId);
}

export { ALLOWED_STATUSES };
