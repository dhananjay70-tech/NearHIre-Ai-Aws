import coreApi from './coreApi.js';

/**
 * POST /api/saved-jobs/:jobId — save a job
 */
export async function saveJob(jobId) {
  const res = await coreApi.post(`/saved-jobs/${jobId}`);
  return res.data;
}

/**
 * GET /api/saved-jobs — list saved jobs
 */
export async function getSavedJobs() {
  const res = await coreApi.get('/saved-jobs');
  return res.data.data; // { savedJobs, count }
}

/**
 * DELETE /api/saved-jobs/:jobId — remove saved job
 */
export async function unsaveJob(jobId) {
  const res = await coreApi.delete(`/saved-jobs/${jobId}`);
  return res.data;
}

/**
 * POST /api/applications — record an application
 */
export async function createApplication(jobId, status = 'APPLIED', notes = '') {
  const res = await coreApi.post('/applications', { jobId, status, notes });
  return res.data;
}

/**
 * GET /api/applications — list all applications
 */
export async function getApplications() {
  const res = await coreApi.get('/applications');
  return res.data.data; // { applications, count }
}

/**
 * PATCH /api/applications/:id — update status/notes
 */
export async function updateApplication(id, updates) {
  const res = await coreApi.patch(`/applications/${id}`, updates);
  return res.data.data;
}

/**
 * DELETE /api/applications/:id — delete tracker record
 */
export async function deleteApplication(id) {
  const res = await coreApi.delete(`/applications/${id}`);
  return res.data;
}

/**
 * GET /api/dashboard — aggregated stats
 */
export async function getDashboard() {
  const res = await coreApi.get('/dashboard');
  return res.data.data;
}
