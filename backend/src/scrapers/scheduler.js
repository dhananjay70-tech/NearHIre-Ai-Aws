import cron from "node-cron";
import { runScrapers } from "./index.js";

// Cron expression is configurable via SCRAPER_CRON; defaults to every 30 minutes.
const CRON_EXPRESSION = process.env.SCRAPER_CRON || "*/30 * * * *";

// Exposed so the admin dashboard can report scheduler status.
export const schedulerState = {
  cronExpression: CRON_EXPRESSION,
  intervalLabel: "every 30 minutes",
  startedAt: null,
  lastRunAt: null,
  lastResult: null,
  running: false,
};

export function startScheduler() {
  console.log(`⏰ [Scheduler] Job scraper scheduler initialized (${schedulerState.intervalLabel}).`);
  schedulerState.startedAt = new Date();

  const run = async (trigger) => {
    if (schedulerState.running) {
      console.log(`⏰ [Scheduler] Skipping ${trigger} run — a scrape is already in progress.`);
      return;
    }
    schedulerState.running = true;
    schedulerState.lastRunAt = new Date();
    try {
      schedulerState.lastResult = await runScrapers();
    } catch (err) {
      console.error(`[Scheduler] ${trigger} scraper run failed:`, err.message);
      schedulerState.lastResult = { error: err.message };
    } finally {
      schedulerState.running = false;
    }
  };

  // Run once immediately on startup to populate the database with real jobs.
  run("initial");

  // Schedule to run every 30 minutes (Step 5).
  cron.schedule(CRON_EXPRESSION, () => {
    console.log("⏰ [Scheduler] Triggering scheduled job scraper...");
    run("scheduled");
  });
}
