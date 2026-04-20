-- =============================================================================
-- Migration 002: Wishlist Items
-- =============================================================================
-- Creates:
--   wishlist_items — discs the user wants to acquire, with priority and
--                    optional weight/plastic preferences.
--
-- RLS: owner-only access enforced via auth.uid() = user_id.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + DO $$ exception guards on policies +
--             DROP TRIGGER IF EXISTS before CREATE TRIGGER.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger function (idempotent via OR REPLACE)
-- Re-declared here so this migration is self-contained if run independently.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Table: wishlist_items
-- ---------------------------------------------------------------------------
-- priority values: 0 = low, 1 = medium, 2 = high
CREATE TABLE IF NOT EXISTS wishlist_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  disc_name    TEXT        NOT NULL,
  manufacturer TEXT,
  plastic_pref TEXT,
  weight_min   INTEGER,
  weight_max   INTEGER,
  priority     SMALLINT    DEFAULT 0,
  notes        TEXT,
  acquired     BOOLEAN     DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- updated_at auto-maintenance trigger
DROP TRIGGER IF EXISTS set_updated_at ON wishlist_items;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies — wishlist_items
DO $$ BEGIN
  CREATE POLICY "wishlist_items_owner_select" ON wishlist_items
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "wishlist_items_owner_insert" ON wishlist_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "wishlist_items_owner_update" ON wishlist_items
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "wishlist_items_owner_delete" ON wishlist_items
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
