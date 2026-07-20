import coreApi from "./coreApi";

/** Register a new recruiter account */
export async function recruiterRegister(data) {
  const response = await coreApi.post("/recruiter/register", data);
  return response.data;
}

/** Recruiter login */
export async function recruiterLogin(data) {
  const response = await coreApi.post("/recruiter/login", data);
  return response.data;
}

/** Get recruiter dashboard stats */
export async function getRecruiterDashboard() {
  const response = await coreApi.get("/recruiter/dashboard");
  return response.data.data;
}

/** Get jobs posted by recruiter (supports search/status/jobType/sortBy/page/limit) */
export async function getRecruiterJobs(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)
  );
  const response = await coreApi.get("/recruiter/jobs", { params: clean });
  return response.data.data;
}

/** Get a single job owned by this recruiter */
export async function getRecruiterJobById(id) {
  const response = await coreApi.get(`/recruiter/jobs/${id}`);
  return response.data.data.job;
}

/** Enum values (job types, work modes…) — the source of truth for form dropdowns */
export async function getRecruiterMeta() {
  const response = await coreApi.get("/recruiter/meta");
  return response.data.data;
}

/** Get the recruiter's company profile */
export async function getCompany() {
  const response = await coreApi.get("/recruiter/company");
  return response.data.data.company;
}

/** Create or update the recruiter's company profile */
export async function updateCompany(data) {
  const response = await coreApi.put("/recruiter/company", data);
  return response.data.data.company;
}

/** Post a new job */
export async function postJob(data) {
  const response = await coreApi.post("/recruiter/jobs", data);
  return response.data;
}

/** Update a job */
export async function updateJob(id, data) {
  const response = await coreApi.put(`/recruiter/jobs/${id}`, data);
  return response.data;
}

/** Delete a job */
export async function deleteJob(id) {
  const response = await coreApi.delete(`/recruiter/jobs/${id}`);
  return response.data;
}

/** Get applicants for a job */
export async function getApplicants(jobId, params = {}) {
  const url = jobId ? `/recruiter/jobs/${jobId}/applicants` : "/recruiter/applicants";
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)
  );
  const response = await coreApi.get(url, { params: clean });
  return response.data.data;
}

/** Update applicant status (accept/reject/interview) */
export async function updateApplicantStatus(applicationId, status) {
  const response = await coreApi.put(`/recruiter/applicants/${applicationId}`, { status });
  return response.data;
}

/** Get recruiter analytics */
export async function getRecruiterAnalytics() {
  const response = await coreApi.get("/recruiter/analytics");
  return response.data.data;
}
