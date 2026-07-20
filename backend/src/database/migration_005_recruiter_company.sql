-- =====================================================================
-- Migration 005 — Recruiter ↔ Company relationship
--
-- Recruiters could create a company at registration, but the link was never
-- persisted, so the Company page had no record to load. This adds the missing
-- foreign key and backfills it from each recruiter's existing jobs.
--
-- Idempotent and non-destructive.
-- =====================================================================

BEGIN;

-- 1. The missing relationship.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

-- 2. Backfill: a recruiter's company is the one used by the jobs they posted
--    (most frequently used wins).
UPDATE users u
SET company_id = best.company_id
FROM (
  SELECT DISTINCT ON (j.recruiter_id)
         j.recruiter_id,
         j.company_id,
         COUNT(*) AS uses
  FROM jobs j
  WHERE j.recruiter_id IS NOT NULL AND j.company_id IS NOT NULL
  GROUP BY j.recruiter_id, j.company_id
  ORDER BY j.recruiter_id, uses DESC
) AS best
WHERE u.id = best.recruiter_id
  AND u.company_id IS NULL;

COMMIT;
