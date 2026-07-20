import axios from "axios";
import * as cheerio from "cheerio";
import { geocode, normalizeWorkMode, normalizeJobType } from "./parser.js";

export async function scrapeCareers() {
  const allJobs = [];
  try {
    console.log("[Careers Scraper] Fetching WeWorkRemotely RSS feed...");
    const url = "https://weworkremotely.com/categories/remote-programming-jobs.rss";
    const response = await axios.get(url, { timeout: 8000 });
    
    const $ = cheerio.load(response.data, { xmlMode: true });
    
    $("item").each((idx, elem) => {
      const title = $(elem).find("title").text();
      const applyUrl = $(elem).find("link").text();
      const pubDate = $(elem).find("pubDate").text();
      const rawDescription = $(elem).find("description").text();

      // WeWorkRemotely titles are typically: "Company: Job Title"
      let companyName = "WeWorkRemotely";
      let jobTitle = title;
      if (title.includes(":")) {
        const parts = title.split(":");
        companyName = parts[0].trim();
        jobTitle = parts.slice(1).join(":").trim();
      }

      // Cleanup description
      const cleanDesc = rawDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      
      // Skills
      const possibleSkills = ["React", "Node.js", "Python", "JavaScript", "HTML", "CSS", "Git", "SQL", "TypeScript", "Docker", "AWS", "Kubernetes", "PostgreSQL", "Tailwind CSS"];
      const skills = possibleSkills.filter(s => 
        new RegExp(`\\b${s.replace(".", "\\.")}\\b`, "i").test(jobTitle + " " + cleanDesc)
      );

      allJobs.push({
        sourceJobId: applyUrl, 
        title: jobTitle,
        companyName,
        companyWebsite: "https://weworkremotely.com",
        location: "Remote",
        city: "Remote",
        state: "",
        country: "USA",
        latitude: 37.7749, // Default to San Francisco coordinates for remote
        longitude: -122.4194,
        salary: "Not disclosed",
        experience: "2+ years",
        employmentType: "FULL_TIME",
        workMode: "REMOTE",
        description: cleanDesc,
        skills,
        applyUrl,
        sourceName: "WWR",
        sourceLabel: "We Work Remotely",
        postedAt: pubDate ? new Date(pubDate) : new Date()
      });
    });
  } catch (error) {
    console.error("[Careers Scraper] Error fetching WWR feed:", error.message);
  }
  return allJobs;
}
