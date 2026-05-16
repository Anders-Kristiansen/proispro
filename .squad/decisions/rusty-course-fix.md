# Decision: Course Holes Parsing + UI

**Date:** 2026-05-17  
**Author:** Rusty  
**Context:** Issues #56 (FR-3a: Fix OSM course fetching) + #53 (FR-3a: Course holes UI)

## Problem

The courses feature wasn't working properly:
- `downloadCourseMap()` fetched OSM disc_golf elements but only stored raw counts
- No structured hole data was extracted from `disc_golf=hole` nodes  
- Users couldn't see which holes existed or navigate to a specific hole

## Decision

**Implemented structured hole parsing + expandable UI in courses tab:**

1. **Parsing logic:**
   - Added `parseHolesFromElements()` to extract `disc_golf=hole` nodes from OSM data
   - Uses OSM `ref` tag as hole number (fallback to index+1 if missing)
   - Natural sort by hole number handles numeric refs correctly ("1"→"2"→"18", not "1"→"10"→"2")
   - Stores parsed `holes` array in `cached.mapData.holes` (localStorage)
   - Sets `manualFallback: true` flag when no holes found from OSM

2. **UI pattern:**
   - Each course pin card shows an expandable hole list section (only when map downloaded)
   - Toggle button shows ▶/▼ arrow + hole count ("▼ 18 holes")
   - Clicking hole item opens Google Maps at that hole's coordinates
   - Graceful fallback when no holes: "No hole data from OSM (X tees/baskets found)"

3. **State management:**
   - Added `expandedHoleLists` object to Alpine state (tracks per-pin expansion)
   - `getHolesForPin(pin)` helper retrieves holes array from cache
   - `toggleHoleList(pinId)` toggles expansion state
   - `openHoleInMaps(hole)` opens Google Maps for a hole

4. **Alpine.js patterns:**
   - `x-collapse` for smooth expand/collapse animation
   - `x-if` templates for conditional rendering (holes vs empty state)
   - `x-for` to iterate over holes
   - Reactive state tracking with object property binding

## Rationale

- **Holes in localStorage (not Supabase yet):** FR-3b (#57) is Basher's domain — migration to add JSONB `holes` column on `course_pins`. Keeping holes in `_courseCache` avoids blocking this frontend work on backend schema changes.
- **Natural sort:** Hole numbers are strings in OSM (could be "1", "1A", "18A"). Numeric parsing + fallback to localeCompare handles all cases.
- **Clickable hole items:** Primary use case is navigating to a specific hole on the course. Google Maps link is the fastest path.
- **Collapsible list:** Courses with 18+ holes would clutter the UI. Expandable by default, but hidden to keep cards compact.

## Alternatives Considered

1. **Store holes in Supabase immediately:** Rejected — requires Basher's migration (#57) first. localStorage-first approach unblocks frontend work.
2. **Always show hole list (no collapse):** Rejected — 18-hole courses would push down other pins. Collapsible keeps UI clean.
3. **Inline hole numbers (no list):** Rejected — doesn't support navigation to specific holes.

## Impact

- **Frontend:** 3 files changed (+155 lines total)
- **Backend:** None (holes stay in localStorage for now)
- **UX:** Users can now see structured hole data and navigate to specific holes
- **Follow-up:** After #57 (Basher's migration), add logic to sync localStorage holes to Supabase on next pin save

## Related

- **Issues:** #56 (fetch+parse), #53 (holes UI)  
- **PR:** #59 (draft)  
- **Dependencies:** Blocks #55 (hole assignment logic — needs structured holes to exist)
