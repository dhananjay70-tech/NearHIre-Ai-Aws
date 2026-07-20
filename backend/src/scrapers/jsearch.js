/**
 * jsearch.js — JSearch (RapidAPI) Jobs API source.
 * Aggregates postings from LinkedIn, Indeed, Glassdoor, ZipRecruiter, etc.
 * Requires RAPIDAPI_KEY (JSearch subscription on RapidAPI).
 * Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 *
 * Gracefully returns [] when RAPIDAPI_KEY is not configured.
 */

import axios from "axios";
import { geocode, normalizeJobType, normalizeWorkMode } from "./parser.js";

function trunc(str, max) {
  if (!str) return str;
  return String(str).slice(0, max);
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

function mapEmploymentType(jsearchType, title) {
  const t = (jsearchType || "").toUpperCase();
  if (t === "INTERN") return "INTERNSHIP";
  if (t === "CONTRACTOR") return "CONTRACT";
  if (t === "PARTTIME") return "PART_TIME";
  if (t === "FULLTIME") return "FULL_TIME";
  return normalizeJobType(jsearchType, title);
}

// Queries include a location hint so JSearch returns India-relevant jobs.
const QUERIES = [
  "software developer in India",
  "react developer in India",
  "python developer in India",
  "data engineer in India",
];

export async function scrapeJSearch() {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    console.log("[JSearch Source] Skipped — RAPIDAPI_KEY not set.");
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const query of QUERIES) {
    try {
      console.log(`[JSearch Source] Fetching "${query}"...`);
      const response = await axios.get("https://jsearch.p.rapidapi.com/search", {
        params: { query, page: "1", num_pages: "1", date_posted: "week" },
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
        timeout: 15000,
      });

      const results = response.data?.data || [];
      console.log(`[JSearch Source] Found ${results.length} for "${query}".`);

      for (const job of results) {
        const id = String(job.job_id);
        if (seen.has(id)) continue;
        seen.add(id);

        const city = job.job_city || "";
        const state = job.job_state || "";
        let latitude = job.job_latitude ?? null;
        let longitude = job.job_longitude ?? null;
        if ((latitude === null || longitude === null) && city) {
          const geo = await geocode(city, state, job.job_country || "India");
          latitude = geo.lat;
          longitude = geo.lon;
        }

        const description = (job.job_description || "").slice(0, 5000);
        const salaryMin = job.job_min_salary ? Math.round(job.job_min_salary) : null;
        const salaryMax = job.job_max_salary ? Math.round(job.job_max_salary) : null;
        const period = (job.job_salary_period || "YEAR").toUpperCase();
        const salaryPeriod = ["MONTH", "YEAR"].includes(period) ? period : "YEAR";
        const salaryDisplay =
          salaryMin || salaryMax
            ? `${salaryMin || ""}${salaryMax ? " – " + salaryMax : ""}`
            : "Not disclosed";

        const workMode = job.job_is_remote
          ? "REMOTE"
          : normalizeWorkMode(`${city} ${state}`, description);

        allJobs.push({
          sourceJobId: trunc(id, 200),
          title: trunc(job.job_title, 180),
          companyName: trunc(job.employer_name || "Unknown", 150),
          companyWebsite: job.employer_website || "",
          companyLogo: job.employer_logo || null,
          location: trunc(
            [city, state, job.job_country].filter(Boolean).join(", ") || "India",
            250
          ),
          city: trunc(city, 100),
          state: trunc(state, 100),
          country: job.job_country || "India",
          latitude,
          longitude,
          salary: trunc(salaryDisplay, 100),
          salaryMin,
          salaryMax,
          salaryPeriod,
          experience: (job.job_title || "").toLowerCase().includes("senior")
            ? "3+ years"
            : "1+ years",
          employmentType: mapEmploymentType(job.job_employment_type, job.job_title),
          workMode,
          description: description || "No description provided.",
          skills: extractSkills(`${job.job_title} ${description}`),
          applyUrl: job.job_apply_link,
          sourceName: "JSEARCH",
          sourceLabel: trunc("JSearch", 100),
          postedAt: job.job_posted_at_datetime_utc
            ? new Date(job.job_posted_at_datetime_utc)
            : new Date(),
        });
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`[JSearch Source] Error for "${query}":`, error.message);
    }
  }

  return allJobs;
}
