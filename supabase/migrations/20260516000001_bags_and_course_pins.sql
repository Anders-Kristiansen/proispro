-- =============================================================================
-- Migration: Bags and Course Pins (Retroactive)
-- =============================================================================
-- This migration wraps the existing bags + course_pins DDL from
-- docs/migration-v5-bags-courses.sql with idempotent guards so it's properly
-- tracked in the Supabase migrations directory.
--
-- These tables were previously created ad-hoc in the Supabase SQL editor but
-- were not version-controlled. This migration ensures reproducibility and
-- makes the schema available for Supabase CLI workflows.
--
-- Related: Basher security audit (2026-04-20) — all core tables must be in
-- migrations/ directory.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Bags (named disc loadouts for rounds)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bags (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  disc_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bags_user_id ON bags(user_id);

-- Updated_at trigger function (reusable across migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bags.updated_at
DROP TRIGGER IF EXISTS update_bags_updated_at ON bags;
CREATE TRIGGER update_bags_updated_at
  BEFORE UPDATE ON bags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Course Pins (course-to-bag assignments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_pins (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name  TEXT NOT NULL,
  course_id    TEXT,
  bag_id       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_pins_user_id ON course_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_course_pins_bag_id  ON course_pins(bag_id);

-- ---------------------------------------------------------------------------
-- RLS for bags
-- ---------------------------------------------------------------------------
ALTER TABLE bags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bags_owner_select" ON bags
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bags_owner_insert" ON bags
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bags_owner_update" ON bags
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bags_owner_delete" ON bags
    FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- RLS for course_pins
-- ---------------------------------------------------------------------------
ALTER TABLE course_pins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "course_pins_owner_select" ON course_pins
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "course_pins_owner_insert" ON course_pins
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "course_pins_owner_update" ON course_pins
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "course_pins_owner_delete" ON course_pins
    FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
