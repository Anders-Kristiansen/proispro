# UX Spec: Moxfield-Inspired Disc Inventory

**Author:** Livingston (UX Designer)  
**Date:** 2026-04-15  
**For Implementation By:** Rusty (Frontend Dev)  
**Status:** Ready for Review

---

## Overview

This spec defines a complete UX redesign of the disc inventory view, inspired by Moxfield's card collection manager. The design introduces three view modes (Grid, List, Compact), grouping controls, expanded sorting, a tag system, and a redesigned toolbar with filter chips.

**Core Principle:** Progressive density — users can view the same data in three densities based on their workflow (browsing vs. managing large collections).

**Tech Stack Reminder:** Alpine.js + vanilla CSS + OKLCH colors. No build step, no dependencies beyond CDN.

---

## 1. View Modes

Three mutually exclusive view modes, toggled via toolbar buttons.

### 1.1 Grid View (Current Default)

**What It Looks Like:**
- Card-based layout with responsive grid (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`)
- Each card shows: photo/avatar (120px circle), name, brand, weight/plastic/color/condition row, flight number pills, bag count badge, notes, edit/delete buttons
- Visual hierarchy: photo dominates, flight numbers are prominent (colored pills), metadata is muted
- Spacing: 1.2rem gap between cards
- Current `.disc-card` structure is preserved — this is the baseline view

**Key CSS Classes:**
- `.view-grid` — applied to main container when Grid is active
- `.disc-card` — existing card component (no changes needed)
- `.card-photo-wrap`, `.card-header`, `.card-details`, `.card-flight`, `.card-notes`, `.card-actions` — existing (preserve)

**Alpine.js State:**
- `viewMode: 'grid'` (default)

**UX Notes:**
- Best for browsing and visual recognition (photo-first)
- Slowest to scan for specific data points
- Current behavior — just ensure it's one of the three selectable modes

---

### 1.2 List View (New)

**What It Looks Like:**
- Tabular row-based layout, one disc per row
- Each row is a horizontal flex container with fixed column widths
- Rows have alternating subtle background colors for scannability (`:nth-child(odd)` gets `background: oklch(0.18 0.03 264)`)
- Hover state: row background lightens slightly (`background: oklch(0.24 0.03 264)`)
- Sticky header row with column labels (bold, smaller font, muted color)
- No card borders — rows separated by 1px divider lines

**Column Structure (left → right):**

| Column | Width | Content | Alignment |
|--------|-------|---------|-----------|
| Color Dot | 32px | 16px circle, disc color (CSS var) | center |
| Type Badge | 80px | Colored pill (e.g., "Putter") | center |
| Name + Brand | flex-grow | Name (bold, 0.95rem) stacked above brand (muted, 0.8rem) | left |
| Flight | 140px | 4 inline pills: S/G/T/F (same styling as grid cards) | center |
| Weight | 60px | "175g" (0.85rem) | center |
| Condition | 80px | Dot + label (e.g., "🟢 Good") | center |
| Bags | 60px | "👜 2" or "—" if none | center |
| Tags | flex (min 100px) | Colored chips (see Tags section) | left |
| Actions | 100px | Edit icon + Delete icon (icon buttons, 32px each) | right |

**Column Headers:**
- Row with same column layout, background: `var(--clr-surface2)`, sticky top (below toolbar)
- Each header is clickable (cursor: pointer) and triggers sort
- Active sort column shows ▲ (asc) or ▼ (desc) indicator next to label
- Headers: "Color", "Type", "Name", "Flight", "Weight", "Condition", "Bags", "Tags", "Actions"

**Mobile Behavior (< 768px):**
- Hide: Tags, Bags, Weight columns
- Show only: Color Dot | Type Badge | Name/Brand | Flight | Actions
- Columns collapse to smaller widths: Type Badge → 60px, Flight → 120px

**Key CSS Classes:**
- `.view-list` — applied to main container
- `.list-header` — sticky header row
- `.list-row` — each disc row
- `.list-col-{name}` — individual column cells (e.g., `.list-col-color`, `.list-col-type`)
- `.list-header-cell` — header cells (clickable, show sort indicator)
- `.list-row:hover` — hover state

**Alpine.js State:**
- `viewMode: 'list'`
- `activeSortColumn: 'name'` (tracks which column is being sorted)
- `sortDir: 'asc'` | `'desc'`

**UX Notes:**
- Best for scanning specific data (weight, condition, flight numbers)
- Sortable columns enable quick reorganization
- Dense but still readable — flight numbers inline, not stacked
- Mobile view strips non-essential columns to stay usable on narrow screens

---

### 1.3 Compact View (New)

**What It Looks Like:**
- Ultra-dense list — each disc is a single line (max 2 lines on mobile)
- No photos, no metadata rows — just essential identifiers + flight numbers
- Each row: `[Type Badge] Name – Brand  (S/G/T/F)  [Tags]`
- Row height: ~36px (compared to ~240px for Grid cards)
- Hover: subtle background highlight
- Divider lines between rows (1px, muted)

**Row Structure:**
```
[Putter] Aviar – Innova  (2/3/0/1)  favorite · retired
```

- Type Badge: 70px, same colored pill as Grid/List
- Name + Brand: `Name – Brand` inline, 0.9rem, left-aligned
- Flight numbers: parenthesized inline `(S/G/T/F)`, 0.85rem, muted color
- Tags: small chips, right-aligned
- Actions: hidden by default, appear on hover (edit + delete icons, 24px, far right)

**Spacing:**
- Padding: 0.5rem vertical, 0.8rem horizontal
- Gap between elements: 0.6rem

**Mobile Behavior (< 480px):**
- Stack to 2 lines:
  - Line 1: `[Type Badge] Name – Brand`
  - Line 2: `(S/G/T/F)  [Tags]` (indented to align under name)

**Key CSS Classes:**
- `.view-compact` — applied to main container
- `.compact-row` — each disc row
- `.compact-type-badge` — type pill (smaller than Grid/List)
- `.compact-name-brand` — inline name/brand
- `.compact-flight` — parenthesized flight numbers
- `.compact-tags` — tag chip container
- `.compact-actions` — hover-revealed action buttons

**Alpine.js State:**
- `viewMode: 'compact'`

**UX Notes:**
- Best for large collections (50+ discs) — can see 20+ discs on screen at once
- No visual clutter — text-first, data-dense
- Still shows flight numbers (critical for decision-making)
- Actions on hover reduce noise
- Like Moxfield's "Condensed Text" mode — maximum information density

---

## 2. Group By

Grouping creates collapsible sections within the active view. Groups are rendered sequentially (no grid wrapping within groups).

### 2.1 Group By: None (Default)

**Behavior:**
- No section headers
- Discs render in flat list/grid based on current sort order
- This is the current behavior — preserve it

**Alpine.js State:**
- `groupBy: 'none'`

---

### 2.2 Group By: Type

**Behavior:**
- Discs grouped into four sections: Putter | Midrange | Fairway Driver | Distance Driver
- Order: Putter → Midrange → Fairway → Distance (matches throw progression)
- Each section has a header row

**Section Header:**
```
Putter (14)  [▼]
────────────────────────────────────────
```

- Bold, left-aligned, 1rem font
- Count in parentheses (e.g., `(14)`)
- Collapse icon (▼ expanded, ▶ collapsed) on the far right
- Clickable header toggles section visibility
- Divider line below header (1px, `var(--clr-border)`)

**Collapsed State:**
- Section content hidden (Alpine `x-show` toggle)
- Icon changes to ▶
- Header row still visible

**Empty Groups:**
- If a type has 0 discs, don't show the section at all

**Key CSS Classes:**
- `.group-header` — section header row
- `.group-header-label` — "Putter (14)"
- `.group-header-icon` — collapse toggle icon
- `.group-section` — container for all discs in that group
- `.group-section[data-collapsed="true"]` — collapsed state

**Alpine.js State:**
- `groupBy: 'type'`
- `groupExpanded: { putter: true, midrange: true, fairway: true, distance: true }` — object tracking each group's collapsed state

**UX Notes:**
- Type grouping is the most intuitive for disc golfers (matches bag organization)
- Collapsing allows users to focus on one category at a time
- Count gives immediate sense of collection balance

---

### 2.3 Group By: Brand

**Behavior:**
- Discs grouped by `manufacturer` field
- Groups sorted alphabetically (A→Z)
- Same collapsible header structure as Type grouping

**Section Header Example:**
```
Innova (23)  [▼]
────────────────────────────────────────
```

**Empty Manufacturer Field:**
- Group as "(Unknown Brand)" at the end

**Key CSS Classes:**
- Same as Type grouping (`.group-header`, `.group-section`)

**Alpine.js State:**
- `groupBy: 'brand'`
- `groupExpanded: { 'innova': true, 'discraft': true, ... }` — dynamically built based on unique manufacturers

**UX Notes:**
- Useful for users who prefer certain brands (e.g., all Innova discs)
- Alphabetical order is predictable

---

### 2.4 Group By: Bag

**Behavior:**
- Discs grouped by which bag(s) they're in
- Groups: Bag 1 | Bag 2 | Bag 3 | Not in any bag
- Order: Bags in creation order, then "Not in any bag" last

**Section Header Example:**
```
Bag 1 (18)  [▼]
────────────────────────────────────────
```

**Multi-Bag Discs:**
- If a disc is in multiple bags, show it in **each bag's section**
- Label the disc in secondary bags with a subtle "Also in Bag 2" chip below the card/row

**Not in any bag:**
- Group as "Not in any bag (N)" at the end
- Helps identify unused discs

**Key CSS Classes:**
- Same as Type/Brand grouping
- `.multi-bag-indicator` — "Also in Bag 2" chip

**Alpine.js State:**
- `groupBy: 'bag'`
- `groupExpanded: { 'bag-{id}': true, 'none': true }` — dynamically built based on user's bags

**UX Notes:**
- Useful for planning bag swaps or identifying gaps
- Multi-bag discs appear twice (intentional duplication for context)
- "Not in any bag" section surfaces forgotten discs

---

## 3. Sort Controls

Expanded sort options beyond the current 4 (Name, Type, Weight, Date Added).

### 3.1 Sort Options

All sort options are in a single dropdown (replacing current "Sort: Name" dropdown in toolbar).

**Dropdown Label:** "Sort"

**Options:**

| Label | Sort Field | Direction | Notes |
|-------|-----------|-----------|-------|
| Name (A→Z) | `name` | asc | Default — alphabetical |
| Name (Z→A) | `name` | desc | Reverse alphabetical |
| Type (Putter → Distance) | `type` | asc | Order: putter, midrange, fairway, distance |
| Type (Distance → Putter) | `type` | desc | Reverse type order |
| Speed (Low → High) | `speed` | asc | 1 → 14 |
| Speed (High → Low) | `speed` | desc | 14 → 1 |
| Glide (Low → High) | `glide` | asc | 1 → 7 |
| Glide (High → Low) | `glide` | desc | 7 → 1 |
| Turn (Understable → Overstable) | `turn` | asc | -5 → 1 (most understable first) |
| Turn (Overstable → Understable) | `turn` | desc | 1 → -5 |
| Fade (Low → High) | `fade` | asc | 0 → 5 |
| Fade (High → Low) | `fade` | desc | 5 → 0 |
| Weight (Low → High) | `weight` | asc | 150g → 180g |
| Weight (High → Low) | `weight` | desc | 180g → 150g |
| Condition (Best → Worst) | `condition` | asc | new → good → used → beat |
| Condition (Worst → Best) | `condition` | desc | beat → used → good → new |
| Date Added (Newest) | `added` | desc | Most recent first |
| Date Added (Oldest) | `added` | asc | Oldest first |

**Sort Logic:**
- When a sort field has `null` or empty values, push those discs to the end (regardless of direction)
- Example: sorting by Speed (High→Low) — discs with no speed value appear at the bottom

**Key CSS Classes:**
- `.sort-dropdown` — styled select (same as current `.select-input`)

**Alpine.js State:**
- `sortBy: 'name'` — field name
- `sortDir: 'asc'` — direction
- Or combine into one: `sortBy: 'name-asc'` (simpler for dropdown binding)

**UX Notes:**
- Explicit direction labels (no toggle button) — clearer for new users
- Separate speed/glide/turn/fade sorts enable power-user queries ("show me all high-glide discs")
- Condition sort helps identify discs to retire or sell

---

### 3.2 Column Header Sorting (List View Only)

In **List View**, clicking a column header sets the sort field and toggles direction.

**Behavior:**
- Click "Name" header → sort by name ascending (▲)
- Click "Name" header again → sort by name descending (▼)
- Click different header → switch to that field, default ascending
- Active column header shows ▲/▼ indicator next to label

**Implementation:**
- `@click="setSortColumn('name')"` on each header cell
- `setSortColumn(field)` function:
  - If `activeSortColumn === field`, toggle `sortDir`
  - Else, set `activeSortColumn = field`, `sortDir = 'asc'`

**Visual Indicator:**
- Active header: bold, accent color (`var(--clr-accent)`)
- Inactive headers: normal weight, muted color

**Key CSS Classes:**
- `.list-header-cell--active` — active sort column
- `.sort-indicator` — ▲ or ▼ icon

**UX Notes:**
- Column sorting is faster than reaching for the dropdown
- Familiar interaction pattern (spreadsheets, data tables)
- Only available in List View (Grid/Compact don't have columns)

---

## 4. Tags System

Lightweight, free-form tagging for discs. Tags are strings stored in an array field on each disc object.

### 4.1 Data Model

**Disc Object Extension:**
```json
{
  "id": "abc123",
  "name": "Destroyer",
  // ... existing fields ...
  "tags": ["favorite", "for sale"]
}
```

- `tags` is an array of strings (default: `[]`)
- Tags are case-insensitive for filtering (normalize to lowercase on save)
- No predefined tag list — users create tags on the fly

**Database Schema Update:**
- Add `tags` column to `discs` table (JSONB array in Postgres/Supabase)
- Rusty handles DB migration

---

### 4.2 Tag Display

**Grid View:**
- Tags appear below the card notes, above the action buttons
- Each tag is a small colored chip (rounded pill, 0.75rem font, 0.3rem padding)
- Tag color: deterministic hash of tag name → one of 8 badge colors (putter/midrange/fairway/distance + 4 accent colors)
- Max 5 tags visible, "+N more" if overflow

**List View:**
- Tags column shows chips inline (same styling as Grid)
- Chips wrap if needed, but column has flex-basis: 100px min
- On mobile (< 768px), Tags column is hidden

**Compact View:**
- Tags appear at the end of the row, after flight numbers
- Small chips (0.7rem font), no overflow indicator (just wrap to 2 lines if needed)

**Key CSS Classes:**
- `.tag-chip` — individual tag (pill shape, background color based on tag name hash)
- `.tag-chip--clickable` — hover state (pointer cursor, brightness boost) — tags in card/row are clickable to filter
- `.tags-container` — wrapper for all tags in a card/row

**Color Assignment:**
```javascript
// Hash tag string to index 0-7
function tagColor(tag) {
  const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = ['--putter', '--midrange', '--fairway', '--distance', '--clr-accent', '--clr-accent2', '--disc-emerald', '--disc-iris'];
  return colors[hash % 8];
}
```

**UX Notes:**
- Colored chips are visually distinct (easier to scan than plain text)
- Deterministic color = same tag always has same color (consistency)
- Clicking a tag in a card/row filters the inventory to that tag (see Filtering below)

---

### 4.3 Tag Management

**Adding a Tag:**
- In the disc edit modal, add a "Tags" field below "Notes"
- Field has: text input + "Add" button + list of current tags (each with × remove button)
- User types tag name → clicks "Add" → tag added to disc's `tags` array → chip appears
- Autocomplete suggestions: show tags already used in other discs (deduplicated, sorted by frequency)

**Removing a Tag:**
- Click × on tag chip in edit modal → tag removed from disc's `tags` array

**Tag Autocomplete:**
- As user types in tag input, show dropdown with matching existing tags
- Click suggestion → fills input, user clicks "Add" to confirm
- Prevents typos and tag proliferation ("favortie" vs "favorite")

**Key CSS Classes:**
- `.tag-input-row` — input + "Add" button
- `.tag-list` — list of current tags (chips with × buttons)
- `.tag-autocomplete` — dropdown with suggestions

**Alpine.js State:**
- `formTags: []` — array of tags for the disc being edited
- `tagSuggestions: []` — computed list of existing tags (from all discs)

**UX Notes:**
- Simple inline management (no separate "Tags" tab or modal)
- Autocomplete reduces tag sprawl
- Common suggested tags: "favorite", "loaner", "practice", "retired", "for sale"

---

### 4.4 Tag Filtering

**Behavior:**
- Clicking a tag chip in a disc card/row activates a tag filter
- Inventory filters to show only discs with that tag
- Active tag filter shows in the toolbar as a highlighted chip: `[favorite ×]` (click × to clear filter)

**Multiple Tag Filters (Future Enhancement):**
- For v1, support only one active tag filter at a time
- Future: allow multiple tags (AND logic — disc must have all selected tags)

**Filter Chip in Toolbar:**
- Appears next to type filter chips (see Toolbar section)
- Accent color background, bold text, × button on right
- Click × to clear tag filter

**Alpine.js State:**
- `activeTagFilter: ''` — currently filtered tag (empty string = no filter)
- Filter logic in `filteredSorted` computed property:
  ```javascript
  if (this.activeTagFilter) {
    discs = discs.filter(d => d.tags?.includes(this.activeTagFilter));
  }
  ```

**UX Notes:**
- One-click filtering is fast and discoverable
- Tag filter combines with search, type filter, and grouping (all filters are AND-ed)
- Future enhancement: multi-tag filtering with pill badges

---

## 5. Toolbar Redesign

Current toolbar has 4 elements: search input | type dropdown | sort dropdown | count.

New toolbar has 6 elements: search input | view toggle | group dropdown | sort dropdown | advanced popover | count.

### 5.1 Toolbar Layout

**Top Row (Main Toolbar):**
```
[🔍 Search input ──────────]  [⊞ ☰ ≡]  [Group ▼]  [Sort ▼]  [Advanced ▼]  [42 discs]
```

- Search input: flex-grow (min 200px on desktop)
- View toggle: 3 icon buttons (Grid, List, Compact) — only one active at a time
- Group dropdown: 80px min-width
- Sort dropdown: 120px min-width
- Advanced button: 90px min-width
- Disc count: right-aligned, muted text

**Bottom Row (Filter Chips):**
```
Type:  [All] [Putter] [Midrange] [Fairway] [Distance]    Tag: [favorite ×]
```

- Filter chips appear below main toolbar, separated by subtle divider line
- Type chips are toggles (click to activate, click again to deactivate)
- Active chip: accent background (`var(--clr-accent)`), bold text
- Inactive chip: surface background (`var(--clr-surface2)`), normal text, border
- "All" chip: special case — activating "All" clears all other type filters
- Tag chip: only appears when `activeTagFilter` is set

**Key CSS Classes:**
- `.toolbar` — main toolbar row (existing, update flex layout)
- `.toolbar-filter-chips` — bottom row for type/tag chips
- `.filter-chip` — individual chip (pill shape, toggle behavior)
- `.filter-chip--active` — active chip state
- `.tag-filter-chip` — active tag filter chip (accent color, × button)

**Alpine.js State:**
- `viewMode: 'grid' | 'list' | 'compact'`
- `groupBy: 'none' | 'type' | 'brand' | 'bag'`
- `sortBy: 'name-asc' | 'speed-desc' | ...`
- `filterType: ''` (empty = all types, or 'putter', 'midrange', 'fairway', 'distance')
- `activeTagFilter: ''`

**Responsive Behavior (< 768px):**
- Main toolbar wraps to 2 rows:
  - Row 1: Search input (full width)
  - Row 2: View toggle | Group | Sort | Advanced | Count
- Filter chips row stays below

**UX Notes:**
- View toggle is prominent (icon buttons = visual, not buried in dropdown)
- Filter chips replace the old type dropdown (more discoverable, no dropdown fatigue)
- "All" chip makes clearing filters explicit

---

### 5.2 View Toggle Buttons

Three icon buttons, only one active at a time (radio button behavior).

**Icons:**
- Grid: `⊞` (U+229E, squared plus) — represents card grid
- List: `☰` (U+2630, trigram for heaven) — represents horizontal rows
- Compact: `≡` (U+2261, identical to) — represents dense lines

**Styling:**
- Button size: 40px × 40px
- Active button: accent background (`var(--clr-accent)`), dark text
- Inactive button: surface background (`var(--clr-surface2)`), light text, border
- Hover (inactive): brightness boost

**Key CSS Classes:**
- `.view-toggle` — container for 3 buttons
- `.view-toggle-btn` — individual button
- `.view-toggle-btn--active` — active button state

**Alpine.js State:**
- `viewMode: 'grid'`
- `@click="viewMode = 'list'"` on List button

**UX Notes:**
- Icon-only buttons save horizontal space
- Visual icons are intuitive (no need for "Grid" label)
- Active state is obvious (bright accent color)

---

### 5.3 Group Dropdown

Simple dropdown with 4 options.

**Dropdown Label:** "Group"

**Options:**
- None (default)
- Type
- Brand
- Bag

**Styling:**
- Same as current `.select-input` (80px min-width)

**Alpine.js State:**
- `groupBy: 'none'`

**UX Notes:**
- "None" is the default (current behavior — no grouping)
- Label "Group" is verb-neutral (not "Group by…" which is wordy)

---

### 5.4 Sort Dropdown

Expanded to 18 options (see Section 3.1 Sort Controls).

**Dropdown Label:** "Sort"

**Styling:**
- Same as current `.select-input` (120px min-width to fit "Turn (Understable → Overstable)")

**Alpine.js State:**
- `sortBy: 'name-asc'` (combined field + direction)

**UX Notes:**
- Explicit direction labels (no separate toggle button)
- 18 options is dense but still scannable (grouped by field in UI: Name, Type, Speed, etc.)

---

### 5.5 Advanced Popover

Reveals additional filters in a popover (not a full modal overlay).

**Trigger Button:**
- Label: "Advanced"
- 90px min-width
- Click toggles popover visibility

**Popover Content:**
- Anchored below the "Advanced" button, right-aligned
- Background: `var(--clr-surface)`, border: `var(--clr-border)`, shadow: `var(--shadow)`
- Width: 280px
- Contains 5 filter inputs:

1. **Brand Text Search**
   - Input field: "Filter by brand…" placeholder
   - Filters discs where `manufacturer` contains text (case-insensitive)

2. **Bag Dropdown**
   - Dropdown: "Any bag" (default) | Bag 1 | Bag 2 | Bag 3 | Not in any bag
   - Filters discs by bag membership

3. **Condition Dropdown**
   - Dropdown: "Any condition" (default) | Mint | Good | Used | Beat-in
   - Filters discs by `condition` field

4. **Weight Range**
   - Two number inputs: Min (placeholder "150") | Max (placeholder "180")
   - Filters discs where `weight >= min && weight <= max`
   - Unit label: "g" after inputs

5. **Clear Filters Button**
   - Button: "Clear all filters"
   - Resets search, type chips, brand text, bag, condition, weight, tag filter to defaults

**Popover Behavior:**
- Click outside popover → closes popover (Alpine `@click.outside`)
- Popover persists while user edits filters (doesn't close on filter change)
- Filters apply immediately (reactive)

**Key CSS Classes:**
- `.advanced-popover` — popover container
- `.advanced-popover-row` — each filter input row (label + input)
- `.advanced-popover-label` — filter label (e.g., "Brand")
- `.advanced-popover-input` — text input / dropdown

**Alpine.js State:**
- `showAdvancedPopover: false` — toggle visibility
- `filterBrand: ''` — brand text filter
- `filterBag: ''` — bag filter (bag ID or 'none')
- `filterCondition: ''` — condition filter
- `filterWeightMin: null` — weight min
- `filterWeightMax: null` — weight max

**UX Notes:**
- Popover keeps toolbar clean (advanced filters are secondary workflow)
- Filters stack with search, type chips, and tag filter (all AND logic)
- "Clear all filters" resets entire UI to defaults (escape hatch for confused users)

---

### 5.6 Disc Count

Right-aligned text showing filtered count vs. total.

**Format:**
- If no filters active: "42 discs"
- If filters active: "8 of 42 discs" (8 visible, 42 total)

**Styling:**
- Muted color (`var(--clr-muted)`)
- 0.85rem font size

**Alpine.js State:**
- `discCount` (computed): returns formatted string

**UX Notes:**
- Always visible (unlike Moxfield which hides count)
- "8 of 42" gives immediate feedback on filter effectiveness

---

## 6. Empty States

Context-aware empty states based on active filters.

### 6.1 No Discs in Collection (Baseline)

**Condition:** `discs.length === 0`

**Display:**
```
🥏

No discs yet

Click + Add Disc to start building your bag!
```

- Centered vertically and horizontally
- Large emoji icon (3rem font size)
- H2 heading (1.5rem)
- Body text (1rem, muted)

**Key CSS Classes:**
- `.empty-state` (existing)
- `.empty-icon` (existing)

**This is the current behavior — preserve it.**

---

### 6.2 No Results from Type Filter

**Condition:** `filterType !== '' && filteredSorted.length === 0`

**Display:**
```
🔍

No [Type] discs in your collection

[+ Add one]  or  [Clear filter]
```

- Example: "No Midrange discs in your collection"
- Type label uses `TYPE_LABELS` map (e.g., "Putter", "Distance Driver")
- Two buttons:
  - `+ Add one` → opens Add Disc modal with type pre-filled
  - `Clear filter` → clears `filterType` to show all discs

**Key CSS Classes:**
- Same `.empty-state` structure

**Alpine.js Logic:**
- Check `filterType` in empty state rendering
- Pre-fill disc form: `openAddModal()` sets `formType = filterType` if called from empty state

**UX Notes:**
- Actionable — user can immediately add the missing type
- "Clear filter" is escape hatch

---

### 6.3 No Results from Search

**Condition:** `search !== '' && filteredSorted.length === 0`

**Display:**
```
🔍

No discs matching "[query]"

[Clear search]
```

- Example: "No discs matching "firebird""
- Query text in quotes, truncated to 30 chars
- One button: `Clear search` → clears `search` input

**Alpine.js Logic:**
- Check `search` in empty state rendering

**UX Notes:**
- Common scenario (typos, exact matches)
- One-click recovery

---

### 6.4 No Results from Tag Filter

**Condition:** `activeTagFilter !== '' && filteredSorted.length === 0`

**Display:**
```
🏷

No discs tagged "[tag]"

[Clear tag filter]
```

- Example: "No discs tagged "favorite""
- One button: `Clear tag filter` → clears `activeTagFilter`

**Alpine.js Logic:**
- Check `activeTagFilter` in empty state rendering

**UX Notes:**
- Can happen if user removes all tags from discs after filtering
- One-click recovery

---

### 6.5 No Results from Combined Filters

**Condition:** `(filterType || search || activeTagFilter || filterBrand || filterBag || filterCondition || filterWeightMin || filterWeightMax) && filteredSorted.length === 0`

**Display:**
```
🔍

No discs match your filters

[Clear all filters]
```

- Generic message when multiple filters are active
- One button: `Clear all filters` → calls function that resets all filter state

**Alpine.js Logic:**
- `clearAllFilters()` function resets: `search`, `filterType`, `activeTagFilter`, `filterBrand`, `filterBag`, `filterCondition`, `filterWeightMin`, `filterWeightMax`

**UX Notes:**
- Catch-all for complex filter combos
- "Clear all filters" is nuclear option but necessary

---

## 7. Alpine.js State Summary

New state variables needed for this spec:

```javascript
// View & Layout
viewMode: 'grid',           // 'grid' | 'list' | 'compact'
groupBy: 'none',            // 'none' | 'type' | 'brand' | 'bag'
groupExpanded: {},          // Object: { 'putter': true, 'midrange': false, ... }

// Sorting
sortBy: 'name-asc',         // 'name-asc' | 'speed-desc' | etc. (combined field + direction)
activeSortColumn: 'name',   // For List view column header highlighting

// Filtering (existing + new)
search: '',                 // Existing
filterType: '',             // Existing
activeTagFilter: '',        // New — active tag filter
filterBrand: '',            // New — brand text search (Advanced)
filterBag: '',              // New — bag filter (Advanced)
filterCondition: '',        // New — condition filter (Advanced)
filterWeightMin: null,      // New — weight min (Advanced)
filterWeightMax: null,      // New — weight max (Advanced)

// UI State
showAdvancedPopover: false, // Advanced popover visibility

// Disc Model Extension
// Add to each disc object:
discs: [
  {
    // ... existing fields ...
    tags: [],               // New — array of tag strings
  }
]
```

---

## 8. Implementation Notes for Rusty

### 8.1 Phased Rollout

Suggest implementing in this order to minimize risk:

1. **Phase 1: View Modes**
   - Add List View + Compact View
   - Add view toggle buttons to toolbar
   - Preserve existing Grid view as default

2. **Phase 2: Sorting**
   - Expand sort dropdown to 18 options
   - Add column header sorting in List View

3. **Phase 3: Grouping**
   - Implement "Group by: Type" (most common use case)
   - Add collapsible section headers
   - Then add Brand and Bag grouping

4. **Phase 4: Tags**
   - Add `tags` array to disc model + DB schema
   - Add tag input to disc edit modal (with autocomplete)
   - Display tags in Grid/List/Compact views
   - Add tag filtering

5. **Phase 5: Advanced Toolbar**
   - Move type filter to chips (bottom row of toolbar)
   - Add Advanced popover with 5 additional filters
   - Update empty states

### 8.2 CSS Variable Strategy

Use CSS custom properties for responsive thresholds:

```css
:root {
  --breakpoint-mobile: 480px;
  --breakpoint-tablet: 768px;
  --list-col-color: 32px;
  --list-col-type: 80px;
  --list-col-flight: 140px;
  --list-col-weight: 60px;
  --list-col-condition: 80px;
  --list-col-bags: 60px;
  --list-col-actions: 100px;
}
```

### 8.3 Alpine.js Computed Properties

Key computed properties to add/update:

- `filteredSorted` — combines all filters + sorting + grouping logic
- `groupedDiscs` — transforms flat `filteredSorted` array into grouped sections (only when `groupBy !== 'none'`)
- `discCount` — formatted count string ("8 of 42 discs")
- `tagSuggestions` — unique tags across all discs, sorted by frequency

### 8.4 Accessibility

- All icon buttons need `aria-label` (e.g., `aria-label="Switch to Grid view"`)
- Column headers need `aria-sort="ascending"` | `"descending"` | `"none"`
- Collapsible group sections need `aria-expanded="true|false"`
- Filter chips need `role="button"` and `aria-pressed="true|false"`
- Advanced popover needs `role="dialog"` and focus trap

### 8.5 Performance Watch-Outs

- **Grouping**: Don't re-group on every reactive update — memoize `groupedDiscs` or use Alpine `$watch` to rebuild only when `groupBy` or `discs` changes
- **Tag autocomplete**: Debounce input to avoid re-computing suggestions on every keystroke
- **List View**: If collection grows to 200+ discs, consider virtual scrolling (future enhancement)

### 8.6 Color Consistency

All new components must use existing OKLCH variables:
- Type badges: `var(--putter)`, `var(--midrange)`, `var(--fairway)`, `var(--distance)` (already defined, L=0.75, C=0.18)
- Tag chips: deterministic hash → one of 8 colors (see Section 4.2 for hash function)
- Condition dots: existing `.cond-new`, `.cond-good`, `.cond-used`, `.cond-beat` classes (preserve)
- No new color variables needed — reuse existing palette

---

## 9. Edge Cases & UX Watch-Outs

### 9.1 Empty Groups When Filtering

**Scenario:** User groups by Type, then filters by "favorite" tag. Result: only 2 Putters have "favorite" tag.

**Behavior:**
- Show only "Putter (2)" section
- Hide empty sections (Midrange, Fairway, Distance)
- Don't show "0 discs" sections — visual noise

### 9.2 Sorting Within Groups

**Scenario:** User groups by Type, then sorts by Weight (High→Low).

**Behavior:**
- Each group is sorted independently
- Putter section: sorted by weight (high→low)
- Midrange section: sorted by weight (high→low)
- Group order stays fixed (Putter → Midrange → Fairway → Distance)

**Implementation:**
- `groupedDiscs` computed property: sort each group's discs array after grouping

### 9.3 Multi-Bag Discs in Bag Grouping

**Scenario:** Disc "Destroyer" is in both Bag 1 and Bag 2. User groups by Bag.

**Behavior:**
- Destroyer appears in Bag 1 section (full card/row)
- Destroyer appears in Bag 2 section (full card/row + "Also in Bag 1" chip)
- This is intentional duplication for context

**Implementation:**
- Don't deduplicate discs when `groupBy === 'bag'`
- Add `.multi-bag-indicator` chip to discs that appear in multiple bags (except the first occurrence)

### 9.4 Tag Filter + Type Filter Interaction

**Scenario:** User clicks "favorite" tag chip, then clicks "Putter" type chip.

**Behavior:**
- Both filters are active (AND logic)
- Show only discs that are Putters AND have "favorite" tag
- Toolbar shows: `Type: [Putter]  Tag: [favorite ×]`

**Implementation:**
- `filteredSorted` applies all filters sequentially

### 9.5 Changing View Mode Preserves Filters

**Scenario:** User filters to "Midrange" in Grid view, then switches to List view.

**Behavior:**
- Filter persists — List view shows only Midrange discs
- All filters (search, type, tag, advanced) persist across view mode changes

**Implementation:**
- `viewMode` is independent of filter state — no reset on view change

### 9.6 Collapsing All Groups

**Scenario:** User groups by Type and collapses all 4 sections.

**Behavior:**
- All section content is hidden
- Section headers still visible (with collapse icon ▶)
- No empty state shown (discs exist, just hidden)

**Implementation:**
- Don't show empty state if `groupBy !== 'none'` — collapsed groups don't count as "no results"

### 9.7 Mobile Toolbar Wrapping

**Scenario:** User on 480px screen opens toolbar.

**Behavior:**
- Main toolbar wraps to 2 rows (see Section 5.1 Responsive Behavior)
- Filter chips row stays intact (chips wrap to multiple rows if needed)
- Advanced popover anchors to button, may overflow screen → add max-width and scroll

**Implementation:**
- Test on iPhone SE (375px width) and iPad Mini (768px width)

### 9.8 Weight Range Filter with Non-Numeric Weights

**Scenario:** Disc has empty `weight` field. User sets weight filter to 170-180g.

**Behavior:**
- Disc with empty weight is excluded from results
- Weight filter ignores `null` / empty weights

**Implementation:**
- Filter logic: `d.weight >= min && d.weight <= max` (empty weights fail condition)

---

## 10. Visual Hierarchy Summary

**Grid View:**
- Photo → Flight numbers → Name → Metadata (weight/plastic/color) → Tags → Actions
- Visual hierarchy is top-down (photo dominates)

**List View:**
- Name/Brand → Flight numbers → Type badge → Metadata → Actions
- Visual hierarchy is left-to-right (name is leftmost, most important)

**Compact View:**
- Type badge → Name → Flight numbers → Tags
- Visual hierarchy is horizontal-linear (all elements equal weight)

**Across All Views:**
- Flight numbers are always prominent (colored pills, consistent styling)
- Type badges use perceptually uniform colors (OKLCH L=0.75, C=0.18)
- Actions are secondary (muted buttons, right-aligned or hover-revealed)

---

## 11. Success Metrics (Post-Launch)

Once implemented, measure:
- **View mode adoption**: % of sessions using List vs. Grid vs. Compact
- **Grouping usage**: % of sessions where `groupBy !== 'none'`
- **Tag adoption**: % of discs with at least 1 tag after 2 weeks
- **Advanced filter usage**: % of sessions that open Advanced popover

Target:
- 40% of users try List view within 1 week (indicates discoverability)
- 20% of users create at least 3 tags within 2 weeks (indicates usefulness)
- Group by Type used in 50%+ of sessions with 15+ discs (indicates utility for large collections)

---

## Appendix A: Keyboard Shortcuts (Future Enhancement)

Not in v1 scope, but document for future consideration:

- `G` → switch to Grid view
- `L` → switch to List view
- `C` → switch to Compact view
- `/` → focus search input
- `Esc` → clear all filters
- `1-4` → toggle type filter (1=Putter, 2=Midrange, 3=Fairway, 4=Distance)

---

## Appendix B: Moxfield UI Elements Not Adopted

Elements from the Moxfield screenshot that we're NOT implementing (and why):

1. **Visual Stacks / Visual Spoiler views** — Not applicable to disc inventory (discs don't "stack" like duplicate MTG cards)
2. **Collection toggle** — We have a single user, no need for "Disable Collection"
3. **Advanced button** — We adopted this, but with different filters (no "Edition" or "Rarity" for discs)

---

**End of Spec**

This spec is complete and ready for Rusty to implement. All design decisions are documented. Color values, spacing, and layout specifics are defined. Alpine.js state structure is provided. Edge cases are addressed.

Questions? Ping Livingston or Rusty in the team channel.
