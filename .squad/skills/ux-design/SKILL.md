# UX Design Skill — Livingston

## Scope

UX design for **ProIsPro**: a disc golf disc tracker with a 2D flight guide, disc bag list, and add/edit forms. Stack is Alpine.js + vanilla CSS + GitHub Pages. No design tools (Figma etc.) — proposals are written as structured specs with concrete CSS/HTML guidance for Rusty to implement.

---

## Core UX Skills for This Project

### 1. Data Visualization — Flight Guide Grid

The flight guide is the most complex UI: a 2D grid where:
- **Y axis** = speed (1–15, top to bottom descending)
- **X axis** = stability (very-overstable → very-understable)
- ~4000 disc tiles rendered as colored chips

**Key UX considerations:**
- **Axis anchors**: Users need a sticky speed label column (left) and a sticky stability header row (top) so they don't lose their place while scrolling
- **Disc tile density**: At full catalog, tiles can stack 10+ deep per cell — need a "pile" treatment vs individual tiles
- **Scan path**: Users look for their disc type first (color), then speed/stability range — type color must read immediately at tile size (~60px)
- **Detail affordance**: Hover → tooltip (name + numbers); click → side panel. Hover must be obvious — shadow lift or border highlight, not just cursor change
- **Empty grid cells**: Currently show as empty — consider showing a faint "no discs here" hint for the stability/speed zone

### 2. Information Architecture — Disc Cards

The bag list shows disc cards. Each card shows: name, brand, type badge, flight pill badges (speed/glide/turn/fade), notes.

**Key issues to evaluate:**
- **Scannability**: Can the user find a specific disc fast? Consider sorting UI (by type, by speed, by name)
- **Flight number prominence**: Are the 4 numbers readable at a glance or cluttered?
- **Action discoverability**: Edit/delete actions should be visible on hover but not clutter at rest

### 3. Form Design — Add/Edit Disc Modal

Modal has 4 number inputs (speed, glide, turn, fade) + a stability preview label.

**Key issues to evaluate:**
- **Number input affordances**: Steppers (↑↓) vs text input vs slider — what's fastest for entering flight numbers?
- **Stability feedback**: The live preview label helps — but consider a small visual indicator (color dot or bar) inline
- **Validation**: Range limits (speed 1–15, turn -5 to +1, etc.) should give instant feedback, not just on submit

### 4. Navigation & Wayfinding

- Two pages: main bag (`index.html`) and flight guide (`flight-guide.html`)
- Entry points: "🗺 Flight Guide" in main header; "← My Bag" in flight guide header
- **Issue**: Is it clear from the flight guide that you can add a disc to your bag? The "Add to My Bag" button in the detail panel should be prominent

### 5. Mobile-First Responsive Design

GitHub Pages users may be on phones at the disc golf course.

**Critical checks:**
- 2D flight guide grid at 360px viewport: infinite-scroll grid collapses to a flat list sorted by stability — confirm this is implemented and readable
- Filter bar: should collapse to a hamburger or a single compact row on mobile
- Disc tiles: 60px chips — acceptable touch target (44px minimum per WCAG 2.5.5)
- Detail panel: full-screen overlay on mobile (not a side panel)

### 6. Loading & Empty States

- **Loading**: DiscIt API fetch can take 1–3 seconds. Show a skeleton grid or spinner — never blank screen
- **API error**: If DiscIt is down, show a helpful message ("Disc catalog temporarily unavailable") not just a blank grid
- **Empty filter**: "No discs match your filters" with a clear-filters CTA
- **Empty bag**: If user's bag is empty and they arrive on flight guide, "Add to My Bag" is the CTA

### 7. Accessibility — Interaction Patterns

- Grid tiles need keyboard navigation (Tab through tiles, Enter to open detail)
- Detail panel needs focus management (focus moves into panel on open, returns to tile on close)
- Filter controls need proper `<label>` associations
- Hover-only tooltips should also be accessible on focus

---

## Design Principles for ProIsPro

1. **Data first, decoration second** — disc numbers are the product; chrome should not compete
2. **Type color = fastest signal** — putter/mid/fairway/distance color system must be immediately legible
3. **Speed for power users** — disc golfers know their flight numbers; don't over-explain
4. **Mobile at the course** — users look up discs while playing; interactions must be thumb-friendly
5. **Dark theme is primary** — the flight guide established a dark navy palette; the main app should eventually match

---

## Collaboration Notes

- **Saul** owns color decisions — never override his palette; flag color issues to him
- **Rusty** implements — provide concrete CSS variable names and layout dimensions, not vague directions
- **Danny** reviews UX proposals before they go to Rusty — major redesigns need his sign-off
