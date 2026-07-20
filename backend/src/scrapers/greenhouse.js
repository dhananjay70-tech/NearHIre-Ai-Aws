import axios from "axios";
import { geocode, normalizeWorkMode, normalizeJobType } from "./parser.js";

// Truncate string to max allowed DB column length
function trunc(str, max) {
  if (!str) return str;
  return String(str).slice(0, max);
}

// List of verified companies using Greenhouse board API (verified working tokens)
const GREENHOUSE_COMPANIES = [
  { name: "Vercel", boardToken: "vercel", domain: "https://vercel.com" },
  { name: "Figma", boardToken: "figma", domain: "https://figma.com" },
  { name: "Airtable", boardToken: "airtable", domain: "https://airtable.com" },
  { name: "Stripe", boardToken: "stripe", domain: "https://stripe.com" },
  { name: "Dropbox", boardToken: "dropbox", domain: "https://dropbox.com" },
  { name: "Intercom", boardToken: "intercom", domain: "https://intercom.com" },
  { name: "Twilio", boardToken: "twilio", domain: "https://twilio.com" },
  { name: "Shopify", boardToken: "shopify", domain: "https://shopify.com" },
];

export async function scrapeGreenhouse() {
  const allJobs = [];

  for (const company of GREENHOUSE_COMPANIES) {
    try {
      console.log(`[Greenhouse Scraper] Fetching jobs for ${company.name}...`);
      const url = `https://boards-api.greenhouse.io/v1/boards/${company.boardToken}/jobs`;
      
      const response = await axios.get(url, { timeout: 8000 });
      if (!response.data || !response.data.jobs) {
        continue;
      }

      const jobsList = response.data.jobs;
      console.log(`[Greenhouse Scraper] Found ${jobsList.length} jobs for ${company.name}.`);

      for (const job of jobsList) {
        // Location processing
        const rawLocation = job.location?.name || "Remote";
        const parts = rawLocation.split(",").map(p => p.trim());
        const city = parts[0] || "Delhi";
        const state = parts[1] || "";
        const country = parts[2] || "India";

        // Geocoding
        const { lat, lon } = await geocode(city, state, country);

        // Normalize text description (Clean HTML if needed)
        const rawDescription = job.content || "";
        const cleanDesc = rawDescription.replace(/<[^>]*>/g, "\n").replace(/\n+/g, "\n").trim() || "No description provided.";

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
          employmentType: normalizeJobType(job.title),
          workMode: normalizeWorkMode(rawLocation, cleanDesc),
          description: cleanDesc,
          skills,
          applyUrl: job.absolute_url,
          sourceName: "GREENHOUSE",
          sourceLabel: trunc("Greenhouse", 100),
          postedAt: job.updated_at ? new Date(job.updated_at) : new Date()
        });
      }
    } catch (error) {
      console.error(`[Greenhouse Scraper] Error fetching ${company.name}:`, error.message);
    }
  }

  return allJobs;
}
