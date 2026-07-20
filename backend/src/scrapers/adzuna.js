/**
 * adzuna.js — Adzuna official Jobs API source.
 * Free tier. Requires ADZUNA_APP_ID and ADZUNA_APP_KEY.
 * Register at: https://developer.adzuna.com/
 * Docs: https://developer.adzuna.com/activedocs
 *
 * Gracefully returns [] when credentials are not configured, so the
 * pipeline never breaks in environments without Adzuna keys.
 */

import axios from "axios";
import { geocode, normalizeJobType, normalizeWorkMode } from "./parser.js";

function trunc(str, max) {
  if (!str) return str;
  return String(str).slice(0, max);
}

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const TECH_SKILLS = [
  "React", "Vue", "Angular", "Node.js", "Python", "Django", "FastAPI",
  "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind CSS", "SQL",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
  "AWS", "GCP", "Azure", "Git", "REST API", "GraphQL", "Java",
  "Spring Boot", "C++", "Go", "Rust", "PHP", "Next.js", "Express.js",
  "Flask", "Linux", "Machine Learning", "TensorFlow", "PyTorch",
];

function extractSkills(text) {
  return TECH_SKILLS.filter((s) =>
    new RegExp(`\\b${s.replace(".", "\\.").replace("+", "\\+")}\\b`, "i").test(text)
  ).slice(0, 12);
}

// Search terms + country codes to pull a broad, relevant set of jobs.
const QUERIES = [
  "software developer",
  "frontend developer",
  "backend developer",
  "data engineer",
  "python developer",
];

// Adzuna country endpoints. "in" = India (primary market for this app).
const COUNTRY = process.env.ADZUNA_COUNTRY || "in";
const RESULTS_PER_QUERY = 20;

export async function scrapeAdzuna() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.log("[Adzuna Source] Skipped — ADZUNA_APP_ID / ADZUNA_APP_KEY not set.");
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const what of QUERIES) {
    try {
      console.log(`[Adzuna Source] Fetching "${what}" (${COUNTRY})...`);
      const url = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1`;
      const response = await axios.get(url, {
        params: {
          app_id: appId,
          app_key: appKey,
          results_per_page: RESULTS_PER_QUERY,
          what,
          content_type: "application/json",
        },
        timeout: 12000,
      });

      const results = response.data?.results || [];
      console.log(`[Adzuna Source] Found ${results.length} for "${what}".`);

      for (const job of results) {
        const id = String(job.id);
        if (seen.has(id)) continue;
        seen.add(id);

        const city = job.location?.area?.[1] || job.location?.display_name || "";
        const state = job.location?.area?.[2] || "";
        let latitude = job.latitude ?? null;
        let longitude = job.longitude ?? null;
        if ((latitude === null || longitude === null) && city) {
          const geo = await geocode(city, state, "India");
          latitude = geo.lat;
          longitude = geo.lon;
        }

        const description = stripHtml(job.description || "");
        const salaryMin = job.salary_min ? Math.round(job.salary_min) : null;
        const salaryMax = job.salary_max ? Math.round(job.salary_max) : null;
        const salaryDisplay =
          salaryMin || salaryMax
            ? `${salaryMin || ""}${salaryMax ? " – " + salaryMax : ""}`
            : "Not disclosed";

        allJobs.push({
          sourceJobId: trunc(id, 200),
          title: trunc(job.title, 180),
          companyName: trunc(job.company?.display_name || "Unknown", 150),
          companyWebsite: "",
          companyLogo: null,
          location: trunc(job.location?.display_name || city || "India", 250),
          city: trunc(city, 100),
          state: trunc(state, 100),
          country: "India",
          latitude,
          longitude,
          salary: trunc(salaryDisplay, 100),
          salaryMin,
          salaryMax,
          salaryPeriod: "YEAR",
          experience: (job.title || "").toLowerCase().includes("senior")
            ? "3+ years"
            : "1+ years",
          employmentType: normalizeJobType(job.contract_time, job.title),
          workMode: normalizeWorkMode(job.location?.display_name, description),
          description: description || "No description provided.",
          skills: extractSkills(`${job.title} ${description}`),
          applyUrl: job.redirect_url,
          sourceName: "ADZUNA",
          sourceLabel: trunc("Adzuna", 100),
          postedAt: job.created ? new Date(job.created) : new Date(),
        });
      }

      await new Promise((r) => setTimeout(r, 400));
    } catch (error) {
      console.error(`[Adzuna Source] Error for "${what}":`, error.message);
    }
  }

  return allJobs;
}
