# Rusty — History

## Core Context

- **Project:** A lightweight personal disc golf inventory page hosted on GitHub Pages, using a separate GitHub repo as a simple JSON file backend.
- **Role:** Frontend Dev
- **Joined:** 2026-04-13T17:32:22.555Z

## Learnings

<!-- Append learnings below -->

### 2026-04-20 — Collections, Wishlist, For Sale Phases 1–3 (Completed)

- Final implementation of Moxfield-inspired inventory features: Collections, Wishlist, For Sale tabs.
- **Collections:** Non-reactive `_collectionDiscs` cache mirrors Supabase `collection_discs` join table. `getDiscsForCollection(coll)` resolves disc objects from cache in computed templates.
- **Wishlist:** Priority field (0/1/2) maps to emoji (🟢/🟡/🔴). `acquired` boolean preserves history (no hard deletes); UI splits into "wanted" and "acquired (strikethrough)" sections.
- **For Sale:** `forsaleDiscPickerFiltered` computed getter excludes already-listed discs. Status machine: available → pending → sold. Price stored as `NUMERIC(8,2)`, currency defaults to 'SEK'.
- CRUD pattern: optimistic local state update → Supabase write (fire-and-forget, no error handling blocking UI).
- `closeModals()` extended to reset all 13 modal flags (6 existing + 7 new). Escape key reliably dismisses any modal.
- Non-reactive caching simplifies state: collections schema flat, no deep nesting. Join table cached separately, resolved in computed getters — mirrors existing bags pattern.
- Supabase-only features (no localStorage fallback for Collections/Wishlist/ForSale, unlike bags/discs). All three `load*` methods fall through to empty arrays if auth unavailable.
- RLS validation: indirect ownership on junction table (via EXISTS check to collections) avoids denormalization.
- ~280 new lines app.js, 3 tabs + 7 modals index.html, ~140 lines styles.css. **Status:** Implemented, zero test failures.

### 2026-06-13 — Collections, Wishlist, For Sale (Phases 1–3)

- Added 3 new tabs: 📚 Collections, ✨ Wishlist, 🏷 For Sale — all follow existing bag/courses tab patterns.
- **Collections** use a `collections` array + `_collectionDiscs` non-reactive join cache (mirrors Supabase `collection_discs` join table). Getter `getDiscsForCollection(coll)` resolves disc objects from the cache.
- **Wishlist** items carry a `priority` field (0=low, 1=med, 2=high) and `acquired` boolean. The UI splits the list into "wanted" and "acquired (strikethrough)" sections.
- **For Sale** listings link to a disc via `disc_id`. `forsaleDiscPickerFiltered` computed getter excludes already-listed (non-sold) discs from the picker. Status machine: available → pending → sold (with relist path).
- All CRUD methods follow: optimistic local state update → Supabase write (fire-and-forget style). 🟢 Good fit task — no review needed.
- Pattern: computed getters (`get discCollectionPickerFiltered()`, `get forsaleDiscPickerFiltered()`) work as Alpine.js reactive computed properties using ES6 getter syntax — consistent with existing `filteredSorted`, `discPickerFiltered`, etc.
- `closeModals()` extended with all 7 new modal flags — Escape key handler auto-closes all of them.
- New CSS classes: `.collection-card`, `.wishlist-item`, `.wishlist-item.acquired`, `.priority-badge` (high/med/low variants), `.forsale-card`, `.forsale-card-right`, `.price-display`, `.status-badge` (available/pending/sold), `.forsale-actions` — all use existing OKLCH CSS vars.
- Mobile responsive: forsale-card and wishlist-item stack to column below 600px.

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

### 2026-05-XX — Moxfield-Inspired Inventory UX (Full Redesign)

**Implemented comprehensive UX overhaul based on Livingston's spec at `.squad/agents/livingston/ux-spec-disc-inventory.md`:**

**3 View Modes:**
- Grid View (default) — existing card layout with tags added
- List View — tabular row-based layout with sortable column headers, sticky header, flight number pills inline
- Compact View — ultra-dense single-line rows showing type badge, name, brand, flight numbers, tags

**Grouping:**
- Group by None (default flat list), Type (Putter→Distance), Brand (alphabetical), or Bag membership
- Collapsible group sections with header showing label + count, ▼/▶ toggle icon

**18 Sort Options:**
- Name (A→Z, Z→A)
- Type (Putter→Distance, Distance→Putter)
- Speed, Glide, Turn, Fade (Low→High, High→Low for each)
- Weight (Low→High, High→Low)
- Condition (Best→Worst, Worst→Best)
- Date Added (Newest, Oldest)
- Sort parsing: combined string like `'speed-desc'` split into field + direction

**Tag System:**
- Tags stored as JSONB array in discs table (added to `toDbDisc`/`fromDbDisc`)
- Tag chips in cards/rows with color-coded backgrounds (8 hashed OKLCH colors via `tagColor()` helper)
- Click-to-filter: clicking a tag toggles `activeTagFilter` state
- Tags field in edit modal with autocomplete datalist, add/remove buttons
- `allTags` computed getter returns unique tags across all discs for autocomplete

**Toolbar Redesign:**
- View toggle: 3 icon buttons (⊞ Grid / ☰ List / ≡ Compact) with active state styling
- Group dropdown: None, Type, Brand, Bag
- Sort dropdown: 18 combined options
- Advanced popover: brand text input, bag dropdown, condition dropdown, weight min/max inputs, "Clear all filters" button
- Filter chips row: [All][Putter][Midrange][Fairway Driver][Distance Driver] as toggle pills below toolbar

**Advanced Filters:**
- `filterBrand` (substring match on manufacturer)
- `filterBag` (checks bag membership via `isDiscInBag()`)
- `filterCondition` (exact match)
- `filterWeightMin` / `filterWeightMax` (numeric range)
- All filters integrated into `filteredSorted` computed getter

**Alpine.js State Updates:**
- Added: `viewMode`, `groupBy`, `sortBy`, `sortDir`, `activeSortColumn`, `activeTagFilter`, `showAdvancedPopover`, `filterBrand`, `filterBag`, `filterCondition`, `filterWeightMin`, `filterWeightMax`, `groupExpanded`, `tagInput`
- Updated `form` object to include `tags: []`
- New computed: `groupedDiscs` (returns array of `{ label, count, discs }` based on `groupBy`)
- New methods: `tagColor()`, `addTag()`, `setSortColumn()`, `toggleGroup()`
- Updated `discCount` to show "N of M discs" when filters active

**CSS (appended to styles.css):**
- View toggle: `.view-toggle`, `.view-toggle-btn`, `.view-toggle-btn--active`
- Filter chips: `.toolbar-filter-chips`, `.filter-chip`, `.filter-chip--active`
- Advanced popover: `.advanced-popover-wrap`, `.advanced-popover`, `.advanced-popover-row`, `.advanced-popover-label`
- List view: `.disc-list`, `.list-header`, `.list-header-cell`, `.list-row`, `.list-col-*` (9 column classes)
- Compact view: `.disc-compact`, `.compact-row`, `.compact-name-brand`, `.compact-flight`, `.compact-tags`, `.compact-actions`
- Tags: `.tag-chip`, `.tag-chip--clickable`, `.tags-container`
- Groups: `.group-section`, `.group-header`, `.group-header-label`, `.group-header-icon`
- Icon buttons: `.btn-icon`
- Mobile responsive: hide tags/bags/weight columns in list view on narrow screens

**HTML Changes:**
- Toolbar completely redesigned with new controls
- Main grid replaced with conditional template switching between Grid/List/Compact views
- All three views wrapped in `groupedDiscs` loop for collapsible group support
- Tags field added to edit modal below Notes
- Grid view template preserved (existing card structure) with tags added
- List view: sticky header row + data rows (9 columns)
- Compact view: minimal single-line rows

**Data Persistence:**
- Tags column (`JSONB[]`) expected in Supabase `discs` table
- Note: if `tags` column doesn't exist in DB, tags will only persist in localStorage fallback
- Added comment for Danny/Basher to add migration: `ALTER TABLE discs ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`

**Tech Notes:**
- No build step, no npm packages — vanilla Alpine.js + CSS
- All OKLCH color system preserved
- Existing bags, courses, AI scanner, photo upload functionality untouched
- Grouping uses `x-show` toggle on group content divs (default expanded via `groupExpanded[label] !== false`)
- List view header shown only for first group (avoids duplicate headers when grouping)
- Tag chips use inline `:style` binding for dynamic color from `tagColor()` hash function

### 2026-04-19 — Moxfield-Inspired Inventory UX (Complete Implementation)

**Full implementation of Livingston's comprehensive UX spec for inventory redesign:**

**3 View Modes:**
- Grid: Existing card layout with tags added
- List: Tabular 9-column layout (Color | Type | Name/Brand | Flight | Weight | Condition | Bags | Tags | Actions) with sticky header
- Compact: Ultra-dense single-line rows (~36px each, text-only)

**Grouping (4 options):**
- None (default, flat list)
- Type (Putter → Distance → Driver)
- Brand (alphabetical)
- Bag (shows which bags contain disc, multi-bag support)
- Collapsible sections with header showing label + count, ▼/▶ toggle

**18 Sort Options:**
- Name (A→Z, Z→A)
- Type (Putter→Distance, reverse)
- Speed, Glide, Turn, Fade (asc/desc pairs)
- Weight (Low→High, High→Low)
- Condition (Best→Worst, Worst→Best)
- Date Added (Newest, Oldest)
- Combined format: `'speed-desc'` (field-direction combined)

**Tag System:**
- Tags stored as JSONB array in `discs.tags`
- Color-coded chips (8 hashed OKLCH colors via deterministic `tagColor()`)
- Click tag → filter inventory to that tag only (toggle filter)
- Edit modal: autocomplete datalist, add/remove buttons
- `allTags` computed getter for suggestions

**Toolbar Complete Redesign:**
- View toggle: 3 icon buttons (⊞ Grid | ☰ List | ≡ Compact) with active state
- Group dropdown: None, Type, Brand, Bag
- Sort dropdown: 18 combined options
- Advanced button: opens popover
- Filter chips: [All] [Putter] [Midrange] [Fairway] [Distance] as toggle pills
- Disc count: shows "N of M" when filters active

**Advanced Filters Popover:**
- Brand text input (substring match)
- Bag dropdown (filter by bag membership)
- Condition dropdown (exact match)
- Weight min/max numeric inputs (range)
- "Clear all filters" button
- Click-outside auto-closes

**Alpine.js State Extensions (15+ variables):**
```javascript
viewMode, groupBy, sortBy, sortDir, activeSortColumn, activeTagFilter,
showAdvancedPopover, filterBrand, filterBag, filterCondition,
filterWeightMin, filterWeightMax, groupExpanded, tagInput
```

**New Computed Properties:**
- `groupedDiscs` — arrays of `{ label, count, discs }` based on groupBy + filters
- `filteredSorted` — unified filter + sort logic
- Updated `discCount` to show filtered count

**New Methods:**
- `tagColor(tag)` — deterministic hash to OKLCH color (8 colors)
- `setSortColumn(field)` — list header click handler, toggle sort direction
- `toggleGroup(label)` — collapse/expand group section
- `addTag(tag)` / `removeTag(tag)` — tag management

**CSS Additions (~300 lines):**
- View toggle, filter chips, advanced popover UI
- List view: sticky header, 9-column layout, mobile collapse (< 768px)
- Compact view: ultra-dense single lines
- Tags: color chips, clickable state
- Groups: collapsible sections, headers with icons, toggle animations
- Mobile responsive: hide non-essential columns on narrow screens

**Key Implementation Choices:**

1. **Combined Sort Strings** (`'speed-desc'`):
   - Simpler than separate `sortBy` + `sortDir` state
   - Dropdown easier to implement
   - URL parameter persistence simpler (single value)

2. **Default Expanded Groups:**
   - `groupExpanded[label] !== false` (undefined = expanded)
   - Reduces clicks for typical use case (users want to see all discs)
   - `toggleGroup()` flips boolean on demand

3. **Inline Dynamic Tag Colors:**
   - `tagColor()` hashes tag to OKLCH color
   - `:style="{ background: oklch(...), color: var(...) }"`
   - More maintainable than generated CSS classes
   - No need to pre-generate class names for all possible tags

4. **List Header: First Group Only:**
   - `x-if="groupedDiscs.indexOf(group) === 0"`
   - Avoids duplicate headers when grouping active
   - Clean visual hierarchy

5. **Popover with Click-Outside:**
   - `@click.outside="showAdvancedPopover = false"`
   - Auto-closes without manual escape handler
   - Alpine pattern, simpler than custom logic

6. **Conditional View Templates:**
   - Each view wrapped in `x-if="viewMode === '...'"`
   - Only one rendered at a time (not just hidden)
   - Reduces DOM memory for large inventories
   - Performance acceptable for 100+ discs

7. **Tags Persistence:**
   - `tags` JSONB expected in Supabase `discs` table
   - localStorage fallback if column doesn't exist
   - Comment added for Basher: migration SQL provided

**Statistics:**
- +673 net lines (HTML: +420, CSS: +300, JS: -47)
- Zero breaking changes
- No new dependencies
- All existing features untouched

**Quality & Testing:**
- All 3 view modes tested (Grid, List, Compact)
- All 18 sort options verified
- Grouping toggle/expand works correctly
- Tag colors deterministic
- Filter chips toggle properly
- Advanced popover click-outside works
- Tags persist in localStorage fallback
- Performance acceptable (O(n) grouping for <200 discs)

**Pending:**
- Basher/Danny: Add `tags JSONB` migration
- Testing: List view mobile column collapse, autocomplete behavior
- Testing: All sorts with null/empty values (flight numbers, weight, condition)
- Accessibility audit: tab order, screen reader, keyboard nav

**Commit:** 59f044a to main  
**Message:**
```
feat: Moxfield-inspired inventory UX — view modes, grouping, tags, advanced filters

- 3 view modes: Grid, List, Compact
- Group by: Type, Brand, Bag (collapsible sections)
- 18 sort options (speed, glide, turn, fade, condition, etc.)
- Tag system with color chips, click-to-filter, autocomplete
- Toolbar redesign: view toggle, group/sort dropdowns, filter chips
- Advanced popover: brand/bag/condition/weight range filters
- Updated discCount to show 'N of M discs' when filtered

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### Learnings from Implementation

- **Combined sort strings simplify state:** Avoids multiple dropdowns + synchronized state (vs. separate `sortBy`/`sortDir`)
- **Default expanded groups reduce cognitive load:** Users want to see data; they collapse on demand (vs. expand-on-demand which requires clicks)
- **Inline dynamic styles more maintainable:** No need to generate/maintain CSS class names for dynamic tags (vs. pre-generated classes)
- **Single list header prevents redundancy:** When grouping active, duplicate headers look broken (header-in-each-group pattern)
- **Click-outside pattern elegant in Alpine:** `@click.outside` directive cleaner than manual focus/click handlers
- **Conditional rendering (`x-if`) better than hiding (`x-show`):** For large lists, removing DOM beats hiding (memory/performance)
- **Progressive feature disclosure:** Grouping + advanced filters are opt-in; defaults (Grid, no grouping, name sort) remain simple
- **Spec quality matters:** Livingston's detailed spec made implementation straightforward; no clarification needed
- **Accessibility from design phase:** Built-in ARIA/keyboard nav, not retrofitted
- **Real-world organization mirrors digital UX:** Grouping by type/brand/bag resonates with users who organize physically

