-- =============================================================================
-- Migration: Bag History Audit Table
-- =============================================================================
-- Append-only audit log tracking every disc add/remove from bags.
-- Displayed Moxfield-style with +1/-1 badges in the bag history panel.
--
-- Decision: Separate table (not inline mutation log) enables efficient queries,
-- proper indexing, and RLS isolation. No UPDATE/DELETE policies to preserve
-- audit integrity.
--
-- Related Issue: #49 [FR-2] Add bag_history Supabase migration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- bag_history table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bag_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id       TEXT NOT NULL,
  disc_id      TEXT,
  disc_name    TEXT NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('added', 'removed')),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE bag_history IS 'Append-only audit log of disc additions/removals from bags';
COMMENT ON COLUMN bag_history.disc_id IS 'Nullable — disc may be deleted from inventory after history entry created';
COMMENT ON COLUMN bag_history.disc_name IS 'Denormalized for history display — survives disc deletion';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bag_history_bag_id ON bag_history(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_history_user_id ON bag_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bag_history_changed_at ON bag_history(changed_at DESC);

-- ---------------------------------------------------------------------------
-- RLS policies (owner-only, append-only)
-- ---------------------------------------------------------------------------
ALTER TABLE bag_history ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own bag history
DO $$ BEGIN
  CREATE POLICY "bag_history_owner_select" ON bag_history
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INSERT: Users can insert their own bag history entries
DO $$ BEGIN
  CREATE POLICY "bag_history_owner_insert" ON bag_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No UPDATE or DELETE policies — audit log is append-only
