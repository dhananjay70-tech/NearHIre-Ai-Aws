/**
 * remotive.js — Remotive Remote Jobs API scraper
 * Free API, no key required.
 * API Docs: https://remotive.com/api/remote-jobs
 */

import axios from "axios";
import { normalizeJobType } from "./parser.js";

function trunc(str, max) {
  if (!str) return str;
  return String(str).slice(0, max);
}

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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

// Map Remotive categories to job types
function normalizeCategoryToJobType(category) {
  const c = (category || "").toLowerCase();
  if (c.includes("intern")) return "INTERNSHIP";
  if (c.includes("part")) return "PART_TIME";
  if (c.includes("contract") || c.includes("freelance")) return "CONTRACT";
  return "FULL_TIME";
}

const CATEGORIES_TO_FETCH = [
  "software-dev",
  "devops-sysadmin",
  "product",
  "design",
  "data",
  "frontend",
  "backend",
  "fullstack",
];

export async function scrapeRemotive() {
  const allJobs = [];
  const seenSlugs = new Set();

  for (const category of CATEGORIES_TO_FETCH) {
    try {
      console.log(`[Remotive Scraper] Fetching category: ${category}...`);
      const response = await axios.get("https://remotive.com/api/remote-jobs", {
        params: { category, limit: 25 },
        timeout: 12000,
      });

      const jobs = response.data?.jobs || [];
      console.log(`[Remotive Scraper] Found ${jobs.length} jobs for ${category}.`);

      for (const job of jobs) {
        const id = String(job.id);
        if (seenSlugs.has(id)) continue;
        seenSlugs.add(id);

        const rawDescription = stripHtml(job.description || "");
        const skills = extractSkillsFromText(`${job.title} ${rawDescription}`);
        const employmentType = normalizeCategoryToJobType(job.job_type || job.category);

        allJobs.push({
          sourceJobId: trunc(id, 200),
          title: trunc(job.title, 180),
          companyName: trunc(job.company_name || "Unknown", 150),
          companyWebsite: job.company_logo || "",
          location: trunc(job.candidate_required_location || "Worldwide", 250),
          city: trunc("Remote", 100),
          state: trunc("", 100),
          country: "India",
          latitude: null,
          longitude: null,
          salary: trunc(job.salary || "Not disclosed", 100),
          experience: job.title?.toLowerCase().includes("senior") ? "3+ years" : "1+ years",
          employmentType,
          workMode: "REMOTE",
          description: rawDescription || "No description provided.",
          skills,
          applyUrl: job.url,
          sourceName: "REMOTIVE",
          sourceLabel: trunc("Remotive", 100),
          postedAt: job.publication_date ? new Date(job.publication_date) : new Date(),
        });
      }

      // Small delay to be respectful
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`[Remotive Scraper] Error for category ${category}:`, error.message);
    }
  }

  return allJobs;
}
