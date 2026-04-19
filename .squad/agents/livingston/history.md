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

---

## Moxfield-Inspired Disc Inventory Redesign
**Date:** 2026-04-19  
**Output:** `.squad/agents/livingston/ux-spec-disc-inventory.md` (37KB comprehensive spec)

### Context
Anders asked for inventory redesign inspired by Moxfield's card collection manager. Current inventory (single grid view, basic filters) doesn't scale for users with 30+ discs.

### UX Specification Delivered

**Problem Identified:**
- One-size-fits-all Grid view too sparse for large collections (30+ discs = excessive scrolling)
- Users organize discs by type/brand/bag in real life, but app shows flat list
- No support for personalization (favorites, for sale, loaner discs)
- Type filter buried in dropdown (2 clicks to toggle)
- Sort options limited to 4; no column-based sorting for tabular layouts

**Solution Design:**

1. **Progressive Density via View Modes:**
   - Grid: Card layout (photo-first, current)
   - List: Tabular rows (9 columns for detailed comparison)
   - Compact: Ultra-dense single lines (20+ discs on screen at once)
   - Users choose density based on workflow (browsing vs. scanning vs. maximum info)

2. **Grouping for Organization:**
   - Group by Type, Brand, Bag (mirrors real-world organization)
   - Collapsible sections with count headers
   - Default expanded (reduces clicks)

3. **Expanded Sorting:**
   - 18 options (vs. 4): name, type, flight attributes, weight, condition, date
   - Each with asc/desc toggle
   - List view: click column headers for sorting (spreadsheet pattern)

4. **Tags System:**
   - Free-form tags for personalization (vs. predefined enum)
   - Low-friction: users tag discs (favorites, for sale, loaner, retired, practice)
   - One-click tag filtering faster than Advanced filters
   - Autocomplete suggestions reduce typos

5. **Toolbar Redesign:**
   - View toggle: 3 icon buttons (more discoverable than dropdown)
   - Filter chips: Putter/Midrange/Fairway/Distance as visible one-click toggles
   - Advanced popover: brand/bag/condition/weight range for power users
   - Filter chips + advanced filters = flexible discovery (quick + deep)

**Key Design Decisions:**

- **View Icons vs. Tabs:** Icons (⊞ ☰ ≡) more compact than tabs, suitable for view mode toggle
- **Free-Form Tags > Predefined:** Users have diverse workflows; autocomplete mitigates sprawl
- **Filter Chips Visible:** One-click toggles more discoverable than dropdown-nested filters
- **Column Sorting:** Spreadsheet pattern (click headers) more intuitive in tabular layouts than dropdown for grid view
- **Grouping Defaults:** Expand by default, users collapse on demand (reduce clicks for typical use)

**Mobile Considerations:**

- List view drops non-essential columns on < 768px (Tags, Bags, Weight)
- Shows only: Color | Type | Name | Flight | Actions
- Tags still accessible in detail view

**Accessibility Built In:**

- Icon buttons: `aria-label` for screen readers
- Column headers: `aria-sort="ascending|descending"`
- Group sections: `aria-expanded="true|false"`
- Filter chips: `role="button"` + `aria-pressed="true|false"`
- Keyboard navigation: arrow keys for tabs, enter for buttons

**Dependencies Identified:**

- **Rusty (Frontend):** Implement 5-phase rollout (View Modes → Sorting → Grouping → Tags → Advanced)
- **Basher (Data):** Add `tags` JSONB column to `discs` table
- **Saul (Color):** No new colors needed (reuse 8 OKLCH colors for tag hashing)

### Learnings

- **Multi-view approach beats single-view toggles:** When users have different needs (browsing vs. scanning vs. dense info), give them true choice, not compromise
- **Mirror real-world organization:** Users already organize discs by type/brand/bag physically; digital grouping resonates
- **Free-form data > predefined lists:** When workflows vary across users, allow flexibility (tags beat enums)
- **Make filters discoverable:** Visible chips + one-click better than nested dropdowns + multi-step interaction
- **Design for scale from the start:** Think about 30+ items from day 1, not 5. Density matters.
- **Accessibility is design, not QA:** Include ARIA/keyboard nav in spec upfront, not as afterthought
- **Rationale matters in specs:** Document "why" alongside "what" — helps implementer make informed trade-off decisions
