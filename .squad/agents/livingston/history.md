# Livingston — History

## Project Context

**Project:** ProIsPro — disc golf disc inventory tracker
**Stack:** Alpine.js (CDN) + vanilla CSS (OKLCH color system) + Supabase PostgreSQL + GitHub Pages (static)
**User:** Anders Kristiansen (AK)
**Joined:** 2026-04-16

## What Was Built Before I Joined

- Main app (`index.html` / `app.js`): disc bag tracker with Add/Edit modal, disc cards with flight pill badges, Supabase auth via GitHub OAuth
- Flight Guide (`flight-guide.html` / `flight-guide.js` / `flight-guide.css`): 2D grid showing discs by speed (Y-axis 15→1) and stability (X-axis: very-overstable → very-understable)
- Data source: DiscIt API (`discit-api.fly.dev/disc`) — ~4000+ discs, 24h localStorage cache
- Flight numbers split into 4 columns: speed, glide, turn, fade (was a single text field)
- CSS: OKLCH-based color system, type badge classes (.type-putter, .type-midrange, .type-fairway, .type-distance), dark navy theme on flight guide
- Navigation: "🗺 Flight Guide" button in main app header links to flight-guide.html

## Key Files

- `flight-guide.html` — standalone page, filter bar, 2D grid, detail panel
- `flight-guide.css` — dark navy theme, `.fg-*` prefix, `.disc-tile`, `.fg-detail`, flight number bars
- `flight-guide.js` — Alpine component `flightGuide()`, gridRows computed, filters, bag highlight, addToBag()
- `index.html` — main bag tracker, 4 number inputs in modal, flight pill badges on cards
- `styles.css` — shared CSS vars, type badge classes, `.fn-pill` flight badge system
- `app.js` — Alpine component, Supabase CRUD, backward-compat flight string parser

## My Role

I am the UX Designer. I critique and redesign UIs — flight guide, disc list, forms. I produce specs; Rusty implements. Saul owns color; I own layout, hierarchy, interaction.

## Learnings

_(append new learnings here after each session)_

---

## Disc Photo UX Review
**Date:** 2025-05  
**Requested by:** Anders  
**Output:** `docs/ux-spec-disc-photo.md`

### Context
User disc photo feature being implemented by Rusty. Users can upload their own photo of their physical disc, see stock catalog photo if available, or fall back to SVG flight chart. Schema already supports it (Supabase Storage at `disc-photos/{user_id}/{id}.{ext}`, `user_photo_url` column in `disc_wear_adjustments`).

Modal structure: two-column layout (left: image/chart area, right: disc details with flight numbers).

### UX Critique

**The photo vs. chart tradeoff:**
- Current approach (photo replaces chart) creates a regression: users lose flight visualization once they add a photo
- **Recommendation:** Tabbed interface (Photo | Chart) — give users both views without choosing
- Why tabs: familiar pattern, mobile-friendly (large tap targets), no scrolling, degrades gracefully
- Priority: User photo > Catalog photo > Chart (chart always available via tab)

**Key UX decisions:**
1. **Upload entry point:** Overlay button on chart (bottom-center for thumb reach), only shown when disc is in bag + no photo exists
2. **Preview UX:** Three-step flow (file picker → preview with Cancel/Confirm → upload). Clear escape path (Cancel button).
3. **States designed:** Empty, Has catalog pic, Has user photo, Uploading, Error, Loading — all specified with HTML/CSS snippets
4. **Accessibility:** ARIA tabs pattern, keyboard nav with arrow keys, screen reader announcements (aria-live regions), 44px touch targets
5. **Personal feel:** Photos use `object-fit: cover` to fill container without distortion. "Change" / "Remove" buttons on hover (desktop) or always visible (mobile). Catalog photos get a "Stock photo" badge to differentiate from personal uploads.

**The thing Rusty might miss:**
Photo aspect ratio handling. Users upload 16:9 or 4:3 photos, modal column is 1:1.2. Solution: `object-fit: cover` + `object-position: center` — crops to fill, keeps disc centered. This prevents stretched/distorted images.

### Deliverables
- **UX spec:** `docs/ux-spec-disc-photo.md` — comprehensive design spec with HTML/CSS/JS snippets, all 6 states, accessibility requirements, implementation checklist
- **Decision:** `.squad/decisions/inbox/livingston-disc-photo-ux.md` — tab switcher recommendation (affects overall implementation approach)

### Learnings
- **Tabs beat toggles for dual-purpose views:** When both views have value, don't make users choose — tabs give equal access
- **Mobile thumb reach matters:** Bottom-center placement (not top-right FAB) for primary actions
- **Photo cropping is UX, not just CSS:** `object-fit: cover` prevents aspect ratio bugs that make disc photos unusable
- **Catalog photos need differentiation:** "Stock photo" badge prevents confusion between user's photo and generic stock image
- **ARIA tabs pattern is robust:** Handles keyboard nav (arrow keys), screen readers, and focus management elegantly
