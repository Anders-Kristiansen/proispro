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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
