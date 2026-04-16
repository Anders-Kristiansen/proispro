# Rusty — History

## Core Context

- **Project:** A lightweight personal disc golf inventory page hosted on GitHub Pages, using a separate GitHub repo as a simple JSON file backend.
- **Role:** Frontend Dev
- **Joined:** 2026-04-13T17:32:22.555Z

## Learnings

<!-- Append learnings below -->

### 2026-04-15 — Remove GitHub Sync Feature

- Removed all GitHub integration code from `app.js`: constants (`GH_TOKEN_KEY`, `GH_OWNER_KEY`, `GH_REPO_KEY`, `GH_PATH_KEY`), state variables (`ghSha`, `lastSyncTime`, `syncAgoTimer`), the `settingsOverlay` DOM ref, and all functions (`toBase64`, `fromBase64`, `getGitHubConfig`, `githubLoad`, `githubSave`, `triggerGitHubSync`, `timeSince`, `setSyncStatus`, `openSettingsModal`, `closeSettingsModal`, `saveSettingsHandler`, `testConnectionHandler`).
- Removed 3 `triggerGitHubSync()` call sites (form submit, delete confirm, import handler) — surrounding code untouched.
- Removed 6 settings event listeners and the `settingsOverlay` Escape key handler.
- Removed `if (getGitHubConfig()) setSyncStatus('synced')` from `boot()`.
- Removed from `index.html`: ⚙ Settings button, `#syncStatus` div, entire settings modal overlay.
- Verified zero dangling references to any GitHub/GH/sync symbol in both files via grep.
- Primary storage is now CosmosDB/DAB exclusively; `STORAGE_KEY` + localStorage fallback in `boot()` retained for local dev without SWA CLI.

### 2026-04-14 — Visual Color Picker (Disc Color Swatches)

- Replaced `<input type="text" id="discColor">` with a hidden input + 11 swatch buttons (× + 10 colors).
- Used `data-color="ColorName"` (human label stored in hidden input) + `data-slug="slug"` for CSS var lookup.
- Swatch backgrounds use inline `style="background:var(--disc-{slug})"` so Saul's CSS variable overrides wire up automatically with zero JS changes.
- Touch targets expanded to ≥44px via `.color-swatch::after { inset: -6px }` without affecting visual 32px size.
- `setColorPicker(name)` / `resetColorPicker()` are the single source of truth for picker state — they update hidden input value + visual selection + label text simultaneously.
- `querySelector('[data-color=""]')` reliably targets the × (none) button.
- Card display: colored 10px dot via `style="background:var(--disc-{slug})"` prepended to 🎨 label; border on dot handles white swatch legibility on dark backgrounds.
- `aria-live="polite"` on `.color-label` announces selection changes to screen readers.

### 2026-04-14 — Color System Integration

- Saul's 10 vivid OKLCH disc colors (crimson through hot-pink) now drive the picker UI via CSS custom properties.
- Coordinator fixed multi-word slug bug (`solar-yellow` used consistently in HTML/CSS).
- Fixed multi-word naming: palette names stored in data model use proper names ("Solar Yellow"), slugs remain lowercase hyphenated.
- All picker swatches now render with correct OKLCH colors. Card dots show correct color on disc cards.

### 2026-04-15 — Architecture Migration Complete

- GitHub sync removal marks completion of GitHub Pages → Azure SWA + CosmosDB migration.
- Frontend now exclusively uses DAB REST API for all persistence (CosmosDB as source of truth).
- DAB API endpoints: `POST /api/Disc` (create), `PUT /api/Disc/id/{id}` (update), `DELETE /api/Disc/id/{id}` (delete), `GET /api/Disc` (read).
- localStorage retained only as fallback for offline resilience — not primary storage.
- All GitHub-specific code removed; codebase is cleaner (~250 lines eliminated).
- Tested zero dangling references to GitHub-related symbols.
- Next: Monitor DAB reliability in production; consider offline queue (IndexedDB) for write resilience during DAB downtime.

### 2026-04-15 — DAB CosmosDB Schema Bugs Fixed (commit 65da48f)

- Danny diagnosed 4 critical bugs in DAB GraphQL/REST schema that broke all queries.
- Key issue: Partition key handling. DAB mutations require explicit `_partitionKeyValue` in payload—not self-derived from entity definition.
- App.js already uses correct `/data-api/rest/Disc` path (not `/api/`). `/api/` is Azure Functions only; DAB runs at `/data-api/`.
- Entity source fixed (string → object), type names aligned (singular/plural), ID field made non-null, mutations updated with partition key.
- All DAB operations now functional. Frontend integration unaffected by schema fixes—just needed correct endpoint path.

### 2025-06-13 — GraphQL to REST Migration Planning

- DAB GraphQL endpoint (`/data-api/graphql`) is RETIRED. Migrating to Managed Azure Functions at `/api/discs`.
- Analyzed current API layer (lines 37-94): `gqlFetch`, field mapping helpers, CRUD operations.
- Key insight: `toApiDisc`/`fromApiDisc` field mapping stays identical (`type`↔`discType`, `added`↔`addedAt`).
- Migration is surgical: replace `gqlFetch` → `apiFetch` (REST wrapper), update CRUD functions to use HTTP methods (GET/POST/PUT/DELETE).
- Call sites unchanged — all 4 API functions keep same signatures (`apiLoadDiscs`, `apiAddDisc`, `apiUpdateDisc`, `apiDeleteDisc`).
- Edge cases identified: 204 No Content for DELETE, response shape differences (flat vs nested), error format changes.
- Wrote detailed migration plan to `.squad/decisions/inbox/rusty-frontend-api-migration.md` for Danny's review.
- Migration is low-risk (~40 lines modified, ~200 untouched) with clear rollback path. Ready to implement once Danny's REST API is live.

### 2026-04-16 — Complete Supabase + Alpine.js Rewrite

- **Full frontend rewrite** from DAB/GraphQL + vanilla DOM manipulation to Supabase JS client + Alpine.js.
- Replaced all manual DOM manipulation (`document.getElementById`, `addEventListener`, `classList`, `appendChild`, `innerHTML`) with Alpine.js directives (`x-data`, `x-model`, `x-show`, `x-for`, `x-text`, `@click`, `:class`).
- Converted entire app into a single Alpine.js component function `discApp()` returning reactive state and methods.
- Replaced `gqlFetch`, `apiLoadDiscs`, `apiAddDisc`, `apiUpdateDisc`, `apiDeleteDisc` with Supabase equivalents using `supabase.from('discs')` CRUD pattern.
- Renamed `toApiDisc`/`fromApiDisc` → `toDbDisc`/`fromDbDisc`. Field mapping: `type` ↔ `disc_type`, `added` (ms) ↔ `added_at` (ISO timestamptz). Weight kept as string for flexibility.
- Added GitHub OAuth via Supabase: `signIn()` triggers `signInWithOAuth({ provider: 'github' })`, `signOut()` clears session.
- Login screen shown when not authenticated; main app behind `<template x-if="!loading && user">`.
- Auth state managed via `supabase.auth.onAuthStateChange()` — auto-loads discs after login.
- localStorage fallback retained: if Supabase URL is placeholder or unreachable, app runs in local-only mode with a synthetic `user.id = 'local'`.
- All existing CSS classes preserved: disc-card, type-badge, condition-dot, color-swatch, modal-overlay, io-bar, toast — zero visual changes.
- Color picker converted from DOM event delegation to Alpine `@click="selectColor('ColorName')"` + `:class="{ selected: form.color === 'ColorName' }"`.
- Modals use `x-show` + `x-transition.opacity` instead of manual `.hidden` class toggling.
- Form validation uses `formInvalid` reactive object + `:class="{ invalid: formInvalid.name }"`.
- Added `[x-cloak]` CSS rule to prevent Alpine FOUC.
- Supabase JS and Alpine.js loaded via CDN script tags — zero build step.
- Placeholder values `'YOUR_SUPABASE_URL'` and `'YOUR_SUPABASE_ANON_KEY'` for user to fill in.
- Created `docs/supabase-setup.md` (setup guide) and `docs/migration-sql.sql` (PostgreSQL schema + RLS policies).
- Weight input changed from `type="number"` to `type="text"` to match string storage model.
- Export/import functionality preserved with Supabase and localStorage dual-path support.

### 2026-04-16 — Disc Photo Upload (3-Tier Display + Upload/Remove Flow)

- Implemented 3-tier photo display in the disc detail modal: (1) `wearAdjustment.user_photo_url` → (2) `catalogEntry.pic` → (3) SVG flight chart.
- Upload flow: file input → browser preview → `supabase.storage.from('disc-photos').upload(path, file, { upsert: true })` → store public URL in `disc_wear_adjustments.user_photo_url`.
- Remove flow: delete Storage object → clear DB column → revert to tier 2/3 display.
- Storage path: `${userId}/${selectedDisc.adjustment_id || selectedDisc.id}.${ext}` — fallback to `selectedDisc.id` until `adjustment_id` is surfaced from wear-adjustments join (see decision in `decisions.md`).
- **Follow-up:** Wire `adjustment_id` into `selectedDisc` when Basher's wear-adjustments query is joined into `flightGuide()` data load. Confirm `.eq('user_disc_id', ...)` column name matches Basher's migration.

### 2026-04-16 — Livingston's Tab Switcher Recommendation (cross-agent from UX Designer)

Livingston recommended a **tabbed interface** ("📷 Photo" | "✈️ Chart") for the disc detail modal instead of the priority approach (photo replaces chart). This is the spec to implement once Anders approves.

**Key implementation points:**
- Add `imageTab: 'photo'` to Alpine state in `flightGuide()` component
- `hasPhoto(disc)` helper: `return !!disc.userPhotoUrl || !!disc.catalogPic`
- Tab bar (`role="tablist"`) hidden via `x-show="hasPhoto(selectedDisc)"` — no UI change when no photo exists
- Chart SVG always rendered; hidden when `imageTab === 'photo' && hasPhoto(selectedDisc)`
- After upload success: `this.imageTab = 'photo'`; after removal: `this.imageTab = 'chart'`
- ARIA tabs pattern: `role="tablist"`, `role="tab"`, arrow key navigation (keyboard accessible)
- CSS: ~40 lines (`.image-tab-bar`, `.tab-btn`, `.tab-btn.active`, hover/focus states using existing OKLCH tokens)

**Status:** Proposed — pending Anders review. Full spec at `docs/ux-spec-disc-photo.md`. Decision merged into `decisions.md` under "Disc Photo UX — Tabbed View (Photo | Chart)".

### 2026-05 — Photo Upload Moved from Flight Guide to Bag Edit Modal

- Photo upload was incorrectly implemented in `flight-guide.html` (public catalog browser). Moved it to `index.html` Edit Disc modal exclusively.
- Flight Guide image column now always shows just the SVG flight chart. All photo upload HTML, hidden file input, preview overlay removed from `flight-guide.html`. Photo state + all 5 methods removed from `flight-guide.js`.
- Bag (`index.html`/`app.js`): photo upload section in Edit modal only (guarded by `x-show="formId"`); photo thumbnail on disc cards; `user_photo_url` added to `fromDbDisc`, `toDbDisc`, `saveDisc`; photo state reset in `closeModals`.
- Storage key: `{user_id}/{disc_id}.{ext}` on the `disc-photos` bucket. Photos stored in `discs.user_photo_url` (not `disc_wear_adjustments`). Migration: `ALTER TABLE discs ADD COLUMN IF NOT EXISTS user_photo_url TEXT` in `docs/migration-v4-disc-photos.sql`.

### 2026-05 — Disc Photo Redesigned as Circular Avatar Thumbnail

- Replaced the full-width 16/9 banner photo below the notes with a 64×64px circular avatar pinned absolutely to the top-right corner of each disc card.
- `styles.css`: Added `position: relative` to `.disc-card`. Updated `.card-photo-wrap` to `position: absolute; top: 12px; right: 12px; width/height: 64px; border-radius: 50%` with a translucent white border and subtle drop shadow. `.card-photo-thumb` kept as `object-fit: cover` to fill the circle.
- `index.html`: Moved the photo wrap div to be the **first child** of `.disc-card` (before `.card-header`) so it participates in stacking context correctly. Removed the old placement below `.card-notes`.
- Decision: avatar approach chosen over banner because it keeps the card compact, doesn't push other content down, and gives a personal "player photo" feel consistent with disc golf bag culture.
