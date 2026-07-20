/**
 * jooble.js — Jooble official Jobs API source.
 * Free. Requires JOOBLE_API_KEY.
 * Register at: https://jooble.org/api/about
 *
 * Gracefully returns [] when JOOBLE_API_KEY is not configured.
 */

import axios from "axios";
import { geocode, normalizeJobType, normalizeWorkMode, parseSalary } from "./parser.js";

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

const KEYWORDS = ["software developer", "react", "python", "data engineer"];
const LOCATION = process.env.JOOBLE_LOCATION || "India";

export async function scrapeJooble() {
  const apiKey = process.env.JOOBLE_API_KEY;

  if (!apiKey) {
    console.log("[Jooble Source] Skipped — JOOBLE_API_KEY not set.");
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const keywords of KEYWORDS) {
    try {
      console.log(`[Jooble Source] Fetching "${keywords}" (${LOCATION})...`);
      const response = await axios.post(
        `https://jooble.org/api/${apiKey}`,
        { keywords, location: LOCATION, page: "1" },
        { headers: { "Content-Type": "application/json" }, timeout: 12000 }
      );

      const jobs = response.data?.jobs || [];
      console.log(`[Jooble Source] Found ${jobs.length} for "${keywords}".`);

      for (const job of jobs) {
        // Jooble ids are not always present; fall back to a stable hash of the link.
        const id = String(job.id || job.link || `${job.title}-${job.company}`);
        if (seen.has(id)) continue;
        seen.add(id);

        const rawLocation = job.location || LOCATION;
        const parts = String(rawLocation).split(",").map((p) => p.trim());
        const city = parts[0] || "";
        const state = parts[1] || "";
        const geo = city ? await geocode(city, state, "India") : { lat: null, lon: null };

        const description = stripHtml(job.snippet || "");
        const parsedSalary = parseSalary(job.salary);

        allJobs.push({
          sourceJobId: trunc(id, 200),
          title: trunc(job.title, 180),
          companyName: trunc(job.company || "Unknown", 150),
          companyWebsite: "",
          companyLogo: null,
          location: trunc(rawLocation, 250),
          city: trunc(city, 100),
          state: trunc(state, 100),
          country: "India",
          latitude: geo.lat,
          longitude: geo.lon,
          salary: trunc(parsedSalary.display, 100),
          salaryMin: parsedSalary.min,
          salaryMax: parsedSalary.max,
          salaryPeriod: parsedSalary.period,
          experience: (job.title || "").toLowerCase().includes("senior")
            ? "3+ years"
            : "1+ years",
          employmentType: normalizeJobType(job.type, job.title),
          workMode: normalizeWorkMode(rawLocation, description),
          description: description || "No description provided.",
          skills: extractSkills(`${job.title} ${description}`),
          applyUrl: job.link,
          sourceName: "JOOBLE",
          sourceLabel: trunc("Jooble", 100),
          postedAt: job.updated ? new Date(job.updated) : new Date(),
        });
      }

      await new Promise((r) => setTimeout(r, 400));
    } catch (error) {
      console.error(`[Jooble Source] Error for "${keywords}":`, error.message);
    }
  }

  return allJobs;
}
