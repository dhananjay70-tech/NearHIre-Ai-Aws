/**
 * remoteok.js — RemoteOK public jobs API source.
 * Free, no API key required. Official API: https://remoteok.com/api
 *
 * Emits the shared scraper object shape consumed by scrapers/index.js.
 */

import axios from "axios";

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
  "AWS", "GCP", "Azure", "Git", "GitHub", "REST API", "GraphQL",
  "Java", "Spring Boot", "C++", "Go", "Rust", "PHP", "Laravel",
  "Next.js", "Express.js", "Flask", "Figma", "Linux", "CI/CD",
  "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
];

function extractSkills(text, tags = []) {
  const fromText = TECH_SKILLS.filter((s) =>
    new RegExp(`\\b${s.replace(".", "\\.").replace("+", "\\+")}\\b`, "i").test(text)
  );
  // RemoteOK also provides a `tags` array; merge unique.
  const fromTags = (tags || [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 8);
  return Array.from(new Set([...fromText, ...fromTags])).slice(0, 12);
}

function normalizeJobType(position = "", tags = []) {
  const text = (position + " " + (tags || []).join(" ")).toLowerCase();
  if (text.includes("intern")) return "INTERNSHIP";
  if (text.includes("contract") || text.includes("freelance")) return "CONTRACT";
  if (text.includes("part-time") || text.includes("part time")) return "PART_TIME";
  return "FULL_TIME";
}

export async function scrapeRemoteOK() {
  const allJobs = [];

  try {
    console.log("[RemoteOK Source] Fetching jobs from RemoteOK API...");
    const response = await axios.get("https://remoteok.com/api", {
      timeout: 12000,
      headers: {
        // RemoteOK requires a descriptive User-Agent.
        "User-Agent": "NearHireJobDiscoveryPlatform/1.0 (+https://nearhire.ai)",
        Accept: "application/json",
      },
    });

    const data = Array.isArray(response.data) ? response.data : [];
    // The first element is a legal/metadata notice object — skip anything without an id.
    const jobs = data.filter((item) => item && item.id && item.position);
    console.log(`[RemoteOK Source] Found ${jobs.length} jobs.`);

    for (const job of jobs) {
      const description = stripHtml(job.description || "");
      const salaryDisplay =
        job.salary_min || job.salary_max
          ? `$${job.salary_min || ""}${job.salary_max ? " – $" + job.salary_max : ""}/year`
          : "Not disclosed";

      allJobs.push({
        sourceJobId: trunc(String(job.id), 200),
        title: trunc(job.position, 180),
        companyName: trunc(job.company || "Unknown", 150),
        companyWebsite: job.url || "",
        companyLogo: job.company_logo || job.logo || null,
        location: trunc(job.location || "Remote", 250),
        city: "Remote",
        state: "",
        country: "India",
        latitude: null,
        longitude: null,
        salary: trunc(salaryDisplay, 100),
        salaryMin: job.salary_min || null,
        salaryMax: job.salary_max || null,
        salaryPeriod: "YEAR",
        experience: (job.position || "").toLowerCase().includes("senior")
          ? "3+ years"
          : "1+ years",
        employmentType: normalizeJobType(job.position, job.tags),
        workMode: "REMOTE",
        description: description || "No description provided.",
        skills: extractSkills(`${job.position} ${description}`, job.tags),
        applyUrl: job.apply_url || job.url,
        sourceName: "REMOTEOK",
        sourceLabel: trunc("RemoteOK", 100),
        postedAt: job.date ? new Date(job.date) : new Date(),
      });
    }
  } catch (error) {
    console.error("[RemoteOK Source] Error:", error.message);
  }

  return allJobs;
}
