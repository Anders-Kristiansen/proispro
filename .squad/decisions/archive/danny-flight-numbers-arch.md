# ADR: Flight Numbers Data Ownership & Production Run Model

**Decision Lead:** Danny (Lead / Architect)  
**Date:** 2026-04-21  
**Status:** Proposed  
**Stakeholders:** Anders (User), Rusty (Frontend), Basher (Data)

---

## Context

The app currently fetches disc catalog data from the DiscIt API (Marshall Street Disc Golf source), embedding flight numbers (speed/glide/turn/fade) directly in the canonical disc catalog. The user wants three improvements:

1. **Remove Marshall Street dependency** — own the data ourselves
2. **Self-controlled flight numbers per production run** — account for plastic/run variation (Champion vs Star vs Echo Star)
3. **Wear-based adjustments** — users can override flight numbers for their specific discs as they age in the bag

This ADR lays out the architecture for all three layers: canonical catalog, production run variants, and per-user adjustments.

---

## A. Data Ownership Strategy: Seed → Self-Managed

### Option A1: Import Once, Then Own (Recommended ✓)
**Approach:** Seed Supabase `discs` table from DiscIt API once (one-time operation). Going forward, all updates flow through our own schema/processes. DiscIt becomes read-only fallback for new discs not in our catalog yet (optional, can disable).

**Pros:**
- Clean break from external dependency
- Full control over all disc data immediately
- Familiar data structure (we already parse DiscIt payload)
- Low migration friction (existing `disc-catalog.js` unchanged for first phase)
- Easy to validate: compare row count + spot-check flight numbers post-import

**Cons:**
- One-time operational step (seed script)
- If Marshall Street discovers errors post-import, we don't auto-correct
- Manual process to add newly released discs (OR: keep optional DiscIt sync for "new discs" only)

**Trade-off:** Operational simplicity (one import) vs. data freshness (eventual lag for new releases). Acceptable for our scale: disc releases ~20–50/year, not a bottleneck.

---

### Option A2: Build Our Own Catalog from Scratch
**Approach:** Create a curated disc table manually. Users/admins contribute data.

**Pros:**
- 100% control from day one
- No dependency on DiscIt accuracy

**Cons:**
- 10,000+ disc rows to curate by hand (unsustainable)
- No initial data = app unusable at launch
- Requires community contribution model (overhead)

**Decision:** ❌ Rejected. Cost too high, benefit zero over A1.

---

### Option A3: Keep DiscIt as Read-Only Fallback with Our Overrides
**Approach:** Query DiscIt API on cache miss. Layer our Supabase `disc_overrides` table on top (speed/glide/turn/fade + plastic variant).

**Pros:**
- Always have fallback data (no gaps)
- Graceful degradation if DiscIt unavailable

**Cons:**
- Still depend on DiscIt availability (defeats goal of independence)
- Added complexity: two query paths (our DB + API fallback)
- Maintenance burden: track both sources, reconcile conflicts

**Decision:** ❌ Rejected. Doesn't solve the "remove dependency" goal. Option A1 keeps simplicity + achieves independence.

---

### **Recommendation: A1 — Import Once, Self-Managed**

**Implementation:**
1. Write a one-time seed script: `docs/scripts/import-discit-to-supabase.sql` (or Node script)
2. Fetch all discs from DiscIt API
3. Insert into Supabase `public.discs` table with parsed flight numbers
4. Verify row count matches DiscIt payload (sanity check)
5. Going forward: manual updates + schema below (Section B)
6. Optional: Add admin endpoint to "import new discs from DiscIt" (low-priority; manual updates acceptable)

**Owner:** Basher (Data Wrangler) — initial seed. Danny reviews schema.

---

## B. Production Run Model: Flight Numbers per Plastic

### Problem
The same disc (e.g., "Innova Destroyer") flies differently depending on plastic:
- **Champion plastic:** Harder, more overstable → flight numbers closer to 12/5/-1/3
- **Star plastic:** Mid-range stiffness, slower flight → closer to 12/5/-2/2
- **Echo Star plastic:** Softer, understable → closer to 12/5/-2/1

**Current state:** DiscIt conflates these into one row; we can only store one flight number per disc name.

### Option B1: One Row per Plastic Variant (Recommended ✓)
**Schema:**
```sql
CREATE TABLE public.discs (
  id TEXT PRIMARY KEY,  -- "innova-destroyer-champion", "innova-destroyer-star", etc.
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  plastic TEXT NOT NULL,         -- "Champion", "Star", "Echo Star"
  speed INT, glide INT, turn INT, fade INT,
  weight_min INT, weight_max INT,
  description TEXT,
  image_url TEXT,
  updatedAt TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_discs_manufacturer ON public.discs(manufacturer);
CREATE INDEX idx_discs_name_plastic ON public.discs(name, plastic);
```

**Pros:**
- One true flight number per physical disc variant
- Query simplicity: `SELECT * FROM discs WHERE name = 'Destroyer' AND plastic = 'Star'`
- Enables plastic-aware UI: show all plastics side-by-side for comparison
- Storage efficient: no JSON/array nesting

**Cons:**
- Larger table (~3–5 rows per mold vs. 1 currently; ~10k–15k rows vs. ~3k)
- Duplication: name, manufacturer repeated for each plastic
- Import complexity: seed script must split DiscIt payload by plastic (require Basher to research which plastics per disc)

**Trade-off:** Slightly larger table (negligible cost) vs. clarity (one flight number = one reality).

---

### Option B2: One Base Row + Plastic Overrides (JSONB)
**Schema:**
```sql
CREATE TABLE public.discs (
  id TEXT PRIMARY KEY,  -- "innova-destroyer" (base only)
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  plastic_default TEXT,  -- "Champion" (canonical)
  speed INT, glide INT, turn INT, fade INT,  -- Base numbers
  plastic_variants JSONB,  -- {"star": {"speed": 12, "turn": -2, ...}, "echo-star": {...}}
  description TEXT,
  image_url TEXT,
  updatedAt TIMESTAMPTZ DEFAULT now()
);
```

**Pros:**
- Single row per mold (smaller table)
- Canonical flight numbers (base) + overrides co-located
- Extensible: can add other metadata per plastic (stock, discontinued, etc.)

**Cons:**
- Supabase cannot query JSONB nested fields easily without stored procedures
- UI complexity: must parse JSONB in frontend (or build API endpoint)
- Harder to enforce uniqueness (no SQL constraint on `plastic_variants` keys)

**Decision:** ❌ Rejected. Supabase queries are simpler without JSONB nesting. Option B1 wins.

---

### Option B3: Lookup Table (discs + disc_plastics join)
**Schema:**
```sql
CREATE TABLE public.discs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  speed INT, glide INT, turn INT, fade INT,  -- Default
  description TEXT,
  image_url TEXT
);

CREATE TABLE public.disc_plastics (
  id TEXT PRIMARY KEY,
  disc_id TEXT REFERENCES public.discs(id),
  plastic TEXT NOT NULL,
  speed INT, glide INT, turn INT, fade INT,
  updatedAt TIMESTAMPTZ DEFAULT now(),
  UNIQUE(disc_id, plastic)
);
```

**Pros:**
- Normalized (DRY: name/manufacturer stored once)
- Can query: "all Innova discs" (single table) or "Destroyer in all plastics" (join)

**Cons:**
- Extra join on every query (minor perf cost, not material at 10k rows)
- More moving parts: two tables to keep in sync
- Migration complexity: seed must backfill both tables

**Decision:** ❌ Rejected. Overkill for our data model. Option B1 simpler and sufficient.

---

### **Recommendation: B1 — One Row per Plastic**

**Implementation:**
1. Expand schema above: add `plastic` column to `discs` table
2. Update `id` generation: `{manufacturer}-{name}-{plastic}` (all lowercase, kebab-case)
3. Seed script: For each DiscIt disc, research available plastics (need Basher to curate or auto-detect from DiscIt data if available)
4. Queries: `SELECT * FROM discs WHERE name = 'Destroyer' ORDER BY speed DESC` (show all plastics for user to choose)
5. Frontend: Display selector: "Innova Destroyer" → dropdown: [Champion, Star, Echo Star] → flight numbers populated

**Owner:** Basher — curate plastic list. Rusty — UI selector.

---

## C. Wear Adjustment Model: Per-User, Per-Bagged-Disc Overrides

### Problem
Users add "Innova Destroyer in Star plastic" to their bag. Over 6 months, it wears:
- **Turn number drifts:** From -2 to -1 (becomes more stable as plastic stiffens)
- **Fade increases:** From 2 to 3 (understable over time; flight path flattens)

User should be able to adjust these without affecting the canonical disc data.

### Option C1: Separate `disc_adjustments` Table (Recommended ✓)
**Schema:**
```sql
CREATE TABLE public.disc_adjustments (
  id TEXT PRIMARY KEY,  -- UUID
  user_id UUID NOT NULL REFERENCES auth.users(id),
  bagged_disc_id TEXT NOT NULL REFERENCES public.user_discs(id),
  speed_adj INT,
  glide_adj INT,
  turn_adj INT,
  fade_adj INT,
  reason TEXT,  -- "Worn 6 months", "New plastics", null
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, bagged_disc_id)  -- One adjustment per bagged disc
);

-- RLS: Users can only adjust their own bagged discs
ALTER TABLE public.disc_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users adjust their own discs" ON public.disc_adjustments
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Pros:**
- Clean separation: canonical discs untouched, adjustments overlay only
- Audit trail: reason field documents why adjustment was made
- Revert simple: delete row = restore canonical flight
- Query efficiency: optional join (no performance hit if adjustments unused)
- Flexible: can add more adjustment fields later (weight, etc.) without schema churn

**Cons:**
- Extra table + join on display
- RLS policy needed (standard, not complex)

**Constraints & Rules (Enforce in App + DB):**
- **Min/max bounds:** speed [1–15], glide [0–7], turn [–5–5], fade [0–5]
  - Implement as CHECK constraints:
    ```sql
    ALTER TABLE disc_adjustments ADD CONSTRAINT check_ranges CHECK (
      speed_adj IS NULL OR (speed_adj >= -4 AND speed_adj <= 4) AND
      glide_adj IS NULL OR (glide_adj >= -3 AND glide_adj <= 3) AND
      turn_adj IS NULL OR (turn_adj >= -3 AND turn_adj <= 3) AND
      fade_adj IS NULL OR (fade_adj >= -2 AND fade_adj <= 2)
    );
    ```
- **Who can edit:** Only the user who bagged the disc (RLS above)
- **Canonical flight bounds applied:** `canonical_flight + adjustment` must stay in [speed: 1–15, glide: 0–7, turn: –5–5, fade: 0–5]

**Example:**
```
Innova Destroyer Star (canonical: 12/5/-2/2) + wear adjustment (0/0/+1/+1) = final flight 12/5/-1/3
```

---

### Option C2: JSONB Column on `user_discs` (Simpler, Less Flexible)
**Schema:**
```sql
ALTER TABLE public.user_discs ADD COLUMN flight_adjustment JSONB DEFAULT NULL;
-- {"speed": 0, "glide": 0, "turn": 1, "fade": 1, "reason": "Worn 6 months"}
```

**Pros:**
- No extra table
- Fewer joins
- Data stays with bagged disc

**Cons:**
- Cannot query adjustments easily (no index support for JSONB fields)
- Hard to enforce bounds (no CHECK constraint on nested JSON)
- Loses audit trail (overwrites old adjustment, can't see history)

**Decision:** ❌ Rejected. Option C1 more maintainable long-term.

---

### Option C3: Version History on Canonical Discs (Don't Do This)
**Approach:** Store full flight history on `discs` table + track edits per user.

**Cons:**
- **Critical flaw:** Conflates user adjustments with canonical data
- Canonical table becomes user-specific (data modeling nightmare)
- Impossible to distinguish "disc improved in Star" from "user's copy wore out"

**Decision:** ❌ Rejected immediately.

---

### **Recommendation: C1 — Separate `disc_adjustments` Table**

**Implementation:**
1. Create `disc_adjustments` table above
2. Frontend flight display logic:
   ```javascript
   // Pseudocode
   const canonical = { speed: 12, glide: 5, turn: -2, fade: 2 };
   const adjustment = await supabase
     .from('disc_adjustments')
     .select('*')
     .eq('bagged_disc_id', id)
     .single();
   
   const final = adjustment 
     ? applyAdjustment(canonical, adjustment)
     : canonical;
   ```
3. UI: Edit modal for bagged disc includes "Flight Adjustments" section (optional)
4. Bounds checking: Validate in app before INSERT (double-check in DB with CHECK constraint)

**Owner:** Rusty (UI), Basher (schema + RLS).

---

## D. Frontend Migration: disc-catalog.js → Supabase

### Current Architecture
- `disc-catalog.js` fetches from DiscIt API
- Caches in localStorage (24-hour TTL)
- `flight-guide.js` (Alpine component) calls `loadCatalog()` from disc-catalog
- Query/filter/display done in-browser

### Migration Approach

#### Option D1: Direct Supabase Query + Keep localStorage Cache (Recommended ✓)
**Implementation:**
```javascript
// disc-catalog.js - UPDATED

const SUPABASE_URL = 'https://...';
const SUPABASE_KEY = 'anon key';
const CATALOG_KEY = 'proispro_disc_catalog_v2';

async function loadCatalog() {
  if (_catalog) return _catalog;  // Memory cache (this session)

  // Try localStorage
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < CATALOG_TTL_MS) {
        _catalog = data;
        return _catalog;
      }
    }
  } catch { /* ignore */ }

  // Fetch from Supabase (not DiscIt)
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await sb
    .from('discs')
    .select('id, name, manufacturer, plastic, speed, glide, turn, fade, type, image_url');
  
  if (error) {
    console.error('Supabase fetch failed:', error);
    // Fall back to stale localStorage if available
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) {
      _catalog = JSON.parse(raw).data;
      return _catalog;
    }
    throw new Error('Cannot load catalog (offline + no cache)');
  }

  _catalog = data;
  
  // Cache to localStorage
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify({ data: _catalog, ts: Date.now() }));
  } catch { /* quota full */ }

  return _catalog;
}
```

**Pros:**
- Clean separation: DiscIt gone, Supabase is source of truth
- localStorage still provides offline resilience + performance (skip network on cache hit)
- No breaking changes to `flight-guide.js` (still calls `loadCatalog()`)
- Graceful degradation: stale cache if Supabase down

**Cons:**
- Two caches to manage (memory + localStorage)
- Supabase must be up for first-time users (no initial seed in localStorage)

**Trade-off:** Acceptable. Single-user tool, Supabase uptime SLA sufficient (99.9% = 43 min downtime/month). Stale cache is rarely hit.

---

#### Option D2: Fetch from Supabase RPC (Procedural)
**Approach:** Create a Supabase RPC function that applies wear adjustments + filters on server.

**Pros:**
- Server-side filtering (less bandwidth)
- RPC can join `discs` + `disc_adjustments` in one query

**Cons:**
- Adds server-side code (maintenance burden)
- Overkill for <15k rows (client-side filtering fast enough)
- RPC adds latency for simple queries

**Decision:** ❌ Rejected. Option D1 simpler, fast enough.

---

### Side Effect: localStorage Version Bump
**Current key:** `proispro_disc_catalog`  
**New key:** `proispro_disc_catalog_v2` (or `_supabase` suffix)

**Rationale:** Old DiscIt cache has `speed/glide/turn/fade` fields. New Supabase has same fields + `plastic` (new). Bumping key prevents stale data pollution (schema mismatch).

---

### **Recommendation: D1 — Direct Supabase Query + localStorage Cache**

**Implementation:**
1. Update `disc-catalog.js`: Replace DiscIt fetch with Supabase query (code above)
2. Bump localStorage key to `proispro_disc_catalog_v2`
3. No changes to `flight-guide.js` (it calls `loadCatalog()` unchanged)
4. Test: Offline mode (unplug network) → should show stale cache
5. Monitor: Track error rate (Supabase fetch failures) for first week

**Owner:** Rusty (frontend), Basher (schema).

---

## E. Migration Path: From DiscIt → Supabase (No Data Loss)

### Current State
- `disc-catalog.js` cached in localStorage (today's browser session)
- `flight-guide.html` displays live from DiscIt API
- No discs in Supabase yet (it's new)

### Migration Steps

#### Phase 1: Schema Setup (Pre-Launch)
1. **Create `discs` table** in Supabase (see B1 schema above)
2. **Seed script** (`docs/scripts/import-discit-to-supabase.sql` or Node)
   - Fetch all discs from DiscIt API
   - Parse flight numbers (speed/glide/turn/fade)
   - Research plastics per mold (Basher curates or scrapes DiscIt if available)
   - Insert rows: `{manufacturer}-{name}-{plastic}` IDs
3. **Verify:** Row count matches (3k base discs × avg 3 plastics = ~10k rows)
4. **RLS:** No changes needed (discs table is read-only for users)

**Owner:** Basher  
**Timeline:** 1–2 days (Basher researches plastic variants)

---

#### Phase 2: Feature Flag (Cold Launch)
1. **Update `disc-catalog.js`:** Add feature flag `USE_SUPABASE_CATALOG = false` (defaults to DiscIt)
2. **Deploy:** Flight guide still works (no user impact)
3. **Internal testing:** Rusty + Basher verify Supabase query returns same rows as DiscIt

**Owner:** Rusty  
**Timeline:** 1 day

---

#### Phase 3: Cutover (Toggled Rollout)
1. **Feature flag:** `USE_SUPABASE_CATALOG = true`
2. **Rollout:** Deploy to production
3. **Monitor:** Error logs, cache hit rate, query latency
4. **Rollback:** If issues, flip flag back to false (DiscIt fallback still works)

**Owner:** Rusty (deploy), Danny (decision to go live)  
**Timeline:** 1 hour (code change) + 24-48 hours observation

---

#### Phase 4: Cleanup (Post-Cutover)
1. **Remove DiscIt code** from `disc-catalog.js` (if stable >1 week)
2. **Remove feature flag**
3. **Update docs:** Note DiscIt dependency removed

**Owner:** Rusty  
**Timeline:** 1 week post-launch

---

### Concurrent Work: Wear Adjustments UI (Phase 2/3)
- While Phase 1/2 happen, Rusty can build the "Edit Flight" modal in `flight-guide.html`
- Don't need `disc_adjustments` table until this UI ships
- Launch together: Flight guide v2 (Supabase discs + wear adjustments)

---

### **Recommendation: Phased Rollout with Feature Flag**

**Go/No-Go Criteria:**
- ✅ Supabase row count within ±5% of DiscIt count
- ✅ Spot-check: 10 random discs (name, speed, glide, turn, fade match DiscIt)
- ✅ Query latency <200ms (p95)
- ✅ Flight guide loads successfully with Supabase data
- ✅ Offline mode (localStorage fallback) works

**Owner:** Basher (seed), Rusty (deploy), Danny (go/no-go).

---

## Summary Table: Recommendations

| Dimension | Decision | Owner | Timeline |
|-----------|----------|-------|----------|
| **A. Data Ownership** | Import DiscIt once, self-manage | Basher | 1 day |
| **B. Production Run** | One row per plastic variant | Basher + Rusty | 2 days (curate plastics) |
| **C. Wear Adjustments** | Separate `disc_adjustments` table + RLS | Basher + Rusty | 3 days (schema + UI) |
| **D. Frontend Migration** | Supabase query + localStorage cache | Rusty | 1 day |
| **E. Migration Path** | Phased rollout with feature flag | Rusty + Basher | 5 days total |

---

## Implementation Roadmap

### Week 1
- **Mon–Tue:** Basher curates plastic variants, creates seed script, runs import
- **Wed–Thu:** Rusty updates `disc-catalog.js`, internal QA
- **Fri:** Deploy Phase 2 (feature flag, feature flag = false)

### Week 2
- **Mon–Wed:** Rusty builds "Edit Flight Adjustments" UI + `disc_adjustments` schema
- **Thu–Fri:** Integration testing, monitor metrics
- **Fri EOD:** Decision point: go live Phase 3 (flip feature flag to true)

### Week 3
- **Mon–Tue:** Observation window, monitor error logs
- **Wed:** Cleanup (remove DiscIt code, feature flag)
- **Live:** Flight guide v2 (Supabase + wear adjustments)

---

## Open Questions & Risks

### Q1: How do we curate plastic variants?
**Status:** Unresolved. Two approaches:
1. **Basher manual research:** Look up each mold on Marshall Street, Innova, Discraft sites (effort: 3–5 hours)
2. **Auto-detect from DiscIt:** If DiscIt payload includes plastic variant names, parse automatically (need Basher to verify payload structure)

**Recommendation:** Start with (2) if possible; fall back to (1) if needed.

---

### Q2: What about new discs released after import?
**Status:** Acceptable delay. Options:
1. Manual updates by admin (Basher)
2. Optional DiscIt sync endpoint (low-priority, can defer 2–3 months)
3. Community contribution (post-MVP)

**Recommendation:** (1) for now. Add to roadmap: "Admin import endpoint for new discs" (Q3).

---

### Q3: Do we need disc_adjustments history?
**Status:** Deferred (MVP doesn't need it). If we want audit trail later:
- Add `created_at`, `updated_at` to `disc_adjustments`
- Optional: separate `disc_adjustments_history` table (soft delete on updates)

**Recommendation:** Defer. Current schema supports history if added later (backward-compatible).

---

## Decisions Locked In

1. ✅ **No Marshall Street dependency** — migrate to self-owned Supabase discs table
2. ✅ **Plastic variants modeled as separate rows** — enables per-plastic flight numbers
3. ✅ **Wear adjustments as separate table** — clean separation, auditable, reversible
4. ✅ **Frontend stays vanilla** — Supabase query replaces DiscIt fetch, no UI rewrite
5. ✅ **Phased rollout** — feature flag mitigates rollback risk

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Supabase outage during migration | Low (99.9% SLA) | Medium (users can't add discs) | Feature flag → fallback to DiscIt (48h max) |
| Plastic variant data incomplete | Medium (manual curation) | Low (shows canonical flight) | MVP: accept gaps, iterative improvement |
| Wear adjustment queries slow | Low (small table) | Medium (UX lag) | Monitor p95 latency, paginate if needed |
| Users lose custom adjustments | Very low (new feature) | N/A | RLS ensures user-scoped data |
| localStorage corruption | Low | Low (users can clear) | Error handling in place |

---

## Trade-Offs Summary

| Dimension | What We Gained | What We Lost |
|-----------|---------------|------------|
| **A. Ownership** | Independence from Marshall Street | Auto-sync of new discs (manual updates required) |
| **B. Plastic Variants** | Accurate per-plastic flight numbers | Slightly larger table (10k vs 3k rows; negligible) |
| **C. Wear Adjustments** | Per-user customization + audit trail | Extra table + join overhead (minimal) |
| **D. Frontend** | Supabase as single backend | No longer "zero backend" (acceptable) |
| **E. Migration** | Low-risk phased rollout | 5-day timeline (worth the safety) |

**Net:** We trade operational simplicity (DiscIt sync) for data sovereignty + user customization. Strategic win for long-term product.

---

## Success Criteria

✅ **Launch criteria:**
- Supabase discs table has ≥9,500 rows (≥95% of DiscIt coverage)
- Flight guide loads without errors using Supabase data
- Wear adjustments UI ships with `disc_adjustments` RLS policies active
- Zero regressions in existing functionality (search, filter, add to bag)
- localStorage cache still works (offline resilience proven)

✅ **Post-launch (1 week):**
- <1% error rate on Supabase queries
- Zero support tickets about missing discs or wrong flight numbers
- ≥80% of users who accessed flight guide still see all discs they expect

---

## Document Version

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-04-21 | Danny | Initial ADR, 5 dimensions |
| | | | Phased rollout strategy |
| | | | Risk mitigations + success criteria |

---

**Next Steps:**
1. Team reviews this ADR (Rusty, Basher, Anders)
2. Basher clarifies plastic variant curation approach
3. Rusty schedules Week 1 work (import testing + `disc-catalog.js` update)
4. Go/no-go decision Friday EOW1

---
