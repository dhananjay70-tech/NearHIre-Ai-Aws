import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeCareers } from "./careers.js";
import { scrapeArbeitnow } from "./arbeitnow.js";
import { scrapeRemotive } from "./remotive.js";
import { scrapeRemoteOK } from "./remoteok.js";
import { scrapeAdzuna } from "./adzuna.js";
import { scrapeJSearch } from "./jsearch.js";
import { scrapeJooble } from "./jooble.js";
import { findCompanyByName, createCompany } from "../repositories/companyRepository.js";
import { findJobBySource, createJob, deleteExpiredJobs } from "../repositories/jobRepository.js";
import pool from "../config/db.js";

// Defensive truncation to prevent DB constraint violations
function trunc(str, max) {
  if (!str) return str;
  return String(str).slice(0, max);
}

// Step 14: remove duplicates from the combined raw feed.
// Keys: normalized apply URL, and normalized "title|company".
function dedupeRawFeed(jobs) {
  const seenUrls = new Set();
  const seenTitleCompany = new Set();
  const unique = [];

  for (const job of jobs) {
    const url = (job.applyUrl || "").trim().toLowerCase().replace(/[?#].*$/, "");
    const titleCompany = `${(job.title || "").trim().toLowerCase()}|${(job.companyName || "").trim().toLowerCase()}`;

    if (url && seenUrls.has(url)) continue;
    if (seenTitleCompany.has(titleCompany)) continue;

    if (url) seenUrls.add(url);
    seenTitleCompany.add(titleCompany);
    unique.push(job);
  }

  return unique;
}

// Write a scrape log entry to scrape_logs table (best-effort, non-blocking)
async function writeScrapeLog(logId, patch) {
  try {
    if (logId) {
      await pool.query(
        `UPDATE scrape_logs SET
           finished_at    = COALESCE($1, finished_at),
           jobs_found     = COALESCE($2, jobs_found),
           jobs_inserted  = COALESCE($3, jobs_inserted),
           jobs_skipped   = COALESCE($4, jobs_skipped),
           jobs_failed    = COALESCE($5, jobs_failed),
           error_message  = COALESCE($6, error_message),
           status         = COALESCE($7, status)
         WHERE id = $8`,
        [
          patch.finishedAt ?? null,
          patch.jobsFound ?? null,
          patch.jobsInserted ?? null,
          patch.jobsSkipped ?? null,
          patch.jobsFailed ?? null,
          patch.errorMessage ?? null,
          patch.status ?? null,
          logId,
        ]
      );
    }
  } catch (err) {
    console.error("[Scrape Log] Failed to update log:", err.message);
  }
}

async function startScrapeLog(sourceName) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO scrape_logs (source_name, status) VALUES ($1, 'RUNNING') RETURNING id`,
      [sourceName]
    );
    return rows[0]?.id || null;
  } catch {
    return null;
  }
}

export async function runScrapers() {
  console.log("🚀 [Scraper Pipeline] Starting scrape...");
  const start = Date.now();

  // Start a global log entry
  const globalLogId = await startScrapeLog("ALL");

  const greenhouseJobs = await scrapeGreenhouse().catch(err => {
    console.error("[Scraper Pipeline] Greenhouse scraper failed:", err.message);
    return [];
  });

  const leverJobs = await scrapeLever().catch(err => {
    console.error("[Scraper Pipeline] Lever scraper failed:", err.message);
    return [];
  });

  const careersJobs = await scrapeCareers().catch(err => {
    console.error("[Scraper Pipeline] Careers (WWR) scraper failed:", err.message);
    return [];
  });

  const arbeitnowJobs = await scrapeArbeitnow().catch(err => {
    console.error("[Scraper Pipeline] Arbeitnow scraper failed:", err.message);
    return [];
  });

  const remotiveJobs = await scrapeRemotive().catch(err => {
    console.error("[Scraper Pipeline] Remotive scraper failed:", err.message);
    return [];
  });

  // ── API-based sources (Step 4: prefer official APIs over scraping) ──
  const remoteOkJobs = await scrapeRemoteOK().catch(err => {
    console.error("[Scraper Pipeline] RemoteOK source failed:", err.message);
    return [];
  });

  const adzunaJobs = await scrapeAdzuna().catch(err => {
    console.error("[Scraper Pipeline] Adzuna source failed:", err.message);
    return [];
  });

  const jsearchJobs = await scrapeJSearch().catch(err => {
    console.error("[Scraper Pipeline] JSearch source failed:", err.message);
    return [];
  });

  const joobleJobs = await scrapeJooble().catch(err => {
    console.error("[Scraper Pipeline] Jooble source failed:", err.message);
    return [];
  });

  const rawJobs = [
    ...greenhouseJobs,
    ...leverJobs,
    ...careersJobs,
    ...arbeitnowJobs,
    ...remotiveJobs,
    ...remoteOkJobs,
    ...adzunaJobs,
    ...jsearchJobs,
    ...joobleJobs,
  ];

  // ── Step 14: de-duplicate the raw feed BEFORE inserting.
  // Two jobs are considered the same if they share an apply URL, or the
  // same normalized title + company. This removes cross-source duplicates
  // (e.g. the same LinkedIn job returned by both JSearch and Jooble).
  const allJobs = dedupeRawFeed(rawJobs);
  const duplicateCount = rawJobs.length - allJobs.length;
  console.log(
    `[Scraper Pipeline] Scraped ${rawJobs.length} raw jobs, ${allJobs.length} after de-duplication (${duplicateCount} cross-source duplicates removed).`
  );

  let insertedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  // Limit new inserts per run to avoid Supabase pooler timeouts
  const MAX_NEW_INSERTS_PER_RUN = 100;

  // Track active jobs by source for expiry cleanup.
  // Built dynamically so any current/future source is handled automatically.
  const activeJobsBySource = {};
  const trackActive = (job) => {
    if (!activeJobsBySource[job.sourceName]) {
      activeJobsBySource[job.sourceName] = [];
    }
    activeJobsBySource[job.sourceName].push(job.sourceJobId);
  };

  for (const job of allJobs) {
    // Stop inserting new jobs once we hit the cap
    if (insertedCount >= MAX_NEW_INSERTS_PER_RUN) {
      skippedCount++;
      trackActive(job);
      continue;
    }

    try {
      // 1. Get or Create Company
      let company = await findCompanyByName(job.companyName);
      if (!company) {
        console.log(`[Scraper Pipeline] Creating company: ${job.companyName}`);
        company = await createCompany({
          name: trunc(job.companyName, 150),
          websiteUrl: job.companyWebsite,
          logoUrl: job.companyLogo || null,
          city: job.city,
          state: job.state,
          latitude: job.latitude,
          longitude: job.longitude,
          isVerified: true,
        });
      }

      // 2. Check if Job exists (skip duplicates)
      const existingJob = await findJobBySource(job.sourceName, job.sourceJobId);
      if (existingJob) {
        skippedCount++;
        trackActive(job);
        continue;
      }

      // 3. Parse experience
      const expStr = String(job.experience || "1+");
      const expMin = expStr.includes("5+") ? 5 : expStr.includes("3+") ? 3 : 1;
      const expMax = expMin + 3;

      // 4. Create the Job
      // Sources that expose structured pay (RemoteOK, Adzuna, JSearch, Jooble)
      // provide numeric salaryMin/Max; older scrapers leave them undefined.
      const salaryPeriod = ["MONTH", "YEAR", "STIPEND"].includes(job.salaryPeriod)
        ? job.salaryPeriod
        : "YEAR";
      const jobId = await createJob(
        {
          companyId: company.id,
          title: trunc(job.title, 180),
          description: job.description || "No description provided.",
          experienceMin: expMin,
          experienceMax: expMax,
          salaryMin: job.salaryMin ?? null,
          salaryMax: job.salaryMax ?? null,
          salaryPeriod,
          jobType: job.employmentType,
          workMode: job.workMode,
          address: trunc(job.location, 250),
          city: trunc(job.city, 100),
          state: trunc(job.state, 100),
          latitude: job.latitude,
          longitude: job.longitude,
          applicationUrl: job.applyUrl,
          sourceName: trunc(job.sourceName, 100),
          sourceJobId: trunc(job.sourceJobId, 200),
          sourceLabel: trunc(job.sourceLabel, 100),
          postedAt: job.postedAt,
        },
        (job.skills || []).map(s => trunc(s, 100)),
        []
      );

      if (jobId) {
        insertedCount++;
        trackActive(job);
      }
    } catch (err) {
      failedCount++;
      console.error(
        `[Scraper Pipeline] Failed to process job "${job.title}" for ${job.companyName}:`,
        err.message
      );
    }
  }

  // 5. Cleanup expired jobs per source
  for (const [source, activeIds] of Object.entries(activeJobsBySource)) {
    if (activeIds.length > 0) {
      console.log(
        `[Scraper Pipeline] Cleaning up expired ${source} jobs (keeping ${activeIds.length} active)...`
      );
      await deleteExpiredJobs(source, activeIds).catch(err => {
        console.error(`[Scraper Pipeline] Cleanup failed for ${source}:`, err.message);
      });
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`🎉 [Scraper Pipeline] Done in ${elapsed}s.`);
  console.log(
    `   Processed: ${allJobs.length} | Inserted: ${insertedCount} | Skipped: ${skippedCount} | Failed: ${failedCount}`
  );

  // 6. Finalize scrape log
  await writeScrapeLog(globalLogId, {
    finishedAt: new Date(),
    jobsFound: allJobs.length,
    jobsInserted: insertedCount,
    jobsSkipped: skippedCount,
    jobsFailed: failedCount,
    status: failedCount === 0 ? "SUCCESS" : "PARTIAL",
  });

  return {
    totalScraped: rawJobs.length,
    afterDedupe: allJobs.length,
    duplicatesRemoved: duplicateCount,
    inserted: insertedCount,
    skipped: skippedCount,
    failed: failedCount,
    elapsedSeconds: parseFloat(elapsed),
  };
}
