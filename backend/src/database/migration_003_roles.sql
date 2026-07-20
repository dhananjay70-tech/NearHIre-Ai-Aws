-- =====================================================================
-- Migration 003 — Role-Based Access Control
--
-- The live database stores users.role as the Postgres ENUM `user_role`
-- with labels: 'USER' | 'ADMIN' | 'RECRUITER'  ('USER' = job seeker).
--
-- This migration only ENSURES that shape exists. It is idempotent and
-- non-destructive: it never rewrites existing role values.
--
-- NOTE: an earlier draft of this file converted roles to lowercase
-- ('seeker'/'recruiter'/'admin'). That was WRONG for this database and has
-- been removed — the application normalizes to the uppercase enum instead
-- (see src/utils/roles.js).
-- =====================================================================

BEGIN;

-- 1. Create the enum type if this is a fresh database.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'RECRUITER');
  END IF;
END$$;

-- 2. Make sure every expected label exists (safe if already present).
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'USER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'RECRUITER';

-- 3. Keep the role index present for role-filtered admin queries.
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMIT;

-- ---------------------------------------------------------------------
-- Create the first admin (no admin exists by default):
--   node src/database/createAdmin.js you@example.com 'StrongPass@123'
-- ---------------------------------------------------------------------
