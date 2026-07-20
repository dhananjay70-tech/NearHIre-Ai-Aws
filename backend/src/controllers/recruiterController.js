/**
 * recruiterController.js — Express controller handlers for Recruiter Portal endpoints.
 */

import * as recruiterService from '../services/recruiterService.js';
import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getJobEnumMetadata } from '../utils/jobEnums.js';

// POST /api/recruiter/register
export async function register(req, res) {
  const { name, email, password, companyName, industry, phone } = req.body;
  const { user, token } = await recruiterService.registerRecruiter({
    name,
    email,
    password,
    companyName,
    industry,
    phone,
  });

  authService.setAuthCookie(res, token);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Recruiter account registered successfully.',
    data: { user, token },
  });
}

// POST /api/recruiter/login
export async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Login successful.',
    data: result,
  });
}

// GET /api/recruiter/dashboard
export async function getDashboard(req, res) {
  const stats = await recruiterService.getDashboardStats(req.user.id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Recruiter dashboard stats retrieved successfully.',
    data: stats,
  });
}

// GET /api/recruiter/jobs — supports ?search &status &jobType &sortBy &page &limit
export async function getJobs(req, res) {
  const data = await recruiterService.getRecruiterJobs(req.user.id, req.query);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Recruiter jobs retrieved successfully.',
    data,
  });
}

// GET /api/recruiter/jobs/:id
export async function getJobById(req, res) {
  const job = await recruiterService.getRecruiterJobById(req.user.id, req.params.id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job retrieved successfully.',
    data: { job },
  });
}

// GET /api/recruiter/company
export async function getCompany(req, res) {
  const company = await recruiterService.getRecruiterCompany(req.user.id);
  return sendSuccess(res, {
    statusCode: 200,
    message: company ? 'Company retrieved successfully.' : 'No company profile yet.',
    data: { company },
  });
}

// PUT /api/recruiter/company
export async function updateCompany(req, res) {
  const company = await recruiterService.upsertRecruiterCompany(req.user.id, req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Company profile saved successfully.',
    data: { company },
  });
}

// GET /api/recruiter/meta — enum values the forms must use
export async function getMeta(req, res) {
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Recruiter metadata retrieved successfully.',
    data: getJobEnumMetadata(),
  });
}

// POST /api/recruiter/jobs
export async function postJob(req, res) {
  const job = await recruiterService.postJob(req.user.id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Job published successfully.',
    data: job,
  });
}

// PUT /api/recruiter/jobs/:id
export async function updateJob(req, res) {
  const job = await recruiterService.updateJob(req.user.id, req.params.id, req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job updated successfully.',
    data: job,
  });
}

// DELETE /api/recruiter/jobs/:id
export async function deleteJob(req, res) {
  const result = await recruiterService.deleteJob(req.user.id, req.params.id);
  return sendSuccess(res, {
    statusCode: 200,
    message: result.message,
    data: result,
  });
}

// GET /api/recruiter/applicants OR GET /api/recruiter/jobs/:jobId/applicants
export async function getApplicants(req, res) {
  const jobId = req.params.jobId || null;
  const data = await recruiterService.getApplicants(req.user.id, jobId, req.query);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Applicants retrieved successfully.',
    data,
  });
}

// PUT /api/recruiter/applicants/:applicationId
export async function updateApplicantStatus(req, res) {
  const { applicationId } = req.params;
  const { status } = req.body;
  const updated = await recruiterService.updateApplicantStatus(req.user.id, applicationId, status);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Applicant status updated successfully.',
    data: updated,
  });
}

// GET /api/recruiter/analytics
export async function getAnalytics(req, res) {
  const analytics = await recruiterService.getRecruiterAnalytics(req.user.id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Recruiter analytics retrieved successfully.',
    data: analytics,
  });
}
