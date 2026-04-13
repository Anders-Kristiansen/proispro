# Squad Decisions

## Architecture & Design

### Static Vanilla Stack — No Build Pipeline
**By:** Danny (Lead) | **Date:** 2026-04-13 | **Status:** Active

Ship vanilla HTML, CSS, and JavaScript directly to GitHub Pages with no bundler, build step, or compilation.

**Rationale:** Simplicity justified for single-user inventory tool. Vanilla JS sufficient for CRUD + filtering. No tree-shaking, minification, or module system needed for <50KB assets. Instant deployment: commit → live in ~60 seconds.

**Implementation:** `index.html` (DOM + modals), `styles.css` (400L responsive grid), `app.js` (all business logic).

---

### Browser-First Storage with localStorage Primary
**By:** Danny (Lead) | **Status:** Active

Source of truth is localStorage. All edits happen client-side first; sync to GitHub is async/eventual.

**Rationale:** Offline-first (works when GitHub is down). Instant add/edit/delete (no server round-trip). Single-user eliminates multi-device conflicts. Trade-off: cache clear loses data unless synced to GitHub first.

**Implementation:** Load on mount from `localStorage.getItem('proispro_discs')`. Save on every mutation. Async sync trigger after local save.

---

### GitHub File Backend — User-Configured Repo
**By:** Danny (Lead) | **Status:** Active

User points app to their own GitHub repo + PAT. App syncs `discs.json` via REST API `PUT /repos/{owner}/{repo}/contents/{path}`.

**Rationale:** Data ownership (user data stays in user account). No central server/database. Transparent data location. One-time friction: user creates PAT + repo, then automated sync.

**Implementation:** Settings modal captures PAT, owner/org, repo, file path (stored in localStorage). After each local save, `githubSave()` fires async. GitHub REST API writes encoded JSON + commit. SHA tracking prevents 409 conflicts.

---

### GitHub Pages Hosting + CNAME Domain
**By:** Linus (DevOps) | **Date:** 2026-04-13 | **Status:** Active

Host static HTML at proispro.com via GitHub Pages + CNAME record.

**Rationale:** Free, CDN-backed, automatic deployments (push → live in 60s), automatic SSL. No custom nameservers needed.

**Setup:**
- CNAME file: `proispro.com`
- DNS: Either A records to GitHub Pages IPs (185.199.108–111.153) or CNAME to `{username}.github.io`
- GitHub repo Settings → Pages: Source = "GitHub Actions"
- GitHub auto-provisions HTTPS via Let's Encrypt once DNS propagates

**Workflow:** `.github/workflows/deploy.yml` triggers on push to main. Uploads repo root as artifact (no build step). Deploys via GitHub Pages action.

---

### No Backend Server — Stateless Architecture
**By:** Danny (Lead) | **Status:** Active

No Node.js server, database, or authentication layer beyond GitHub PAT.

**Rationale:** Cost (free tier). Operational simplicity (no server monitoring/scaling/patching). Single-tenant tool doesn't need multi-user API orchestration. Trade-off: user manages their own GitHub repo; no admin dashboard.

---

### Security: PAT in localStorage
**By:** Danny (Lead) | **Status:** Active

Store GitHub Personal Access Token in localStorage. No server-side proxy.

**Rationale:** Single-user scope (personal tool). No higher-value target (stores discs.json, not secrets). Operational simplicity. Trade-off: token exposure risk if device compromised.

**Mitigation:** 
- Link to PAT creation with `repo` scope only (no `admin:*`)
- Recommend short expiration (30–90 days) + periodic rotation
- User can immediately revoke PAT at github.com/settings/tokens
- Clear localStorage before sharing device/public computer

---

### Data Schema — Flat Array + Immutable IDs
**By:** Danny (Lead) | **Status:** Active

Single array of disc objects. Each disc: id + 10 standard fields + timestamps on add.

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

**Rationale:** Flat array (no joins, easy GitHub JSON serialization). Immutable IDs (`Date.now().toString(36) + Math.random().toString(36)`) collision-resistant for single user. `addedAt` enables sorting + audit trail. Trade-off: no relational constraints; app validates schema client-side.

---

### Conflict Resolution: Last-Write-Wins
**By:** Danny (Lead) | **Status:** Active

No conflict detection. Latest local edit always wins on sync.

**Rationale:** Single device/single user, no concurrent edits. Complex resolution (LWW clocks, CRDTs) overkill. Trade-off: multiple tabs open editing same disc — last commit to GitHub wins (acceptable for personal tool).

---

### UI Framework: Vanilla — Semantic HTML + CSS Grid
**By:** Danny (Lead) | **Status:** Active

No React, Vue, or framework. Semantic HTML + CSS Grid + vanilla DOM manipulation.

**Rationale:** Bundle size <50KB (framework overhead >100KB would double it). Anyone can read/modify HTML/CSS/JS (frameworks raise barrier). Instant iteration (no build step). Trade-off: more manual DOM updates, more state tracking. Fine for <1000 lines of app logic.

---

### Error Handling: Graceful Degradation
**By:** Danny (Lead) | **Status:** Active

If GitHub sync fails, app continues offline. Toast notifies user. Manual retry button available.

**Rationale:** Offline-first (user doesn't lose data). Transparency (real-time sync status). Trade-off: user may not notice until explicitly checking status indicator.

**States:** `syncing` (spinner), `synced` (checkmark + time), `failed` (warning + clickable retry).

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
