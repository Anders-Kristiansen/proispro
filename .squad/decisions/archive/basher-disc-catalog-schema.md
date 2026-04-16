# Disc Catalog Schema — Supabase PostgreSQL

**By:** Basher (Data Wrangler)  
**Date:** 2025-04  
**Status:** Proposed (Pending review)

## Context

ProIsPro currently fetches disc catalog data from DiscIt API (Marshall Street), caches in localStorage with 24-hour TTL. We want to:
1. Own the disc catalog in Supabase (stop depending on external API)
2. Support production run variants (same disc name, different plastic/year → different flight numbers)
3. Support wear adjustments (user tweaks turn/fade/glide as their disc beats in)

## Schema Decisions

### A) `disc_catalog` Table

**Primary Key:** UUID (`gen_random_uuid()`)  
**Rationale:** External ID mapping flexibility, federation-ready. Trade-off: slightly larger than serial integer, but PostgreSQL UUIDs are fast and we're not at scale where this matters.

**Production Variants:** `plastic_type` (TEXT, nullable), `run_year` (INTEGER, nullable)  
**Rationale:** Same mold can have vastly different flight characteristics in different plastics/runs (e.g., 2023 Halo Star Destroyer is more overstable than stock Star). Nullable fields allow "generic" entries for base mold specs. Unique constraint on `(name, brand, plastic_type, run_year)` prevents duplicate variants.

**Denormalized Stability:** `stability` (TEXT) and `stability_slug` (TEXT)  
**Rationale:** Stability is computable from turn+fade, but denormalizing avoids recalculating in every query. Flight guide filters by stability_slug heavily. Trade-off: requires consistency with flight numbers on INSERT/UPDATE (handled by seed script + admin tooling).

**Indexes:**
- Individual indexes on `brand_slug`, `type`, `stability_slug`, `speed DESC` — hot filter/sort paths
- Compound index on `(brand_slug, type, speed DESC)` — common filter combo
- GIN trigram indexes on `name` and `brand` — fuzzy text search for autocomplete

**RLS:** Public SELECT (flight guide is public page), service_role-only write (only seed scripts + admin tools modify catalog).

### B) `disc_wear_adjustments` Table

**Offset vs. Absolute:** Storing **offsets** (deltas from catalog value), not absolute values.  
**Rationale:** Keeps catalog value visible. If we later update catalog specs (e.g., fix a manufacturer error), user's offset still applies correctly. Also clearer UX: "turn+2" means "2 points more understable than catalog."

**Offset Bounds:** `-3` to `+3`  
**Rationale:** Prevents nonsense values. Real-world disc wear rarely shifts flight numbers by more than 2-3 points. Overstable discs beat in to neutral/understable (turn increases, fade decreases). Understable discs rarely become more understable (bottom out at very-understable). Bounded CHECK constraint enforces sanity at DB level.

**Link Strategy:**
- `user_disc_id` UUID NOT NULL — links to user's `discs` table entry
- `catalog_disc_id` UUID NULLABLE — links to `disc_catalog` if matched
- `user_id` UUID NOT NULL — for RLS (user owns this adjustment)

**Why nullable `catalog_disc_id`?** User may add a custom disc (not in catalog). They can still record wear adjustments without a catalog link. JOIN logic falls back to disc table flight numbers if catalog link is missing.

**RLS:** User can only SELECT/INSERT/UPDATE/DELETE their own adjustments (WHERE `user_id = auth.uid()`).

### C) Query Pattern

**Flight Guide Query:** Direct SELECT from `disc_catalog` with optional filters on `brand_slug`, `type`, `stability_slug`. ORDER BY `speed DESC, name ASC`. Returns same shape as DiscIt API response (snake_case → camelCase aliasing via `AS`). Minimal frontend changes.

**User Bag with Wear Query:** LEFT JOIN `discs` → `disc_catalog` (on name+brand+plastic) → `disc_wear_adjustments` (on user_disc_id). Effective flight numbers = `COALESCE(d.speed, c.speed + COALESCE(w.speed_offset, 0))`. Falls back to disc table values if catalog link missing.

## Trade-offs

**Storage Cost:** Catalog will be ~1000-2000 rows (all known discs). Wear adjustments table grows with user engagement (~1 row per disc per user who records wear). At 1000 users with 20 discs each, that's 20K rows. Negligible for PostgreSQL.

**Maintenance:** Catalog must be seeded from DiscIt API initially, then maintained (new disc releases, flight number corrections). Admin tooling TBD.

**Migration Effort:**
1. Run SQL migration (creates tables, indexes, RLS policies)
2. Enable `pg_trgm` extension (for fuzzy search)
3. Write seed script to fetch DiscIt API → INSERT into `disc_catalog`
4. Update `disc-catalog.js`: replace `fetch(DISCIT_API)` with Supabase query
5. Update `flight-guide.js`: adapt `loadCatalog()` to Supabase client
6. Add wear adjustment UI to bag view (new feature, not a migration blocker)

## Open Questions

1. **Admin UI:** How do we manage catalog updates? Manual SQL? Custom admin page? Data API Builder write endpoint?
2. **Seed automation:** One-time manual seed, or periodic refresh job?
3. **DiscIt fallback:** If our catalog is stale/incomplete, should we fall back to DiscIt API? Or commit to owning the data 100%?

## Next Steps

1. Review this decision with team
2. Run migration SQL in Supabase SQL Editor
3. Implement seed script (Node.js + Supabase Admin SDK)
4. Update frontend catalog loading logic
5. Ship wear adjustment UI as follow-up feature
