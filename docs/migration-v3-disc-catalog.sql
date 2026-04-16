-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ ProIsPro v3: Disc Catalog & Wear Adjustments                             ║
-- ║ Purpose: Move from DiscIt API to our own Supabase-hosted catalog         ║
-- ║ Author:  Basher (Data Wrangler)                                           ║
-- ║ Date:    2025-04                                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- A) disc_catalog — Canonical disc catalog (replaces DiscIt API)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE disc_catalog (
  -- Primary key: UUID for future-proofing (external ID mapping, federation)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core disc identity (from DiscIt/Marshall Street)
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT, -- e.g. "Distance Driver", "Midrange" (raw DiscIt category)
  type TEXT NOT NULL CHECK (type IN ('distance', 'fairway', 'midrange', 'putter')),
  
  -- Flight numbers (the whole point)
  speed INTEGER NOT NULL CHECK (speed BETWEEN 1 AND 15),
  glide INTEGER NOT NULL CHECK (glide BETWEEN 1 AND 7),
  turn INTEGER NOT NULL CHECK (turn BETWEEN -5 AND 5),
  fade INTEGER NOT NULL CHECK (fade BETWEEN 0 AND 5),
  
  -- Computed stability metadata (denormalized for query perf)
  stability TEXT NOT NULL, -- "Very Overstable", "Understable", etc.
  stability_slug TEXT NOT NULL CHECK (stability_slug IN (
    'very-overstable',
    'overstable',
    'stable',
    'understable',
    'very-understable'
  )),
  
  -- Production run support (the NEW stuff)
  plastic_type TEXT, -- e.g. "Star", "ESP", "Champion" — NULL = generic/multiple
  run_year INTEGER CHECK (run_year >= 1980 AND run_year <= 2100),
  
  -- Media & links
  pic TEXT, -- Image URL from DiscIt
  link TEXT, -- Marshall Street product page
  
  -- Admin notes
  notes TEXT, -- Internal admin field: "2023 Sexton Firebird — more OS than stock"
  
  -- Slugs for frontend routing & filtering
  name_slug TEXT NOT NULL,
  brand_slug TEXT NOT NULL,
  
  -- Standard timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: same name+brand+plastic+year = duplicate entry
  CONSTRAINT unique_disc_variant UNIQUE (name, brand, plastic_type, run_year)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes for flight guide query patterns
-- ─────────────────────────────────────────────────────────────────────────────

-- Flight guide main query: filter by brand, type, stability; sort by speed DESC
CREATE INDEX idx_catalog_brand_slug ON disc_catalog(brand_slug);
CREATE INDEX idx_catalog_type ON disc_catalog(type);
CREATE INDEX idx_catalog_stability_slug ON disc_catalog(stability_slug);
CREATE INDEX idx_catalog_speed_desc ON disc_catalog(speed DESC);

-- Compound index for common filter combos (brand + type is a hot path)
CREATE INDEX idx_catalog_brand_type_speed ON disc_catalog(brand_slug, type, speed DESC);

-- Text search on name/brand (for autocomplete / fuzzy search)
-- Requires pg_trgm extension (enabled below before use)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_catalog_name_trgm ON disc_catalog USING gin(name gin_trgm_ops);
CREATE INDEX idx_catalog_brand_trgm ON disc_catalog USING gin(brand gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies: Public read, admin write
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE disc_catalog ENABLE ROW LEVEL SECURITY;

-- Public read: flight guide is a public page
CREATE POLICY "catalog_public_read" ON disc_catalog
  FOR SELECT USING (true);

-- Admin write: only service role can INSERT/UPDATE/DELETE
-- (In practice: seed script runs as service role, app never writes to catalog)
CREATE POLICY "catalog_admin_write" ON disc_catalog
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: Auto-update updated_at timestamp
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_disc_catalog_timestamp
  BEFORE UPDATE ON disc_catalog
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- ─────────────────────────────────────────────────────────────────────────────
-- B) disc_wear_adjustments — Per-user wear overrides
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE disc_wear_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to user's bag disc (existing `discs` table)
  user_disc_id UUID NOT NULL,
  
  -- Link to catalog disc (for reference — may be NULL if user added a custom disc)
  catalog_disc_id UUID REFERENCES disc_catalog(id) ON DELETE SET NULL,
  
  -- User who owns this adjustment (for RLS)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Wear offsets: integer deltas from catalog values
  -- Example: catalog turn=-1, user offset=+2 → effective turn=+1 (beat in to flippy)
  -- Bounded to ±3 to prevent nonsense values
  turn_offset INTEGER DEFAULT 0 CHECK (turn_offset BETWEEN -3 AND 3),
  fade_offset INTEGER DEFAULT 0 CHECK (fade_offset BETWEEN -3 AND 3),
  glide_offset INTEGER DEFAULT 0 CHECK (glide_offset BETWEEN -3 AND 3),
  speed_offset INTEGER DEFAULT 0 CHECK (speed_offset BETWEEN -3 AND 3),
  
  -- User notes: "beat in for 6 months, now flips to flat"
  notes TEXT,
  
  -- Standard timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One adjustment per user_disc (no duplicates)
  CONSTRAINT unique_user_disc_adjustment UNIQUE (user_disc_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes for wear adjustments
-- ─────────────────────────────────────────────────────────────────────────────

-- Lookup by user_disc_id (hot path when rendering user's bag)
CREATE INDEX idx_wear_user_disc_id ON disc_wear_adjustments(user_disc_id);

-- Lookup by user_id (for "show all my adjustments" page)
CREATE INDEX idx_wear_user_id ON disc_wear_adjustments(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies: User can only read/write their own adjustments
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE disc_wear_adjustments ENABLE ROW LEVEL SECURITY;

-- Users can read their own wear adjustments
CREATE POLICY "wear_user_read" ON disc_wear_adjustments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own wear adjustments
CREATE POLICY "wear_user_insert" ON disc_wear_adjustments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own wear adjustments
CREATE POLICY "wear_user_update" ON disc_wear_adjustments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own wear adjustments
CREATE POLICY "wear_user_delete" ON disc_wear_adjustments
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: Auto-update updated_at timestamp
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER set_disc_wear_timestamp
  BEFORE UPDATE ON disc_wear_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- ─────────────────────────────────────────────────────────────────────────────
-- C) Seed migration stub — Import DiscIt data into disc_catalog
-- ─────────────────────────────────────────────────────────────────────────────

-- Example INSERT structure matching our schema
-- (Actual seed would loop over DiscIt API response JSON)

/*
INSERT INTO disc_catalog (
  name,
  brand,
  category,
  type,
  speed,
  glide,
  turn,
  fade,
  stability,
  stability_slug,
  plastic_type,
  run_year,
  pic,
  link,
  notes,
  name_slug,
  brand_slug
) VALUES
(
  'Destroyer',           -- name
  'Innova',              -- brand
  'Distance Driver',     -- category (from DiscIt)
  'distance',            -- type (mapped via categoryToType logic)
  12,                    -- speed
  5,                     -- glide
  -1,                    -- turn
  3,                     -- fade
  'Overstable',          -- stability (from DiscIt)
  'overstable',          -- stability_slug (from DiscIt stability_slug)
  NULL,                  -- plastic_type (generic entry — no run specified)
  NULL,                  -- run_year (generic entry)
  'https://...',         -- pic (DiscIt image URL)
  'https://...',         -- link (Marshall Street page)
  'Stock Destroyer',     -- notes (admin comment)
  'destroyer',           -- name_slug (from DiscIt)
  'innova'               -- brand_slug (from DiscIt)
),
(
  'Destroyer',           -- name
  'Innova',              -- brand
  'Distance Driver',     -- category
  'distance',            -- type
  12,                    -- speed
  5,                     -- glide
  -2,                    -- turn (more overstable!)
  4,                     -- fade (more overstable!)
  'Very Overstable',     -- stability
  'very-overstable',     -- stability_slug
  'Halo Star',           -- plastic_type (VARIANT)
  2023,                  -- run_year (VARIANT)
  'https://...',         -- pic
  'https://...',         -- link
  '2023 Halo Star — significantly more OS than stock', -- notes
  'destroyer',           -- name_slug
  'innova'               -- brand_slug
);
-- ... (repeat for all DiscIt discs)
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- D) Flight guide query — Replace DiscIt API fetch
-- ─────────────────────────────────────────────────────────────────────────────

-- Frontend needs: filter by brand_slug, type, stability_slug; sort by speed DESC
-- Returns same shape as normalizeDisc() for minimal frontend changes

/*
-- Example query for flight guide (no filters):
SELECT
  id,
  name,
  brand,
  category,
  type,
  speed,
  glide,
  turn,
  fade,
  stability,
  stability_slug AS "stabilitySlug",
  pic,
  link,
  name_slug AS "nameSlug",
  brand_slug AS "brandSlug"
FROM disc_catalog
ORDER BY speed DESC, name ASC;

-- With filters (brand = 'innova', type = 'distance'):
SELECT
  id,
  name,
  brand,
  category,
  type,
  speed,
  glide,
  turn,
  fade,
  stability,
  stability_slug AS "stabilitySlug",
  pic,
  link,
  name_slug AS "nameSlug",
  brand_slug AS "brandSlug"
FROM disc_catalog
WHERE brand_slug = 'innova'
  AND type = 'distance'
ORDER BY speed DESC, name ASC;

-- Supabase client call (JavaScript):
const { data: allDiscs, error } = await supabase
  .from('disc_catalog')
  .select(`
    id,
    name,
    brand,
    category,
    type,
    speed,
    glide,
    turn,
    fade,
    stability,
    stability_slug,
    pic,
    link,
    name_slug,
    brand_slug
  `)
  .order('speed', { ascending: false })
  .order('name', { ascending: true });

-- With filters:
let query = supabase
  .from('disc_catalog')
  .select(`
    id,
    name,
    brand,
    category,
    type,
    speed,
    glide,
    turn,
    fade,
    stability,
    stability_slug,
    pic,
    link,
    name_slug,
    brand_slug
  `);

if (brand_slug)     query = query.eq('brand_slug', brand_slug);
if (type)           query = query.eq('type', type);
if (stability_slug) query = query.eq('stability_slug', stability_slug);

const { data: filteredDiscs, error } = await query
  .order('speed', { ascending: false })
  .order('name', { ascending: true });
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- E) Query: User's bag with wear adjustments applied
-- ─────────────────────────────────────────────────────────────────────────────

-- When showing user's bag, join their discs with catalog + adjustments
-- to display effective flight numbers (catalog value + offset)

/*
-- Supabase query (via JS client or direct SQL):
SELECT
  d.id AS user_disc_id,
  d.name,
  d.manufacturer AS brand,
  d.type,
  d.plastic,
  d.weight,
  d.color,
  d.condition,
  
  -- Catalog base flight numbers (if linked)
  c.speed AS catalog_speed,
  c.glide AS catalog_glide,
  c.turn AS catalog_turn,
  c.fade AS catalog_fade,
  
  -- User's wear offsets (if recorded)
  COALESCE(w.speed_offset, 0) AS speed_offset,
  COALESCE(w.glide_offset, 0) AS glide_offset,
  COALESCE(w.turn_offset, 0) AS turn_offset,
  COALESCE(w.fade_offset, 0) AS fade_offset,
  
  -- Effective flight numbers (catalog + offset, or disc table override)
  COALESCE(d.speed, c.speed + COALESCE(w.speed_offset, 0)) AS effective_speed,
  COALESCE(d.glide, c.glide + COALESCE(w.glide_offset, 0)) AS effective_glide,
  COALESCE(d.turn, c.turn + COALESCE(w.turn_offset, 0)) AS effective_turn,
  COALESCE(d.fade, c.fade + COALESCE(w.fade_offset, 0)) AS effective_fade,
  
  w.notes AS wear_notes
FROM discs d
LEFT JOIN disc_catalog c ON (
  LOWER(d.name) = LOWER(c.name)
  AND LOWER(d.manufacturer) = LOWER(c.brand)
  AND (d.plastic IS NULL OR LOWER(d.plastic) = LOWER(c.plastic_type))
)
LEFT JOIN disc_wear_adjustments w ON (
  d.id = w.user_disc_id
  AND w.user_id = auth.uid()
)
WHERE d.user_id = auth.uid()
ORDER BY d.added_at DESC;
*/

-- ═════════════════════════════════════════════════════════════════════════════
-- Migration complete. Next steps:
-- 1. Run this SQL in Supabase SQL Editor (pg_trgm extension is enabled inline)
-- 2. Seed disc_catalog from DiscIt API (write a one-time Node script)
-- 4. Update frontend: replace loadCatalog() fetch with Supabase query
-- 5. Add wear adjustment UI to bag view
-- ═════════════════════════════════════════════════════════════════════════════
