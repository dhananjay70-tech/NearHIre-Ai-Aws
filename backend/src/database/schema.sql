-- =====================================================
-- NearHire.AI — PostgreSQL Schema
-- Run via: npm run db:init
-- =====================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────
-- TABLE: users
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(150) UNIQUE NOT NULL,
  password_hash     TEXT        NOT NULL,
  role              VARCHAR(20)  NOT NULL DEFAULT 'USER',
  phone             VARCHAR(20),
  profile_image_url TEXT,
  latitude          DECIMAL(10, 8),
  longitude         DECIMAL(11, 8),
  address           TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  postal_code       VARCHAR(20),
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Canonical roles. 'USER' is the job-seeker role (matches the live
  -- Supabase `user_role` enum: USER | ADMIN | RECRUITER).
  CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN', 'RECRUITER'))
);

-- ─────────────────────────────────────────────────────
-- TABLE: user_preferences
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_role        VARCHAR(150),
  minimum_salary        INTEGER,
  maximum_distance_km   DECIMAL(8, 2) NOT NULL DEFAULT 10,
  preferred_job_types   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  preferred_work_modes  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  preferred_locations   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at            TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_city         ON users(city);
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_preferences(user_id);

-- ─────────────────────────────────────────────────────
-- TRIGGER: auto-update updated_at
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_preferences
DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────
-- TABLE: otps
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS otps CASCADE;
CREATE TABLE IF NOT EXISTS otps (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email               VARCHAR(150) NOT NULL,
  type                VARCHAR(20) NOT NULL DEFAULT 'LOGIN',
  otp_hash            TEXT        NOT NULL,
  expires_at          TIMESTAMP   NOT NULL,
  resend_available_at TIMESTAMP   NOT NULL,
  created_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT otps_type_check CHECK (type IN ('LOGIN', 'PASSWORD_RESET'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_otps_email_type ON otps(email, type);

-- Apply trigger to otps
DROP TRIGGER IF EXISTS trigger_otps_updated_at ON otps;
CREATE TRIGGER trigger_otps_updated_at
  BEFORE UPDATE ON otps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────
-- TABLE: companies
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(150) NOT NULL,
  description  TEXT,
  website_url  TEXT,
  logo_url     TEXT,
  address      TEXT,
  city         VARCHAR(100),
  state        VARCHAR(100),
  postal_code  VARCHAR(20),
  latitude     DECIMAL(10, 8),
  longitude    DECIMAL(11, 8),
  is_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────
-- TABLE: jobs
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title          VARCHAR(180) NOT NULL,
  description    TEXT         NOT NULL,
  requirements   TEXT,
  experience_min INTEGER      NOT NULL DEFAULT 0,
  experience_max INTEGER,
  salary_min     INTEGER,
  salary_max     INTEGER,
  salary_period  VARCHAR(20)  NOT NULL DEFAULT 'YEAR',
  job_type       VARCHAR(30)  NOT NULL,
  work_mode      VARCHAR(30)  NOT NULL,
  address        TEXT,
  city           VARCHAR(100),
  state          VARCHAR(100),
  postal_code    VARCHAR(20),
  latitude       DECIMAL(10, 8),
  longitude      DECIMAL(11, 8),
  application_url TEXT        NOT NULL,
  source_name    VARCHAR(100) NOT NULL,
  source_job_id  VARCHAR(200),
  source_label   VARCHAR(100),
  posted_at      TIMESTAMP,
  expires_at     TIMESTAMP,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT jobs_job_type_check      CHECK (job_type IN ('INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'CONTRACT')),
  CONSTRAINT jobs_work_mode_check     CHECK (work_mode IN ('ONSITE', 'HYBRID', 'REMOTE')),
  CONSTRAINT jobs_salary_period_check CHECK (salary_period IN ('MONTH', 'YEAR', 'STIPEND'))
);

-- ─────────────────────────────────────────────────────
-- TABLE: skills
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) UNIQUE NOT NULL,
  normalized_name VARCHAR(100) UNIQUE NOT NULL,
  category        VARCHAR(100),
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────
-- TABLE: job_skills
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_skills (
  job_id     UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id   UUID        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  importance VARCHAR(20) NOT NULL DEFAULT 'REQUIRED',
  PRIMARY KEY (job_id, skill_id),

  CONSTRAINT job_skills_importance_check CHECK (importance IN ('REQUIRED', 'PREFERRED'))
);

-- ─────────────────────────────────────────────────────
-- INDEXES — companies
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);

-- ─────────────────────────────────────────────────────
-- INDEXES — jobs
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_title     ON jobs(title);
CREATE INDEX IF NOT EXISTS idx_jobs_city      ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type  ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode ON jobs(work_mode);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at);
CREATE INDEX IF NOT EXISTS idx_jobs_lat_lng   ON jobs(latitude, longitude);

-- ─────────────────────────────────────────────────────
-- INDEXES — skills & job_skills
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_skills_normalized_name ON skills(normalized_name);
CREATE INDEX IF NOT EXISTS idx_job_skills_job_id      ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill_id    ON job_skills(skill_id);

-- ─────────────────────────────────────────────────────
-- TRIGGERS: auto-update updated_at on companies / jobs
-- ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trigger_companies_updated_at ON companies;
CREATE TRIGGER trigger_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_jobs_updated_at ON jobs;
CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────
-- TABLE: saved_jobs
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_jobs (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id     UUID      NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id  ON saved_jobs(job_id);

-- ─────────────────────────────────────────────────────
-- TABLE: applications
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id     UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status     VARCHAR(30) NOT NULL DEFAULT 'APPLIED',
  notes      TEXT,
  applied_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, job_id),

  CONSTRAINT applications_status_check CHECK (
    status IN ('APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN')
  )
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id  ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status  ON applications(status);

DROP TRIGGER IF EXISTS trigger_applications_updated_at ON applications;
CREATE TRIGGER trigger_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NearHire.AI — New Tables (Prompt 13 Refactoring)
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
  ('REMOTIVE',   'Remotive',     'API',     'https://remotive.com'),
  ('REMOTEOK',   'RemoteOK',     'API',     'https://remoteok.com'),
  ('ADZUNA',     'Adzuna',       'API',     'https://api.adzuna.com'),
  ('JSEARCH',    'JSearch',      'API',     'https://jsearch.p.rapidapi.com'),
  ('JOOBLE',     'Jooble',       'API',     'https://jooble.org')
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


