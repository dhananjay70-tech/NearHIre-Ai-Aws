import app from './app.js';
import { config } from './config/config.js';
import { startScheduler } from './scrapers/scheduler.js';
import * as jobScraper from './services/jobScraperService.js';

const PORT = config.port;

// Non-fatal startup check for the Job Scraper microservice (MS3).
// If it is down we log a warning and continue — the backend still boots.
async function checkJobScraper() {
  const result = await jobScraper.health();
  if (result.ok) {
    console.log(`[Server] ✅ Job Scraper reachable at ${result.url}`);
  } else {
    console.warn(
      `[Server] ⚠️  Job Scraper NOT reachable at ${result.url} (${result.error}). ` +
        `Live job endpoints will return 503 until it is up.`
    );
  }
}

app.listen(PORT, () => {
  console.log(`[Server] NearHire Node backend running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${config.env}`);
  console.log(`[Server] Health: http://localhost:${PORT}/health`);
  console.log(`[Server] API Health: http://localhost:${PORT}/api/health`);

  // Start job board hourly scraper scheduler
  startScheduler();

  // Ping the Job Scraper (MS3) — warn but don't block startup.
  checkJobScraper();
});

// Trigger reload 2
