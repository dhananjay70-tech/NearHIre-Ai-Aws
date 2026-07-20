-- =====================================================
-- NearHire.AI — Migration 002
-- Register new API-based job sources (RemoteOK, Adzuna, JSearch, Jooble)
-- and add helpful indexes for job filtering / freshness queries.
-- Safe to run multiple times (idempotent).
-- =====================================================

INSERT INTO job_sources (name, label, type, base_url) VALUES
  ('REMOTEOK', 'RemoteOK', 'API', 'https://remoteok.com'),
  ('ADZUNA',   'Adzuna',   'API', 'https://api.adzuna.com'),
  ('JSEARCH',  'JSearch',  'API', 'https://jsearch.p.rapidapi.com'),
  ('JOOBLE',   'Jooble',   'API', 'https://jooble.org')
ON CONFLICT (name) DO NOTHING;

-- Indexes to keep listing / freshness / source-stats queries fast (Step 6).
CREATE INDEX IF NOT EXISTS idx_jobs_source_name ON jobs(source_name);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at   ON jobs(posted_at);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at  ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active   ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode   ON jobs(work_mode);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type    ON jobs(job_type);
