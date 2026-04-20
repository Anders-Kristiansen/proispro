-- =============================================================================
-- Migration 001: Collections + Collection Discs
-- =============================================================================
-- Creates:
--   collections       — named disc groupings owned by a user (distinct from bags,
--                       which are operational loadouts for a round)
--   collection_discs  — many-to-many junction between collections and discs
--
-- RLS: owner-only access enforced via auth.uid() = user_id on collections;
--      collection_discs ownership checked via JOIN to collections.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + DO $$ exception guards on policies +
--             DROP TRIGGER IF EXISTS before CREATE TRIGGER.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger function (idempotent via OR REPLACE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Table: collections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- updated_at auto-maintenance trigger
DROP TRIGGER IF EXISTS set_updated_at ON collections;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies — collections
DO $$ BEGIN
  CREATE POLICY "collections_owner_select" ON collections
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "collections_owner_insert" ON collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "collections_owner_update" ON collections
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "collections_owner_delete" ON collections
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Table: collection_discs (junction)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collection_discs (
  collection_id UUID        NOT NULL REFERENCES collections ON DELETE CASCADE,
  disc_id       UUID        NOT NULL REFERENCES discs       ON DELETE CASCADE,
  sort_order    INTEGER     DEFAULT 0,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, disc_id)
);

ALTER TABLE collection_discs ENABLE ROW LEVEL SECURITY;

-- RLS policies — collection_discs (ownership resolved via JOIN to collections)
DO $$ BEGIN
  CREATE POLICY "collection_discs_owner_select" ON collection_discs
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = collection_id AND c.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "collection_discs_owner_insert" ON collection_discs
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = collection_id AND c.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "collection_discs_owner_delete" ON collection_discs
    FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = collection_id AND c.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
