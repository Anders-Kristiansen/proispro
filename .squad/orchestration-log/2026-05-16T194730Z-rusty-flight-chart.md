# Orchestration Log — rusty-flight-chart

**Agent:** Rusty (Frontend)  
**Role:** Frontend Dev  
**Timestamp:** 2026-05-16T19:47:30Z  
**Task:** Build bag flight chart scatter plot (FR-4)  

## Summary

Implemented bag flight chart as pure SVG scatter plot (zero external library). X-axis: Turn (-6 to +2), Y-axis: Speed (1-15 inverted), Colors: OKLCH disc type badges (putter/mid/fairway/driver). Collapsible panel in bag detail view. PR #61.

## Architecture Decision

**Why SVG over a chart library:**
- Zero bundle size increase (no Chart.js, D3, etc.)
- Loads instantly (no additional HTTP request)
- Full control over styling (matches OKLCH color system)
- Simple use case (20+ dots) doesn't justify library overhead

**Why speed vs turn:**
- Turn determines flight path shape (understable vs overstable)
- Speed determines throw difficulty/distance
- Together show bag coverage at a glance

**Why per-bag (not global):**
- Users organize discs by bag for specific courses
- Bag-level view shows what they'll actually throw in a round

## Implementation

- **X-axis:** Turn (-6 to +2)
- **Y-axis:** Speed (1-15, inverted so distance drivers at top)
- **Color:** OKLCH colors per disc type
- **Labels:** Disc names (truncated to 7 chars if needed)
- **Tooltip:** Full flight numbers on hover (SVG `<title>`)
- **Toggle:** Collapsible via Alpine `x-show`

## Code Changes

- `app.js`: 4 new methods (getFlightChartData, flightChartX, flightChartY, flightChartColor) + showFlightChart state
- `index.html`: Chart template after bag discs list (~60 lines)
- `styles.css`: Chart container + responsive styles (~95 lines)

## PR Status

PR #61 (draft) — Flight chart visualization.

## Trade-offs

**Pros:** Zero dependencies, instant load, matches design system, responsive + mobile-friendly

**Cons:** No zoom/pan (acceptable for <20 discs), no animations, manual coordinate mapping

## Future Considerations

- Zoom/pan if bags grow to 50+ discs
- Second chart for glide/fade or toggle mode
- Overlay all bags with different colors (course prep UX)
