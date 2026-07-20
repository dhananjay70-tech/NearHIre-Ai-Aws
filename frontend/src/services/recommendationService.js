import aiApi from "./aiApi.js";

function cleanPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === undefined || value === null || value === "") {
        return false;
      }

      if (Array.isArray(value) && value.length === 0) {
        return false;
      }

      return true;
    })
  );
}

/**
 * Get location-aware, ranked job recommendations.
 *
 * @param {string[]} extractedSkills
 * @param {object} options
 * @param {string[]} options.experienceHints
 * @param {number|null} options.latitude
 * @param {number|null} options.longitude
 * @param {number} options.radiusKm
 * @param {number} options.limit
 * @param {object} options.filters
 */
export async function getRecommendations(
  extractedSkills = [],
  options = {}
) {
  const {
    experienceHints = [],
    latitude = null,
    longitude = null,
    radiusKm = 20,
    limit = 10,
    filters = {},
  } = options;

  const payload = cleanPayload({
    extractedSkills,
    experienceHints,
    latitude:
      Number.isFinite(Number(latitude))
        ? Number(latitude)
        : null,
    longitude:
      Number.isFinite(Number(longitude))
        ? Number(longitude)
        : null,
    radiusKm: Number(radiusKm) || 20,
    limit: Number(limit) || 10,
    filters: cleanPayload(filters),
  });

  const response = await aiApi.post(
    "/recommendations/jobs",
    payload
  );

  return response.data;
}

export async function getInterviewQuestions(payload) {
  const response = await aiApi.post(
    "/agent/interview-questions",
    cleanPayload(payload)
  );

  return response.data;
}

export async function getLearningRoadmap(payload) {
  const response = await aiApi.post(
    "/agent/learning-roadmap",
    cleanPayload(payload)
  );

  return response.data;
}

export async function getCoverLetter(payload) {
  const response = await aiApi.post(
    "/agent/cover-letter",
    cleanPayload(payload)
  );

  return response.data;
}

export async function getResumeFeedback(payload) {
  const response = await aiApi.post(
    "/agent/resume-feedback",
    cleanPayload(payload)
  );

  return response.data;
}

export async function getPreparationChecklist(payload) {
  const response = await aiApi.post(
    "/agent/preparation-checklist",
    cleanPayload(payload)
  );

  return response.data;
}