## Flight Guide Data Source

**By:** AK (via Copilot)  
**Date:** 2026-04-16  
**Scope:** Flight Guide feature data source selection

### Decision

Use **DiscIt API** (discit-api.fly.dev/disc) as the primary disc catalog data source.

### What

- DiscIt API serves as the authoritative source for disc flight data (speed/glide/turn/fade)
- Data mirrors Marshall Street's flight guide structure and is free/open access
- Implement 24h localStorage caching to minimize API calls
- Parse legacy flight strings (e.g., "12 / 5 / -1 / 3") into discrete integer columns

### Why

**DiscIt was chosen because:**

1. **Only source with flight numbers at scale** — No other public API provides flight characteristics (speed/glide/turn/fade) for thousands of discs
2. **Free and open** — No licensing restrictions or authentication barriers
3. **Reliable** — Stable API serving the disc golf community, mirroring Marshall Street data
4. **Proven schema** — Flight number format (4 integers) is industry standard

**Alternative sources considered:**
- PDGA CSV list — Has disc approvals but no flight numbers
- Marshall Street direct API — No public access
- Manual data entry — Impractical for 1000+ disc inventory

### Implications

- Flight Guide depends on DiscIt API availability (documented as external dependency)
- Caching layer (24h localStorage) provides graceful degradation if API becomes temporarily unavailable
- Parser must handle edge cases in flight string formatting
