-- =============================================================================
-- Migration 004: For Sale — Redesign
-- =============================================================================
-- Changes:
--   forsale_listings  — drop price/contact/notes, add denormalized disc fields,
--                       simplify status to 'available' | 'sold'
--   sale_tokens       — NEW: one public share token per user; anonymous users can
--                       read the token if is_public=true, then read the listings
--
-- Public URL pattern: /sale.html?token={uuid}
-- RLS: owner CRUD on sale_tokens; public read when is_public=true.
--      forsale_listings gains a public SELECT policy for users with public tokens.
-- Idempotent: IF NOT EXISTS + DO $$ exception guards.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Migrate existing data before changing constraint
-- ---------------------------------------------------------------------------
UPDATE forsale_listings SET status = 'available' WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 2. Drop old constraint and obsolete columns
-- ---------------------------------------------------------------------------
ALTER TABLE forsale_listings DROP CONSTRAINT IF EXISTS forsale_listings_status_check;

ALTER TABLE forsale_listings
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS contact_method,
  DROP COLUMN IF EXISTS contact_info,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS sold_at;

-- ---------------------------------------------------------------------------
-- 3. Add denormalized disc snapshot (captured at listing time)
-- ---------------------------------------------------------------------------
ALTER TABLE forsale_listings
  ADD COLUMN IF NOT EXISTS disc_name         TEXT,
  ADD COLUMN IF NOT EXISTS disc_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS disc_type         TEXT,
  ADD COLUMN IF NOT EXISTS disc_plastic      TEXT,
  ADD COLUMN IF NOT EXISTS disc_color        TEXT,
  ADD COLUMN IF NOT EXISTS disc_weight       NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS disc_condition    TEXT;

-- ---------------------------------------------------------------------------
-- 4. Add simplified status constraint
-- ---------------------------------------------------------------------------
ALTER TABLE forsale_listings ADD CONSTRAINT forsale_listings_status_check
  CHECK (status IN ('available', 'sold'));

-- ---------------------------------------------------------------------------
-- 5. Table: sale_tokens — one public share token per user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_tokens (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  token      UUID        NOT NULL DEFAULT gen_random_uuid(),
  is_public  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sale_tokens ENABLE ROW LEVEL SECURITY;

-- Owner CRUD
DO $$ BEGIN
  CREATE POLICY "sale_tokens_owner_select" ON sale_tokens
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sale_tokens_owner_insert" ON sale_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sale_tokens_owner_update" ON sale_tokens
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sale_tokens_owner_delete" ON sale_tokens
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public can resolve a token → user_id (only if is_public = true)
DO $$ BEGIN
  CREATE POLICY "sale_tokens_public_read" ON sale_tokens
    FOR SELECT USING (is_public = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 6. forsale_listings: public SELECT for available discs of users with a
--    public token (enables the /sale.html?token= page)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "forsale_listings_public_select" ON forsale_listings
    FOR SELECT USING (
      status = 'available'
      AND EXISTS (
        SELECT 1 FROM sale_tokens st
        WHERE st.user_id = forsale_listings.user_id
          AND st.is_public = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
