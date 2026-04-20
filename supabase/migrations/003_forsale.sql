-- =============================================================================
-- Migration 003: For Sale Listings
-- =============================================================================
-- Creates:
--   forsale_listings — tracks discs the user is selling, with price, contact
--                      method, and lifecycle status (available → pending → sold).
--
-- RLS: owner-only access enforced via auth.uid() = user_id.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + DO $$ exception guards on policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: forsale_listings
-- ---------------------------------------------------------------------------
-- status values: 'available' | 'pending' | 'sold'
-- contact_method values: 'email' | 'facebook' | 'pdga' | 'other'
CREATE TABLE IF NOT EXISTS forsale_listings (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  disc_id        TEXT         NOT NULL REFERENCES discs      ON DELETE CASCADE,
  price          NUMERIC(8,2),
  currency       TEXT         DEFAULT 'SEK',
  contact_method TEXT,
  contact_info   TEXT,
  status         TEXT         DEFAULT 'available',
  notes          TEXT,
  listed_at      TIMESTAMPTZ  DEFAULT now(),
  sold_at        TIMESTAMPTZ,

  CONSTRAINT forsale_listings_status_check
    CHECK (status IN ('available', 'pending', 'sold'))
);

ALTER TABLE forsale_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies — forsale_listings
DO $$ BEGIN
  CREATE POLICY "forsale_listings_owner_select" ON forsale_listings
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "forsale_listings_owner_insert" ON forsale_listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "forsale_listings_owner_update" ON forsale_listings
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "forsale_listings_owner_delete" ON forsale_listings
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
