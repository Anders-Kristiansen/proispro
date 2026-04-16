# Squad Decisions

## Architecture & Design

### Static Vanilla Stack — No Build Pipeline
**By:** Danny (Lead) | **Date:** 2026-04-13 | **Status:** Active

Ship vanilla HTML, CSS, and JavaScript directly to hosting with no bundler, build step, or compilation.

**Rationale:** Simplicity justified for single-user inventory tool. Vanilla JS sufficient for CRUD + filtering. No tree-shaking, minification, or module system needed for <50KB assets. Instant deployment.

**Implementation:** `index.html` (DOM + modals), `styles.css` (400L responsive grid), `app.js` (all business logic).

---

### Primary Storage: CosmosDB via Data API Builder
**By:** Danny (Lead) | **Date:** 2026-04 | **Status:** Active (Migrated)

CosmosDB container `discs` is the source of truth. All CRUD operations route through DAB REST endpoints (`/api/Disc`).

**Rationale:** Durable, multi-region capable backend. Eliminates localStorage-clear data loss risk. Real-time consistency across tabs/devices. Fallback to localStorage if DAB unavailable (offline resilience).

**Trade-off:** Requires backend deployment + CosmosDB instance (breaks GitHub Pages simplicity). Stateful — single-tenant assumption still holds.

**Migration:** From localStorage-first + GitHub file backend to CosmosDB as primary.

---

### GitHub Sync Feature: Removed (Deprecated)
**By:** Rusty (Frontend Dev) | **Date:** 2026-04-15 | **Status:** Deprecated

GitHub sync feature removed from frontend entirely. No longer supported.

**Context:** GitHub sync was a workaround from pre-database era. CosmosDB/DAB is now authoritative backend. GitHub sync code added ~250 lines of complexity (PAT management, settings modal, SHA conflict handling, retry logic).

**Removal:** All GitHub integration code eliminated from `app.js` and `index.html`:
- Constants: `GH_TOKEN_KEY`, `GH_OWNER_KEY`, `GH_REPO_KEY`, `GH_PATH_KEY`
- Functions: `toBase64`, `fromBase64`, `getGitHubConfig`, `githubLoad`, `githubSave`, `triggerGitHubSync`, `timeSince`, `setSyncStatus`, `openSettingsModal`, `closeSettingsModal`, `saveSettingsHandler`, `testConnectionHandler`
- UI: Settings button, `#syncStatus` div, entire settings modal overlay
- Retained: `STORAGE_KEY` + localStorage fallback for local dev without SWA CLI

**Verification:** Grep confirmed zero dangling GitHub symbol references.

---

### Browser-First Storage with localStorage Fallback
**By:** Danny (Lead) | **Date:** 2026-04-13 | **Status:** Active (Updated)

localStorage serves as fallback cache. Primary source of truth is now CosmosDB via DAB.

**Rationale:** Offline-first resilience (app uses stale localStorage if DAB unavailable). DAB is immediate + durable. Trade-off: localStorage may lag behind CosmosDB for multi-device scenarios (single-user app, acceptable).

**Implementation:** Load on boot from DAB. Fall back to localStorage if DAB unavailable. Cache writes to localStorage on every mutation for offline resilience.

---

### Hosting: Azure Static Web Apps + CDN
**By:** Linus (DevOps) | **Date:** 2026-04-14 | **Status:** Active (Migrated)

Host static frontend + DAB backend on Azure SWA (free tier).

**Rationale:** Single deployment target. DAB runtime integrated with SWA (no separate Functions needed). Automatic HTTPS, CDN-backed. Free tier sufficient for single-user app.

**Trade-off:** Vendor lock-in to Azure (was GitHub-portable before). More opaque infrastructure (SWA + DAB + CosmosDB).

**Implications:** CNAME still points to proispro.com (now Azure SWA hostname). SSL auto-managed by Azure. No GitHub Actions deploy workflow needed.

**Migration:** From GitHub Pages to Azure SWA.

---

### Data Schema — Flat Array + Immutable IDs (User Inventory)
**By:** Danny (Lead) | **Date:** 2026-04-13 | **Status:** Active

Single array of disc objects in user inventory. Each disc: id + 10 standard fields + timestamps.

**Schema:**
```json
{
  "id": "timestamp-based-uid",
  "name": "Destroyer",
  "manufacturer": "Innova",
  "type": "distance",
  "plastic": "Star",
  "weight": 175,
  "color": "Red",
  "condition": "good",
  "flight": "12 / 5 / -1 / 3",
  "notes": "Favorite hyzer flip disc",
  "addedAt": 1681234567000
}
```

**Rationale:** Flat array (no joins, easy JSON serialization). Immutable IDs collision-resistant. `addedAt` enables sorting + audit trail. Trade-off: no relational constraints; app validates schema.

---

### Disc Catalog Schema — CosmosDB NoSQL
**By:** Basher (Data Wrangler) | **Date:** 2026-04-14 | **Status:** Active

Separate public disc catalog in Cosmos DB (read-only reference data). Partition key: `/manufacturer`.

**Core Fields:**
- `id` — kebab-case identifier: `{manufacturer}-{name}-{plastic}` (e.g., `innova-destroyer-champion`)
- `manufacturer` (partition key) — e.g., "Innova", "Discraft"
- `name` — disc model name
- `type` — one of: "Distance Driver", "Fairway Driver", "Midrange", "Putter"
- `plastic` (array) — all plastics available (e.g., `["Champion", "Star", "DX"]`)
- `speed`, `glide`, `turn`, `fade` — flight ratings (numeric for range queries + sorting)
- `weightMin`, `weightMax` — available weight range in grams
- `description`, `imageUrl`, `approved`, `pdgaClass`, `discontinued`, `updatedAt` (ISO 8601)

**Design Rationale:**
- **Partition key:** `/manufacturer` provides ~10-20 logical partitions (major brands). Enables queries like "all Innova discs" (single partition) + "all Putters" (acceptable cross-partition).
- **Flight numbers as separate fields:** Enables OData queries (`speed ge 12 and fade ge 3`) + sorting (`orderby=speed desc`). Cannot do with composite string.
- **`plastic` as array:** Same mold in different plastics shares all specs. Array allows "all Champion plastic" queries without data duplication.
- **`weightMin`/`weightMax`:** Catalog describes what's manufactured, not specific disc in bag. Enables "lightweight distance drivers" queries.

**Access Control:** Read-only via DAB (anonymous reads, no writes).

---

### Conflict Resolution: Last-Write-Wins
**By:** Danny (Lead) | **Date:** 2026-04-13 | **Status:** Active

No conflict detection. Latest write always wins.

**Rationale:** Single user/device, no concurrent edits. Complex resolution overkill. Trade-off: multiple tabs editing same disc — last DAB write wins (acceptable).

---

### UI Framework: Vanilla — Semantic HTML + CSS Grid
**By:** Danny (Lead) | **Date:** 2026-04-13 | **Status:** Active

Vanilla HTML + CSS Grid + DOM manipulation. No React, Vue, or framework.

**Rationale:** Bundle <50KB (framework overhead >100KB would double it). Transparent code (frameworks raise barrier). Instant iteration (no build step). Trade-off: manual DOM updates, more state tracking. Fine for <1000 lines.

---

### Error Handling: Graceful Degradation
**By:** Danny (Lead) | **Date:** 2026-04-13 | **Status:** Active

If DAB fails, app continues with stale localStorage. Toast notifies user.

**Rationale:** Offline-first (user doesn't lose data). Transparency. Trade-off: stale data may not reflect latest server state.

---

### Authentication: GitHub OAuth via Azure SWA
**By:** Basher (Data Wrangler) | **Date:** 2026-04-15 | **Status:** Active

All access gated behind GitHub OAuth authentication via Azure Static Web Apps.

**Implementation:**
- Route config (`staticwebapp.config.json`) requires `authenticated` role for all routes except `/.auth/*`
- Unauthenticated requests to any route → 302 redirect to `/.auth/login/github`
- GitHub OAuth → SWA issues encrypted session cookie
- Subsequent requests carry session cookie → SWA validates → user has `authenticated` role
- DAB validates session → `authenticated` role required for Disc entity operations

**Auth Model:** Single user (GitHub account = single user identity). No multi-user isolation.

**Rationale:** Personal inventory tool, no business case for public access. GitHub OAuth is zero-config on SWA. Single-user assumption baked into UI.

**Trade-off:** App inaccessible to users without GitHub account (acceptable: personal tool). First-time experience shows GitHub OAuth screen (expected for this auth model).

---

### Data API Builder Access Control
**By:** Basher (Data Wrangler) | **Date:** 2026-04-15 | **Status:** Active

DAB Disc entity requires `authenticated` role. CORS restricted to `https://proispro.com`.

**Configuration:**
- `permission.role`: `"authenticated"` (no anonymous access)
- `CORS.origins`: `["https://proispro.com"]` (known production domain only)

**Rationale:** Data is private (authenticated users only). CORS tightening needed for write operations (no wildcard). Reads/writes both require authentication.

---

### DAB REST Endpoint Path in SWA
**By:** Danny (Lead) | **Date:** 2026-04-15 | **Status:** Decided & Implemented

In Azure Static Web Apps, DAB REST API is served at `/data-api/rest/{entity}`, NOT `/api/{entity}`. The `/api/` path is reserved for Azure Functions.

**Implementation:** `API_BASE` in app.js uses `/data-api/rest/Disc` (not `/api/Disc`). SWA config routes `/data-api/*` for DAB, not `/api/*` for DAB. Auth lockdown (authenticated) applies to `/data-api/` routes.

**Rationale:** Confirmed by live 404 error when calling `/api/Disc`; corrected to `/data-api/rest/Disc`. This is the correct DAB endpoint structure in SWA.

**Impact:** Never debug by opening DAB endpoints to 'anonymous' — always lock to 'authenticated'.

---

### No Backend Server — Serverless DAB
**By:** Danny (Lead) | **Date:** 2026-04 | **Status:** Active (Updated)

Data API Builder provides serverless REST layer. No custom Node.js functions or databases to manage.

**Rationale:** DAB auto-generates REST endpoints from Cosmos DB schema. Zero custom code. Role-based access control out-of-the-box. Cost-effective (free tier).

**Trade-off:** Vendor lock-in to Azure (not portable to other clouds). More opaque infrastructure compared to GitHub Pages simplicity.

**Migration:** From no backend (GitHub Pages) to serverless DAB + CosmosDB.

### DAB Retirement & Migration to Supabase
**By:** Danny (Lead) | **Date:** 2026-04-20 | **Status:** Completed & Live

Azure Static Web Apps Database Connections (DAB) was retired November 30, 2025. We debugged a deprecated feature for days before discovering this. **Complete migration:** Supabase PostgreSQL (backend) + Alpine.js (frontend) + GitHub Pages (hosting).

**Why Supabase won:**
- Standard PostgreSQL (portable, not vendor-locked)
- Row-Level Security (RLS) provides security without server code
- Built-in GitHub OAuth (zero custom auth logic)
- Free tier sufficient (500MB database, unlimited requests)
- No build step needed (GitHub Pages + CDN, instant deploys)

**Learnings captured in `docs/lessons-learned.md`:** Always check service deprecation FIRST when debugging managed platform failures. "Works locally ≠ works in production" when local tooling bundles its own runtime. Simpler stacks (Supabase + GitHub Pages) beat complex ones (SWA + CosmosDB + DAB) for small apps.

**Status:** Live at proispro.com. Cloud sync working. Zero 500 errors.

---

### Hosting: GitHub Pages + Custom Domain (Supabase Backend)
**By:** Linus (DevOps) | **Date:** 2026-04-20 | **Status:** Active

Host static frontend on GitHub Pages at proispro.com. Backend is Supabase (not SWA).

**Rationale:** Zero-config hosting. Push to main → deployed. Custom domain + SSL auto-managed. Static site works perfectly with Supabase client-side SDK (no server-side code needed).

**Trade-off:** GitHub Pages is not a dynamic platform (but we don't need one — Supabase handles all state).

**Replaces:** Azure Static Web Apps (vendor lock-in, operational overhead).

---

### GitHub Codespaces: Zero-Dependency devcontainer
**By:** Danny (Lead) | **Date:** 2026-04-16 | **Status:** Active

Add `.devcontainer/devcontainer.json` to support GitHub Codespaces for the proispro static site (Alpine.js + Supabase).

**Configuration:**
- **Base image:** `mcr.microsoft.com/devcontainers/base:ubuntu` — lightweight, no Node toolchain overhead
- **Extensions:** Live Server (ritwickdey.LiveServer), Prettier, Supabase VS Code, GitHub PRs
- **Port forwarding:** 5500 (Live Server default), opens in preview pane automatically
- **No postCreateCommand** — project has zero build dependencies

**Alternatives Considered:**
| Option | Pros | Cons | Decision |
|---|---|---|---|
| `npx serve` in postCreateCommand | Fully auto-starts server | Requires Node runtime, adds dependency | ❌ Rejected |
| Node devcontainer image | Full Node ecosystem available | Overkill for a zero-build static site | ❌ Rejected |
| Base Ubuntu + Live Server | Minimal, matches project philosophy | One manual click to "Go Live" | ✅ Chosen |

**Trade-off:** Live Server doesn't auto-start in Codespaces — developer clicks "Go Live" button in VS Code status bar. This acceptable to preserve zero-dependency constraint.

**Rationale:** Consistent with "boring technology" principle. No Node runtime, no build pipeline. Project is pure HTML/CSS/JS; Live Server provides identical static preview experience with one extra click.

---

### OKLCH Color Palette — Perceptually Uniform
**By:** Saul (Color Expert) | **Date:** 2026-04-13 | **Status:** Active

All `:root` color tokens use OKLCH instead of hex/HSL. Hex originals retained as inline comments.

**Why OKLCH:**
- Perceptual lightness uniform across ALL hues (L=0.75 looks equally bright for purple, green, amber, red)
- Badge uniformity: All four disc type badges pinned to L=0.75, C=0.18; only hue varies (impossible to guarantee with hex)
- Predictable adjustments: Nudging L/C/H produces expected results (HSL doesn't)
- Browser support: Chrome 111+, Firefox 113+, Safari 15.4+ (all modern)

**Color Tokens:**

**Surfaces (dark navy, H≈264°, C=0.03):**
- `--clr-bg`: `oklch(0.16 0.03 264)` ≈ #0f172a
- `--clr-surface`: `oklch(0.22 0.03 264)` ≈ #1e293b
- `--clr-surface2`: `oklch(0.26 0.03 264)` ≈ #273549
- `--clr-border`: `oklch(0.32 0.03 264)` ≈ #334155

**Text:**
- `--clr-text`: `oklch(0.96 0.005 264)` ≈ #f1f5f9 (near-white)
- `--clr-muted`: `oklch(0.67 0.04 264)` ≈ #94a3b8 (secondary)

**Accent (cyan, H=204°, C=0.12):**
- `--clr-accent`: `oklch(0.82 0.12 204)` ≈ #22d3ee (primary CTA)
- `--clr-accent2`: `oklch(0.60 0.12 204)` ≈ #0891b2 (secondary)

**Semantic:**
- `--clr-danger`: `oklch(0.63 0.22 25)` ≈ #ef4444 (destructive)

**Type Badges (L=0.75, C=0.18, hue-only variation):**
- `--putter`: `oklch(0.75 0.18 295)` — purple
- `--midrange`: `oklch(0.75 0.18 155)` — green
- `--fairway`: `oklch(0.75 0.18 70)` — amber
- `--distance`: `oklch(0.75 0.18 25)` — red

**Accessibility:**
- Text on background: ~14:1 contrast (WCAG AAA)
- Muted text: ~5.5:1 (WCAG AA)
- Badges on backgrounds: ~5–6:1 (WCAG AA normal text)

---

### Disc Color Palette — 10 Vivid OKLCH Swatches
**By:** Saul (Color Expert) | **Date:** 2026-04-14 | **Status:** Approved

---

## Decision: Disc Catalog Schema — Supabase PostgreSQL
**By:** Basher (Data Wrangler) | **Date:** 2025-04 | **Status:** Proposed (Pending review)

ProIsPro currently fetches disc catalog data from DiscIt API (Marshall Street), caches in localStorage with 24-hour TTL. This decision captures the plan to own the disc catalog in Supabase, support production run variants (same disc name, different plastic/year → different flight numbers), and support wear adjustments (user tweaks turn/fade/glide as their disc beats in).

### Schema Decisions

**A) `disc_catalog` Table:**
- **Primary Key:** UUID (`gen_random_uuid()`) — enables external ID mapping flexibility, federation-ready
- **Production Variants:** `plastic_type` (TEXT, nullable), `run_year` (INTEGER, nullable) — same mold can have different flight characteristics in different plastics/runs
- **Denormalized Stability:** `stability` (TEXT) and `stability_slug` (TEXT) — avoids recalculating in every query; requires consistency with flight numbers on INSERT/UPDATE
- **Indexes:** Individual indexes on `brand_slug`, `type`, `stability_slug`, `speed DESC` + compound index on `(brand_slug, type, speed DESC)` + GIN trigram indexes on `name` and `brand`
- **RLS:** Public SELECT (flight guide is public), service_role-only write

**B) `disc_wear_adjustments` Table:**
- **Offset Storage:** Storing offsets (deltas from catalog value), not absolute values — keeps catalog value visible and ensures correct application if catalog specs are later corrected
- **Offset Bounds:** `-3` to `+3` — prevents nonsense values, bounded CHECK constraint enforces sanity
- **Link Strategy:** `user_disc_id` UUID NOT NULL (links to user's `discs` entry), `catalog_disc_id` UUID NULLABLE (links to `disc_catalog` if matched), `user_id` UUID NOT NULL
- **RLS:** User can only SELECT/INSERT/UPDATE/DELETE their own adjustments

**C) Query Pattern:**
- Flight Guide: Direct SELECT from `disc_catalog` with optional filters
- User Bag with Wear: LEFT JOIN `discs` → `disc_catalog` → `disc_wear_adjustments`; effective flight numbers = `COALESCE(d.speed, c.speed + COALESCE(w.speed_offset, 0))`

### Migration Plan
1. Run SQL migration (creates tables, indexes, RLS policies)
2. Enable `pg_trgm` extension (for fuzzy search)
3. Write seed script to fetch DiscIt API → INSERT into `disc_catalog`
4. Update `disc-catalog.js`: replace DiscIt fetch with Supabase query
5. Update `flight-guide.js`: adapt `loadCatalog()` to Supabase client
6. Add wear adjustment UI to bag view (new feature, can be phased)

### Open Questions
1. Admin UI: Manual SQL, custom admin page, or Data API Builder endpoint?
2. Seed automation: One-time manual seed or periodic refresh job?
3. DiscIt fallback: If our catalog stale/incomplete, should we fall back to DiscIt API or commit to 100% ownership?

---

## Decision: Flight Guide Data Source
**By:** AK (via Copilot) | **Date:** 2026-04-16 | **Scope:** Flight Guide feature data source selection

Use **DiscIt API** (discit-api.fly.dev/disc) as the primary disc catalog data source.

**Rationale:**
- Only source with flight numbers at scale (no other public API provides flight characteristics for 1000+ discs)
- Free and open with no licensing restrictions
- Reliable, stable API serving disc golf community with industry-standard flight number format (4 integers)
- Alternative sources (PDGA CSV, Marshall Street direct, manual entry) are impractical

**Implementation:**
- Parse legacy flight strings (e.g., "12 / 5 / -1 / 3") into discrete integer columns
- Implement 24h localStorage caching to minimize API calls
- Caching layer provides graceful degradation if API temporarily unavailable

**Note:** This decision assumes eventual migration to self-owned Supabase catalog (see ADR: Flight Numbers Data Ownership).

---

## ADR: Flight Numbers Data Ownership & Production Run Model
**Decision Lead:** Danny (Lead / Architect) | **Date:** 2026-04-21 | **Status:** Proposed | **Stakeholders:** Anders (User), Rusty (Frontend), Basher (Data)

This ADR lays out the architecture for three layers of flight number management:
1. Canonical catalog (remove Marshall Street dependency)
2. Production run variants (plastic/run variation)
3. Per-user adjustments (wear-based customization)

### A. Data Ownership Strategy: Recommendation = Import Once, Self-Managed

**Option A1 (Recommended ✓):**
- **Approach:** Seed Supabase `discs` table from DiscIt API once, then own all updates
- **Pros:** Clean break from dependency, full control, familiar structure, low migration friction
- **Cons:** One-time operational step, no auto-correction if Marshall Street discovers errors, manual process for new discs
- **Trade-off:** Operational simplicity vs. data freshness (acceptable for ~20–50 disc releases/year)

**Rejected Options:**
- **A2 (Build catalog from scratch):** Rejected — 10,000+ rows unsustainable, no initial data
- **A3 (DiscIt as fallback):** Rejected — still depends on DiscIt, defeats goal of independence

**Implementation:** One-time seed script → insert into `public.discs` → verify row count → manual updates going forward

---

### B. Production Run Model: Recommendation = One Row per Plastic

**Option B1 (Recommended ✓):**
- **Schema:** Separate row per plastic variant (innova-destroyer-champion, innova-destroyer-star, etc.)
- **Pros:** One true flight per physical variant, simple queries, enables plastic-aware UI, storage efficient
- **Cons:** Larger table (~10k–15k rows vs 3k), duplication, import complexity
- **Trade-off:** Larger table (negligible cost) vs. clarity (one flight = one reality)
- **ID format:** `{manufacturer}-{name}-{plastic}` (lowercase, kebab-case)

**Rejected Options:**
- **B2 (JSONB overrides):** Rejected — Supabase queries harder without stored procedures, UI complexity
- **B3 (Lookup table):** Rejected — overkill for data model, extra join complexity

---

### C. Wear Adjustment Model: Recommendation = Separate `disc_adjustments` Table

**Option C1 (Recommended ✓):**
- **Schema:** Separate table with `user_id`, `bagged_disc_id`, speed/glide/turn/fade offsets, reason field
- **Constraints:** Offsets bounded [speed: -4–4, glide: -3–3, turn: -3–3, fade: -2–2], one adjustment per bagged disc
- **RLS:** User can only adjust their own discs
- **Pros:** Clean separation, audit trail, easy revert, reusable fields, flexible for extensions
- **Cons:** Extra table + join (minimal performance hit at scale)

**Example:** Innova Destroyer Star (canonical: 12/5/-2/2) + wear adjustment (0/0/+1/+1) = final flight 12/5/-1/3

**Rejected Options:**
- **C2 (JSONB on user_discs):** Rejected — hard to query, no bounds enforcement, loses audit trail
- **C3 (Version history):** Rejected — conflates user adjustments with canonical data (data modeling nightmare)

---

### D. Frontend Migration: disc-catalog.js → Supabase

**Option D1 (Recommended ✓):**
- **Approach:** Direct Supabase query + localStorage cache (same pattern as DiscIt)
- **Implementation:** Replace DiscIt fetch with `supabase.from('discs').select(...)`
- **Cache:** localStorage still provides offline resilience + performance
- **Fallback:** Stale cache if Supabase temporarily unavailable
- **Pros:** Clean separation, no breaking changes to flight-guide.js, graceful degradation
- **Cons:** Two caches to manage, Supabase required for first-time users

**Rejected Options:**
- **D2 (Supabase RPC):** Rejected — adds server-side maintenance burden, overkill for <15k rows

**localStorage Version Bump:** Change key from `proispro_disc_catalog` to `proispro_disc_catalog_v2` (prevents stale data pollution)

---

### E. Migration Path: Phased Rollout with Feature Flag

**Phases:**
1. **Phase 1 (Schema Setup):** Create `discs` table, seed from DiscIt, verify counts
2. **Phase 2 (Feature Flag):** Update `disc-catalog.js` with `USE_SUPABASE_CATALOG = false`, internal testing
3. **Phase 3 (Cutover):** Flip flag to true, deploy, monitor error logs + latency
4. **Phase 4 (Cleanup):** Remove DiscIt code + feature flag after 1 week stability

**Concurrent Work:** While Phase 1/2 happen, build "Edit Flight" modal in `flight-guide.html` (wear adjustment UI)

**Go/No-Go Criteria:**
- ✅ Supabase row count within ±5% of DiscIt
- ✅ Spot-check: 10 random discs match DiscIt data
- ✅ Query latency <200ms (p95)
- ✅ Flight guide loads without errors
- ✅ localStorage fallback works (offline resilience proven)

**Post-Launch Success (1 week):**
- <1% error rate on Supabase queries
- Zero support tickets about missing discs/wrong flights
- ≥80% of users see all expected discs

### Implementation Timeline

| Dimension | Decision | Owner | Timeline |
|-----------|----------|-------|----------|
| **A. Data Ownership** | Import DiscIt once, self-manage | Basher | 1 day |
| **B. Production Run** | One row per plastic variant | Basher + Rusty | 2 days (curate plastics) |
| **C. Wear Adjustments** | Separate `disc_adjustments` table + RLS | Basher + Rusty | 3 days (schema + UI) |
| **D. Frontend Migration** | Supabase query + localStorage cache | Rusty | 1 day |
| **E. Migration Path** | Phased rollout with feature flag | Rusty + Basher | 5 days total |

**Week 1:** Basher curates plastics + runs import; Rusty updates `disc-catalog.js` + deploys Phase 2  
**Week 2:** Rusty builds wear adjustment UI + disc_adjustments schema; integration testing  
**Week 3:** Observation window; cleanup (remove DiscIt code, feature flag); go live with Flight Guide v2

### Key Decisions Locked In

1. ✅ No Marshall Street dependency — migrate to self-owned Supabase discs
2. ✅ Plastic variants as separate rows — enables per-plastic flight numbers
3. ✅ Wear adjustments as separate table — clean, auditable, reversible
4. ✅ Frontend stays vanilla — Supabase replaces DiscIt fetch, no UI rewrite
5. ✅ Phased rollout — feature flag mitigates rollback risk

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Supabase outage during migration | Low (99.9% SLA) | Medium | Feature flag → fallback to DiscIt (48h max) |
| Plastic variant data incomplete | Medium (manual curation) | Low | MVP: accept gaps, iterative improvement |
| Wear adjustment queries slow | Low (small table) | Medium | Monitor p95 latency, paginate if needed |
| Users lose custom adjustments | Very low (new feature) | N/A | RLS ensures user-scoped data |
| localStorage corruption | Low | Low | Error handling in place |

### Open Questions

1. **Plastic curation:** Manual research vs. auto-detect from DiscIt payload?
2. **New disc releases:** Manual admin updates or periodic DiscIt sync endpoint?
3. **Adjustment history:** Needed at launch or deferred (can add later, backward-compatible)?

---

## Spec: Disc Detail Modal — UX Specification
**By:** Livingston (UX Designer) | **Date:** 2026-04-16 | **For:** Rusty (Frontend Dev)

Replace the current right-side detail panel (320px `<aside class="fg-detail">`) with a centered, full-screen modal overlay. Goal: in-your-face product detail experience (inspired by trydiscs.com) with more screen real estate, prominent CTAs, future-ready for wear adjustment UI.

**Remove:** Marshall Street commercial link (lines 227-231 in flight-guide.html).

### Modal Structure & Information Hierarchy

**Desktop Layout (≥768px):** Two-column (image | details), max-width 720px, centered on viewport
**Mobile Layout (<768px):** Single-column, full-screen, scrollable

**Information Hierarchy:**
1. Disc name (H2, 1.5–1.8rem, font-weight 800) — hero element
2. Flight path visualization (large image/SVG) — visual anchor
3. Type + Stability badges (color-coded) — quick scan
4. Flight numbers with bars (enhanced: taller 12px, more spacing) — core data
5. Brand + category (smaller, muted) — context
6. Notes/description (placeholder) — future content
7. Wear adjustment UI (future, design space reserved) — only when in bag
8. "Add to My Bag" CTA (prominent button) — primary action

**Modal Structure:**
- **Backdrop:** `rgba(15, 23, 42, 0.85)` semi-transparent overlay, click to close
- **Card:** White/surface card, max-width 720px desktop (100% mobile)
- **Close button:** Top-right corner + ESC key + backdrop click

### Interaction Spec

**Open Modal:**
- Trigger: Click disc tile in grid
- Animation: Backdrop fade in (200ms), modal scale 95%→100% + fade (250ms ease-out)
- Body scroll locked (`overflow: hidden`)
- Focus moves to close button

**Close Modal:**
- Triggers: Close button (×), backdrop click, ESC key
- Animation: Reverse of open (200ms ease-in)
- Focus restored to clicked disc tile

**Modal Behavior:**
- Desktop: 720px max-width, centered, 2rem padding
- Mobile: Full-screen (100vw × 100vh), edge-to-edge
- Scrolling: Content scrollable if taller than viewport (overflow-y: auto)
- Focus trap: Tab cycles within modal

### Flight Number Visualization

**Current bars (keep them ✅):**
- Horizontal bar chart design (width = value)
- Color-coded by type (speed=yellow, glide=green, turn=blue/orange, fade=red)
- Numeric value displayed alongside
- Improvements in modal: increase bar height 8px→12px, gap .45rem→.65rem

**Wear Adjustment Section (Future):**
- Location: Between flight numbers and notes, only visible when `disc.isInBag === true`
- Design: Placeholder for now: `<div class="fg-wear-section" x-show="isInBag(selectedDisc)">Wear adjustments coming soon…</div>`
- Future: Per-flight inline sliders or single "Wear" slider (0–10 scale)

### Accessibility (WCAG 2.2)

**Focus Management:**
- On modal open: move focus to close button
- Focus trap: Tab cycles within modal (close → badges? → CTA → close)
- On modal close: return focus to clicked disc tile

**Keyboard Navigation:**
- ✅ ESC closes modal (already implemented)
- ✅ Click backdrop closes modal (new)
- ✅ Close button has aria-label
- ✅ Modal: `role="dialog"`, `aria-modal="true"`
- ✅ Modal title: `id="modal-title"`, backdrop: `aria-labelledby="modal-title"`

**Target Size:** Close button & CTA ≥44×44px (WCAG 2.5.8 AA)  
**Reduced Motion:** `@media (prefers-reduced-motion: reduce)` → transitions: none

### CSS Structure

**New classes:**
- `.fg-modal-backdrop` — fixed overlay, flex center
- `.fg-modal-card` — white card, max-width 720px, z-index 1000
- `.fg-modal-close` — 44px button, top-right corner
- `.fg-modal-content` — grid: 1fr 1.2fr (image | details)
- `.fg-modal-image-col`, `.fg-modal-pic`, `.fg-modal-pic-placeholder`
- `.fg-modal-details-col` — flex column, gap 1.2rem
- `.fg-modal-name`, `.fg-modal-brand`, `.fg-modal-badges`
- `.fg-wear-section`, `.fg-wear-title`
- `.fg-notes-section`, `.fg-notes-title`
- `.fg-modal-actions`, `.fg-modal-actions .fg-add-btn` — width 100%, min-height 48px

**Mobile (<768px):**
- `.fg-modal-backdrop`: padding 0 (full-screen)
- `.fg-modal-card`: max-width 100%, border-radius 0
- `.fg-modal-content`: grid-template-columns 1fr (single column), gap 1rem

### What to Remove

From `flight-guide.html`:
- Lines 159-237: `<aside class="fg-detail">` block
- Lines 227-231: `<a class="fg-store-link">` (no commercial links)

From `flight-guide.css`:
- Lines 269-395: `.fg-detail*` classes
- Lines 380-394: `.fg-store-link` class

From `flight-guide.js`:
- No deletions — reuse existing `showDetail`, `selectedDisc`, `addToBag`, `isInBag`, ESC handler

### Implementation Notes

**Order of Work:**
1. Remove old code (aside block, .fg-detail* CSS)
2. Add modal HTML structure (new backdrop + card)
3. Add modal CSS (from spec above)
4. Update Alpine methods (add `closeModal()`, track focus in `selectDisc()`)
5. Test interactions (open/close, backdrop, ESC, responsive, focus trap)
6. Accessibility review (screen reader, keyboard nav, contrast)

**Edge Cases:**
- No flight path image → placeholder (✈️ emoji)
- Very long disc names → wraps (line-height 1.2)
- Modal taller than viewport → scrollable (overflow-y: auto)
- Backdrop click during animation → completes without jank

**Future Work (Not in Scope):**
- Notes/description data source (Basher to add to schema?)
- Wear adjustment UI (Basher designing schema + logic)
- "Already in bag" state (change text to "View in Bag" or disable?)

### Summary

This spec replaces 320px side panel with modern, spacious modal:
- **Desktop:** Two-column (image left, details right), 720px max-width, centered
- **Mobile:** Full-screen, single-column, scrollable
- **Accessibility:** Focus trap, backdrop click, ESC, ARIA labels, keyboard nav
- **Future-ready:** Space for wear adjustments + notes

Modal provides 2× screen real estate, emphasizes flight path image, makes CTA prominent. Flight bars enhanced (taller, more spacing) but keep excellent design. No commercial links.

**Decision:** Modal replaces side panel. Marshall Street link removed. Wear + notes reserved for future work.

10 vivid OKLCH disc colors for the color picker UI in the Add/Edit Disc modal. Designed to evoke bold, sporty disc plastic on dark navy background.

**Palette (10 colors, hue-spread ~30–40° apart):**

| Name | OKLCH | Hex | H° |
|------|-------|-----|-----|
| Crimson | `oklch(0.72 0.24 25)` | #f04545 | 25 |
| Tangerine | `oklch(0.76 0.22 52)` | #f98340 | 52 |
| Solar Yellow | `oklch(0.80 0.20 108)` | #c0e418 | 108 |
| Lime | `oklch(0.76 0.22 140)` | #52de4a | 140 |
| Emerald | `oklch(0.74 0.22 162)` | #28d47a | 162 |
| Seafoam | `oklch(0.78 0.20 196)` | #20d4ba | 196 |
| Electric Blue | `oklch(0.72 0.18 235)` | #7cb4f8 | 235 |
| Iris | `oklch(0.74 0.22 278)` | #9578ff | 278 |
| Hot Plum | `oklch(0.72 0.26 308)` | #cc44cc | 308 |
| Hot Pink | `oklch(0.76 0.24 340)` | #f462a4 | 340 |

**Design Rationale:**

- **Lightness band L=0.72–0.80:** Perceptually uniform across hues (OKLCH's key advantage). Yellow at L=0.80 (upper limit) because yellow hue has limited sRGB chroma at lower lightness.
- **Chroma band C=0.18–0.26:** High saturation evokes bold disc plastic. Blues capped at C=0.18 (sRGB gamut narrower in blue region). Reds/magentas/purples push to C=0.24–0.26.
- **Full spectrum coverage:** Red → orange → yellow → lime → green → teal → blue → violet → plum → pink. Each disc distinctly identifiable by color alone.
- **Text: Always dark navy.** At L≥0.72, swatch luminance Y≈0.38–0.51. Dark text achieves ~8–10:1 contrast (WCAG AAA). White text fails at <2.5:1.
- **Semantic separation from type badges:** Badges (L=0.75, C=0.18) communicate disc *type*. Disc colors (C=0.18–0.26) communicate physical *appearance*. Different roles, different chroma authority.

**Implementation:**
- CSS variables: `--disc-{slug}` in `:root` (e.g., `--disc-crimson`, `--disc-solar-yellow`).
- JSON: Array of color objects (slug, name, oklch, hex, textColor).
- HTML: 11 swatch buttons (× + 10 colors), backgrounds via `style="background:var(--disc-{slug})"`.
- Touch targets: 44×44px minimum via `::after` pseudo-element, visual 32px.

---

### Disc Color Picker — Swatch Selection Pattern
**By:** Rusty (Frontend Dev) | **Date:** 2026-04-14 | **Status:** Active

Replaced free-text `<input type="text" id="discColor">` with visual swatch picker: 11 circular buttons (× + 10 named colors) backed by hidden `<input type="hidden" id="discColor">`.

**Key Decisions:**

1. **Human color names stored** — Data stores human-readable name (e.g., "Crimson"), not slug or OKLCH. Slug derived at render time via `.toLowerCase()`. Keeps data human-readable and decoupled from CSS internals.

2. **CSS variables wired via inline style** — Swatch backgrounds use `style="background:var(--disc-{slug})"` in HTML. When Saul defines `--disc-{slug}` in `:root`, picker colors update automatically—no JS change required.

3. **Touch target via `::after` pseudo-element** — Visual swatch 32px; touch target expanded to ≥44px by `::after { inset: -6px }`. Keeps layout compact while meeting WCAG 2.5.5 (44×44px minimum).

4. **Fixed 10-color palette** — Curated (10 slugs): crimson, tangerine, solar-yellow, lime, emerald, seafoam, electric-blue, iris, hot-plum, hot-pink. No free-text fallback. Existing disc data with non-palette color strings render without color dot (graceful degradation—no crash, just no dot).

5. **× (none) button is part of swatch group** — Deselection uses same `.color-swatch` mechanism as selection. No special state needed—`data-color=""` on none button; `setColorPicker('')` selects it.

6. **Unified picker state management** — `setColorPicker(name)` and `resetColorPicker()` are the single source of truth. They update hidden input value + visual selection + label text simultaneously.

7. **Card display** — Colored 10px dot via `style="background:var(--disc-{slug})"` prepended to 🎨 label. Border on dot handles white swatch legibility on dark backgrounds.

8. **Accessibility** — `aria-live="polite"` on `.color-label` announces selection changes to screen readers.

---

### Frontend Rewrite: Alpine.js + Supabase Client
**By:** Rusty (Frontend Dev) | **Date:** 2026-04-16 | **Status:** Implemented

Complete rewrite of frontend from vanilla DOM + DAB GraphQL to Alpine.js + Supabase JS client (both via CDN). No build step.

**What Changed:**
- Replaced DAB GraphQL queries → Supabase JS client CRUD operations
- Replaced vanilla DOM manipulation → Alpine.js reactive components
- Replaced Azure SWA auth → Supabase GitHub OAuth
- Weight input changed from `type="number"` → `type="text"` (matches PostgreSQL string column, allows flexible entries like "170-175")

**Key Design:**
- **Single Alpine component:** Entire app is one `discApp()` function (~300 lines, no splitting needed)
- **Graceful Supabase detection:** If `SUPABASE_URL` is placeholder, app runs in localStorage-only mode (local dev without Supabase project)
- **Auth gate:** Login screen shown when not authenticated (single-page app, no route-level auth needed)
- **`x-cloak` CSS rule:** Prevents flash of unstyled Alpine template syntax before hydration

**Files Modified:**
- `app.js` — Complete rewrite (Alpine + Supabase)
- `index.html` — Alpine directives + CDN script tags
- `styles.css` — Added `[x-cloak]` rule

**Files Created:**
- `docs/supabase-setup.md` — User setup guide
- `docs/migration-sql.sql` — PostgreSQL schema + RLS policies

**Preserved:**
- All CSS classes, visual design (zero styling changes)
- OKLCH color system, disc color swatches, condition dots, type badges
- localStorage fallback (offline/unconfigured mode)
- Export/import JSON functionality
- Toast notifications

---

### Azure Fully Decommissioned — Supabase is Sole Backend
**By:** Linus (DevOps) | **Date:** 2026-04-20 | **Status:** Complete

All Azure resources deleted from portal by AK. Repository cleaned of all Azure/CosmosDB/DAB configuration files and documentation.

**What Was Removed from Repo:**
- `docs/infra/` — Entire directory (Azure/DAB setup docs + PowerShell scripts)
- `.squad/skills/cosmosdb-best-practices/SKILL.md` — Obsolete CosmosDB skill
- `.squad/decisions/inbox/danny-dab-fix.md` — DAB troubleshooting notes (not durable)
- `.squad/decisions/inbox/danny-dab-retirement-migration.md` — Superseded by decisions.md
- `.gitignore` — Removed stale `docs/infra/` ignore rule

**Verification (grep confirmed zero references):**
- `app.js` — zero Azure/CosmosDB/DAB references
- `index.html` — zero Azure/CosmosDB/DAB references

**Current Stack (Sole Production):**
| Layer | Technology |
|-------|-----------|
| Hosting | GitHub Pages (proispro.com) |
| Database | Supabase PostgreSQL |
| Auth | Supabase GitHub OAuth |
| Deploy | GitHub Actions (`.github/workflows/deploy.yml`) |

**Portal Cleanup (Separate Action by AK):**
- Deleted `proispro` resource group (was empty — setup script never ran)
- Left DNS zones (likely shared test infrastructure)
- Zero active charges (CosmosDB + SWA were never provisioned)

**Status:** ✅ Azure fully decommissioned. Supabase is sole backend. Repo is clean.

---

### Cloud Services: Verify Deprecation & Documentation First
**By:** AK (User Directive via Copilot) | **Date:** 2026-04-15 | **Status:** Policy

Before making any architecture decisions involving cloud services (Azure, AWS, GCP, Supabase, etc.):
1. **First:** Check relevant vendor's official documentation for service status & best practices
2. **Never assume** patterns, pricing, or behavior — verify from source
3. **Applies to all agents**, especially Lead and DevOps roles

**Why:** Learned from CosmosDB/DAB experiment where assumptions about service behavior and fit led to wasted debugging and full migration. DAB was silently deprecated (November 30, 2025); production showed 500s with no helpful error message. Local SWA CLI bundled its own DAB runtime, creating illusion of working code.

**Red Flags for Deprecation Checks:**
- Instant 500 responses (not timeout) = runtime not starting
- Zero service logs in platform dashboards = feature not present
- Official docs redirect to overview pages = deprecation notice
- "Works locally but fails in production" with managed platform tooling

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
