/**
 * arbeitnow.js — Arbeitnow Job Board API scraper
 * Free API, no key required.
 * API Docs: https://www.arbeitnow.com/api/job-board-api
 */

import axios from "axios";
import { normalizeWorkMode, normalizeJobType } from "./parser.js";

function trunc(str, max) {
  if (!str) return str;
  return String(str).slice(0, max);
}

function extractSkillsFromText(text) {
  const techSkills = [
    "React", "Vue", "Angular", "Node.js", "Python", "Django", "FastAPI",
    "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind CSS", "SQL",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
    "AWS", "GCP", "Azure", "Git", "GitHub", "REST API", "GraphQL",
    "Java", "Spring Boot", "C++", "Go", "Rust", "PHP", "Laravel",
    "Next.js", "Express.js", "Flask", "Figma", "Linux", "CI/CD",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
  ];
  return techSkills.filter(s =>
    new RegExp(`\\b${s.replace(".", "\\.").replace("+", "\\+")}\\b`, "i").test(text)
  );
}

export async function scrapeArbeitnow() {
  const allJobs = [];

  try {
    console.log("[Arbeitnow Scraper] Fetching jobs from Arbeitnow API...");
    const response = await axios.get("https://www.arbeitnow.com/api/job-board-api", {
      timeout: 12000,
    });

    const jobs = response.data?.data || [];
    console.log(`[Arbeitnow Scraper] Found ${jobs.length} jobs.`);

    for (const job of jobs) {
      const description = job.description || "";
      const skills = extractSkillsFromText(`${job.title} ${description}`);

      // Arbeitnow is remote-first; most are REMOTE
      const workMode = job.remote ? "REMOTE" : normalizeWorkMode(job.location || "", description);
      const employmentType = normalizeJobType("", job.title);

      // Default location for remote-heavy board
      const city = "Remote";
      const state = "";
      const country = "India";

      allJobs.push({
        sourceJobId: trunc(String(job.slug || job.url), 200),
        title: trunc(job.title, 180),
        companyName: trunc(job.company_name || "Unknown", 150),
        companyWebsite: job.url || "",
        location: trunc(job.location || "Remote", 250),
        city: trunc(city, 100),
        state: trunc(state, 100),
        country,
        latitude: null,
        longitude: null,
        salary: "Not disclosed",
        experience: job.title?.toLowerCase().includes("senior") ? "3+ years" : "1+ years",
        employmentType,
        workMode,
        description: description || "No description provided.",
        skills,
        applyUrl: job.url,
        sourceName: "ARBEITNOW",
        sourceLabel: trunc("Arbeitnow", 100),
        postedAt: job.created_at ? new Date(job.created_at * 1000) : new Date(),
      });
    }
  } catch (error) {
    console.error("[Arbeitnow Scraper] Error:", error.message);
  }

  return allJobs;
}
