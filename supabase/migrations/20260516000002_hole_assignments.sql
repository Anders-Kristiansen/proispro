-- =============================================================================
-- Migration: Hole Assignments + Course Pin Holes Data
-- =============================================================================
-- Disc-to-hole assignment tracking for course game plans. Each assignment
-- records which disc a user plans to use on which hole for a specific
-- course+bag combination (course_pin_id).
--
-- Decision: Scoped to course_pin_id (not abstract course entity) — preserves
-- bag context per user. One assignment per hole per course pin per user.
--
-- Also adds holes_data JSONB column to course_pins for persisting parsed OSM
-- hole lists server-side (not just localStorage).
--
-- Related Issue: #57 [FR-3b] Hole assignments Supabase migration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- hole_assignments table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hole_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_pin_id   TEXT NOT NULL,
  hole_ref        TEXT NOT NULL,
  disc_id         TEXT,
  disc_name       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE hole_assignments IS 'Disc-to-hole assignments for course game plans (scoped to course_pin_id)';
COMMENT ON COLUMN hole_assignments.course_pin_id IS 'References course_pins.id — preserves bag context per user';
COMMENT ON COLUMN hole_assignments.hole_ref IS 'Hole number/ref from OSM (e.g. "1", "2", "18")';
COMMENT ON COLUMN hole_assignments.disc_id IS 'Nullable — disc may be deleted from inventory after assignment created';
COMMENT ON COLUMN hole_assignments.disc_name IS 'Denormalized for display — survives disc deletion';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_hole_assignments_course_pin_id ON hole_assignments(course_pin_id);
CREATE INDEX IF NOT EXISTS idx_hole_assignments_user_id ON hole_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_hole_assignments_disc_id ON hole_assignments(disc_id);

-- Unique constraint: one assignment per hole per course pin per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_hole_assignments_unique_hole
  ON hole_assignments(course_pin_id, hole_ref, user_id);

-- ---------------------------------------------------------------------------
-- Updated_at trigger function (reusable across migrations)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for hole_assignments.updated_at
DROP TRIGGER IF EXISTS update_hole_assignments_updated_at ON hole_assignments;
CREATE TRIGGER update_hole_assignments_updated_at
  BEFORE UPDATE ON hole_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS policies (owner-only)
-- ---------------------------------------------------------------------------
ALTER TABLE hole_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own hole assignments
DO $$ BEGIN
  CREATE POLICY "hole_assignments_owner_select" ON hole_assignments
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INSERT: Users can insert their own hole assignments
DO $$ BEGIN
  CREATE POLICY "hole_assignments_owner_insert" ON hole_assignments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UPDATE: Users can update their own hole assignments
DO $$ BEGIN
  CREATE POLICY "hole_assignments_owner_update" ON hole_assignments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DELETE: Users can delete their own hole assignments
DO $$ BEGIN
  CREATE POLICY "hole_assignments_owner_delete" ON hole_assignments
    FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Add holes_data JSONB column to course_pins
-- ---------------------------------------------------------------------------
ALTER TABLE course_pins ADD COLUMN IF NOT EXISTS holes_data JSONB;

COMMENT ON COLUMN course_pins.holes_data IS 'Cached parsed hole list from OSM download, stored as [{ref, name, lat, lon}]';
