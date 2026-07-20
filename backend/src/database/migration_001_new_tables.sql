-- =====================================================
-- NearHire.AI — Migration 001: New Tables (Prompt 13)
-- Run this SQL directly in your Supabase SQL Editor
-- =====================================================

-- ─────────────────────────────────────────────────────
-- TABLE: job_sources
-- Registry of all job data sources
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_sources (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  label       VARCHAR(100),
  type        VARCHAR(30)  NOT NULL DEFAULT 'API',
  base_url    TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT job_sources_type_check CHECK (type IN ('API', 'SCRAPER', 'RSS'))
);

INSERT INTO job_sources (name, label, type, base_url) VALUES
  ('GREENHOUSE', 'Greenhouse',   'API',     'https://boards-api.greenhouse.io'),
  ('LEVER',      'Lever',        'API',     'https://api.lever.co'),
  ('WWR',        'WeWorkRemotely','RSS',    'https://weworkremotely.com'),
  ('ARBEITNOW',  'Arbeitnow',    'API',     'https://www.arbeitnow.com'),
  ('REMOTIVE',   'Remotive',     'API',     'https://remotive.com')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- TABLE: scrape_logs
-- Log every scraper run
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_logs (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name    VARCHAR(100) NOT NULL,
  started_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at    TIMESTAMP,
  jobs_found     INTEGER   NOT NULL DEFAULT 0,
  jobs_inserted  INTEGER   NOT NULL DEFAULT 0,
  jobs_skipped   INTEGER   NOT NULL DEFAULT 0,
  jobs_failed    INTEGER   NOT NULL DEFAULT 0,
  error_message  TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'RUNNING',

  CONSTRAINT scrape_logs_status_check CHECK (status IN ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_source_name ON scrape_logs(source_name);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_started_at  ON scrape_logs(started_at);

-- ─────────────────────────────────────────────────────
-- TABLE: resumes
-- Cache parsed resume text + AI analysis per user
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resumes (
  id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename        VARCHAR(255),
  content_hash    VARCHAR(64),
  resume_text     TEXT,
  extracted_skills JSONB    NOT NULL DEFAULT '[]'::jsonb,
  education       JSONB     NOT NULL DEFAULT '[]'::jsonb,
  experience_hints JSONB    NOT NULL DEFAULT '[]'::jsonb,
  ats_score       INTEGER,
  ai_cache        JSONB,
  uploaded_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  analyzed_at     TIMESTAMP,

  UNIQUE (user_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id      ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_content_hash ON resumes(content_hash);

-- ─────────────────────────────────────────────────────
-- TABLE: ai_chats
-- Persistent AI career coach conversation history
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chats (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'USER',
  message     TEXT      NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT ai_chats_role_check CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM'))
);

CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id    ON ai_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_created_at ON ai_chats(created_at);

-- ─────────────────────────────────────────────────────
-- TABLE: career_goals
-- User career goals
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS career_goals (
  id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  target_role     VARCHAR(150),
  target_company  VARCHAR(150),
  target_date     DATE,
  description     TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT career_goals_status_check CHECK (status IN ('ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'))
);

CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON career_goals(user_id);

DROP TRIGGER IF EXISTS trigger_career_goals_updated_at ON career_goals;
CREATE TRIGGER trigger_career_goals_updated_at
  BEFORE UPDATE ON career_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────
-- TABLE: learning_plans
-- AI-generated personalized learning plans per user
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_plans (
  id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_role     VARCHAR(150),
  missing_skills  JSONB     NOT NULL DEFAULT '[]'::jsonb,
  plan            JSONB     NOT NULL DEFAULT '{}'::jsonb,
  weeks_estimate  INTEGER,
  status          VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT learning_plans_status_check CHECK (status IN ('ACTIVE', 'COMPLETED', 'PAUSED'))
);

CREATE INDEX IF NOT EXISTS idx_learning_plans_user_id ON learning_plans(user_id);

DROP TRIGGER IF EXISTS trigger_learning_plans_updated_at ON learning_plans;
CREATE TRIGGER trigger_learning_plans_updated_at
  BEFORE UPDATE ON learning_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────
-- TABLE: interview_sessions
-- Mock interview sessions + Q&A history
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_sessions (
  id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          UUID      REFERENCES jobs(id) ON DELETE SET NULL,
  job_title       VARCHAR(180),
  company_name    VARCHAR(150),
  session_type    VARCHAR(30) NOT NULL DEFAULT 'TECHNICAL',
  questions       JSONB     NOT NULL DEFAULT '[]'::jsonb,
  score           INTEGER,
  feedback        TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP,

  CONSTRAINT interview_sessions_type_check   CHECK (session_type IN ('TECHNICAL', 'HR', 'MIXED', 'COMPANY_SPECIFIC')),
  CONSTRAINT interview_sessions_status_check CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED'))
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);

-- ─────────────────────────────────────────────────────
-- TABLE: notifications
-- System and AI notifications per user
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL DEFAULT 'INFO',
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  is_read     BOOLEAN   NOT NULL DEFAULT FALSE,
  metadata    JSONB,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
