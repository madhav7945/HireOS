-- ============================================================
-- HireOS — Production schema (document model)
-- Run this once in the Supabase SQL editor (SQL Editor → New query → Run).
--
-- Design: the app has a rich, evolving record shape (camelCase keys, nested
-- objects like salary, arrays like selectedBoards/pipelineTimeline). Instead of
-- pinning every field to a column (which breaks the moment the app adds a field),
-- each table stores the full record in a `data jsonb` blob, plus a few promoted
-- columns (`status`, `session_id`, `created_at`) used for ordering and lookups.
-- This matches src/services/localData.js exactly.
--
-- Access model: SINGLE SHARED TEAM. Any authenticated user can read/write all
-- business data. The public apply page and the candidate interview run WITHOUT
-- login, so anon gets the minimal grants those flows need (see policies below).
-- ============================================================

-- Generic table shape used by every collection.
-- (We create each explicitly so foreign-key-ish columns can be added later.)

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_messages (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful indexes for ordering + the session lookup used by the interview flow.
CREATE INDEX IF NOT EXISTS idx_interviews_session ON interviews (session_id);
CREATE INDEX IF NOT EXISTS idx_msgs_interview ON interview_messages (interview_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;

-- ----- Authenticated team: full access to everything -----
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'jobs','candidates','applications','interviews','interview_messages',
    'offers','departments','calendar_events','activity_log','tasks'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS team_all ON %I;', t);
    EXECUTE format(
      'CREATE POLICY team_all ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t
    );
  END LOOP;
END $$;

-- ----- Anonymous (public) flows -----
-- The careers/apply page (unauthenticated) needs to read a job and create a
-- candidate + application. The candidate AI interview (unauthenticated) needs to
-- read/update its interview by session and read/write its messages. The hiring
-- autopilot consequences that run in the candidate's browser also touch offers/
-- tasks/activity + candidate/application updates.
--
-- SECURITY NOTE: granting anon write to operational tables is a pragmatic
-- trade-off so the no-backend automation works end-to-end. To harden for real
-- production, move the post-interview automation into a Supabase Edge Function
-- that uses the service-role key, and then tighten/remove these anon policies.

-- Public can read jobs (careers page) ...
DROP POLICY IF EXISTS anon_read_jobs ON jobs;
CREATE POLICY anon_read_jobs ON jobs FOR SELECT TO anon USING (true);

-- ... apply (create candidate + application) and let the autopilot update them.
DROP POLICY IF EXISTS anon_write_candidates ON candidates;
CREATE POLICY anon_write_candidates ON candidates FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_write_applications ON applications;
CREATE POLICY anon_write_applications ON applications FOR ALL TO anon USING (true) WITH CHECK (true);

-- Interview run (candidate is not logged in).
DROP POLICY IF EXISTS anon_rw_interviews ON interviews;
CREATE POLICY anon_rw_interviews ON interviews FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_rw_messages ON interview_messages;
CREATE POLICY anon_rw_messages ON interview_messages FOR ALL TO anon USING (true) WITH CHECK (true);

-- Autopilot outcomes generated from the candidate page.
DROP POLICY IF EXISTS anon_write_offers ON offers;
CREATE POLICY anon_write_offers ON offers FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_write_tasks ON tasks;
CREATE POLICY anon_write_tasks ON tasks FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_write_activity ON activity_log;
CREATE POLICY anon_write_activity ON activity_log FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- Realtime (optional): broadcast interview changes to the HR observer.
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE interviews;
ALTER PUBLICATION supabase_realtime ADD TABLE interview_messages;
