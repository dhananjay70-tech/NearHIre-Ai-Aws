import { runScrapers } from "./index.js";

async function run() {
  console.log("Starting manual scraper execution...");
  try {
    const stats = await runScrapers();
    console.log("Scrape run completed successfully!");
    console.log(`Summary: Scraped: ${stats.totalScraped} | Inserted: ${stats.inserted} | Skipped: ${stats.skipped}`);
    process.exit(0);
  } catch (err) {
    console.error("Scraper execution failed:", err);
    process.exit(1);
  }
}

run();
