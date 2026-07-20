import axios from "axios";
import { geocode, normalizeWorkMode, normalizeJobType } from "./parser.js";

// Truncate string to max allowed DB column length
function trunc(str, max) {
  if (!str) return str;
  return String(str).slice(0, max);
}

// List of verified companies using Lever API (verified working IDs)
const LEVER_COMPANIES = [
  { name: "Coinbase", companyId: "coinbase", domain: "https://coinbase.com" },
  { name: "DoorDash", companyId: "doordash", domain: "https://doordash.com" },
  { name: "Robinhood", companyId: "robinhood", domain: "https://robinhood.com" },
  { name: "Brex", companyId: "brex", domain: "https://brex.com" },
  { name: "Plaid", companyId: "plaid", domain: "https://plaid.com" },
];

export async function scrapeLever() {
  const allJobs = [];

  for (const company of LEVER_COMPANIES) {
    try {
      console.log(`[Lever Scraper] Fetching jobs for ${company.name}...`);
      const url = `https://api.lever.co/v0/postings/${company.companyId}?mode=json`;
      
      const response = await axios.get(url, { timeout: 8000 });
      if (!Array.isArray(response.data)) {
        continue;
      }

      const jobsList = response.data;
      console.log(`[Lever Scraper] Found ${jobsList.length} jobs for ${company.name}.`);

      for (const job of jobsList) {
        // Location processing
        const rawLocation = job.categories?.location || "Remote";
        const parts = rawLocation.split(",").map(p => p.trim());
        const city = parts[0] || "Delhi";
        const state = parts[1] || "";
        const country = parts[2] || "India";

        // Geocoding
        const { lat, lon } = await geocode(city, state, country);

        // Normalize text description
        const cleanDesc = (job.descriptionPlain || job.description || "") + "\n\n" + 
                           (job.lists?.map(l => l.text + "\n" + l.content).join("\n") || "");

        // Basic skill extraction from title/description
        const possibleSkills = ["React", "Node.js", "Python", "JavaScript", "HTML", "CSS", "Git", "SQL", "TypeScript", "Docker", "AWS", "Kubernetes", "PostgreSQL", "Tailwind CSS"];
        const skills = possibleSkills.filter(s => 
          new RegExp(`\\b${s.replace(".", "\\.")}\\b`, "i").test(job.title + " " + cleanDesc)
        );

        allJobs.push({
          sourceJobId: trunc(String(job.id), 200),
          title: trunc(job.title, 180),
          companyName: trunc(company.name, 150),
          companyWebsite: company.domain,
          location: rawLocation,
          city,
          state,
          country,
          latitude: lat,
          longitude: lon,
          salary: "Not disclosed",
          experience: job.title.toLowerCase().includes("senior") ? "3+ years" : "1+ years",
          employmentType: normalizeJobType(job.categories?.commitment || "", job.title),
          workMode: normalizeWorkMode(rawLocation, cleanDesc),
          description: cleanDesc,
          skills,
          applyUrl: job.hostedUrl,
          sourceName: "LEVER",
          sourceLabel: trunc("Lever", 100),
          postedAt: job.createdAt ? new Date(job.createdAt) : new Date()
        });
      }
    } catch (error) {
      console.error(`[Lever Scraper] Error fetching ${company.name}:`, error.message);
    }
  }

  return allJobs;
}
