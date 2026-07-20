-- =====================================================================
-- Migration 004 — Real job view tracking
--
-- Adds denormalised counters on `jobs` (fast to read on every job list)
-- plus a `job_views` ledger used ONLY for de-duplication and unique-viewer
-- accounting. No existing analytics table covered this, so one is created.
--
-- Safe to run more than once (idempotent).
-- =====================================================================

BEGIN;

-- 1. Denormalised counters on jobs — read on every job API response.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_views     INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS unique_views    INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_viewed_at  TIMESTAMP;

-- Backfill guard: existing rows get 0, never NULL, so `totalViews` is never null.
UPDATE jobs SET total_views  = 0 WHERE total_views  IS NULL;
UPDATE jobs SET unique_views = 0 WHERE unique_views IS NULL;

-- 2. View ledger — one row per (job, viewer). `viewer_key` is either
--    'u:<userId>' for signed-in users or 'ip:<sha256 hash>' for anonymous
--    visitors (the raw IP is never stored).
CREATE TABLE IF NOT EXISTS job_views (
  job_id           UUID         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  viewer_key       VARCHAR(80)  NOT NULL,
  view_count       INTEGER      NOT NULL DEFAULT 1,
  first_viewed_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_viewed_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (job_id, viewer_key)
);

CREATE INDEX IF NOT EXISTS idx_job_views_job        ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_last_seen  ON job_views(last_viewed_at);

-- 3. Sorting/reporting by popularity.
CREATE INDEX IF NOT EXISTS idx_jobs_total_views ON jobs(total_views DESC);

COMMIT;
