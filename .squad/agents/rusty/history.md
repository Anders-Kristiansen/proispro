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
