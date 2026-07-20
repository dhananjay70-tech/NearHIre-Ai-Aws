import dotenv from 'dotenv';
dotenv.config();

// ─── Startup validation ───────────────────────────────────────────────────────
// Fail fast with a helpful message if critical environment variables are missing.
(function validateEnv() {
  if (!process.env.DATABASE_URL) {
    console.error('');
    console.error('❌  Missing DATABASE_URL environment variable.');
    console.error('    Open node-backend/.env and set DATABASE_URL to your PostgreSQL connection string.');
    console.error('    Example: DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/nearhire_db');
    console.error('');
    process.exit(1);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_here') {
    console.error('');
    console.error('❌  Missing or insecure JWT_SECRET environment variable.');
    console.error('    Open node-backend/.env and set JWT_SECRET to a long, random string (32+ characters).');
    console.error('    You can generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    console.error('');
    process.exit(1);
  }
})();

export const config = {
  env:          process.env.NODE_ENV    || 'development',
  port:         parseInt(process.env.PORT, 10) || 5001,
  databaseUrl:  process.env.DATABASE_URL,
  corsOrigin:   process.env.CLIENT_URL  || process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret:    process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Refresh tokens are signed with their own secret when provided; otherwise
  // they fall back to JWT_SECRET so existing deployments keep working.
  jwtRefreshSecret:    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  clientUrl:    process.env.CLIENT_URL   || 'http://localhost:5173',

  // Job Scraper microservice (MS3). Never hardcode the URL — read from env.
  jobScraperUrl: process.env.JOB_SCRAPER_URL || 'http://localhost:8100',

  // City → lat/lng geocoding via OpenStreetMap Nominatim. Their usage policy
  // requires an identifying User-Agent; override with a real contact in prod.
  nominatimUserAgent:
    process.env.NOMINATIM_USER_AGENT || 'NearHire.AI/1.0 (job-search)',
};
