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

---

## Color System

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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
