# Danny — History

## Core Context

- **Project:** A lightweight personal disc golf inventory page hosted on GitHub Pages, using a separate GitHub repo as a simple JSON file backend.
- **Role:** Lead
- **Joined:** 2026-04-13T17:32:22.552Z

## Learnings

### Static-first architecture validates for single-user tools

The proispro disc golf inventory deliberately ships vanilla HTML/CSS/JS with zero build pipeline. This choice surfaces a key principle: **shipping simplicity beats framework cargo-cult**. The app weighs <50KB total and has zero external dependencies beyond browser APIs. Every build tool adds complexity without corresponding benefit at this scale.

The localStorage-first strategy (with GitHub file as backup) is the right tier for personal tools where offline-first matters more than real-time sync. The lack of multi-user conflict resolution is not a limitation—it's a feature boundary that keeps the implementation honest.

### GitHub file storage as backend is boring but right

Asking users to configure their own GitHub repo + PAT feels like friction, but it solves the core problem: data ownership without central infrastructure. The REST API implementation handles SHA tracking and 409 conflict retries, making GitHub's content API reliable enough for this use case. The trade-off (user manages their own repo) is explicit and defensible.

### PAT in localStorage is acceptable with scope boundaries

Storing a GitHub token client-side gets immediate scrutiny from security reviewers. The mitigations here are concrete: narrow scope (repo only), user-controlled expiration, and immediate revocation capability. For a single-user personal tool, the threat model is tighter than multi-tenant SaaS. This is not a universal pattern, but it's right for this context.

### Vanilla JS scales to about 500 lines before pain

app.js is ~250 lines of business logic + UI state. At this volume, manual DOM updates and event handling are maintainable. The escape valve: if the app grew to 1000+ lines of state management, that's the inflection point to introduce a minimal framework (preact, htmx, or Alpine). Don't cross that bridge until traffic demands it.

### Single-tenant UX simplifies everything downstream

No multi-user auth, no permissions model, no data isolation. The app assumes "one person, one device (or multiple tabs on same device)." This single-tenant assumption collapses the entire feature set. A multi-user version would need account model, role-based access, conflict resolution per user, and probably a real backend. The architecture is not "scalable to multiple users"—it's "deliberately constrained to one user." That constraint is a feature, not a limitation.

---

## Migration to CosmosDB + DAB (2026-04)

### Architecture pivot from GitHub Pages to Azure SWA + managed backend

The project migrated from pure-static (GitHub Pages + localStorage) to **Azure Static Web Apps + CosmosDB + Data API Builder**. This was a conscious trade-off:

**Before:** Truly static (no backend). GitHub Pages host. User's GitHub repo as data store. localStorage as client cache.
**After:** Serverless backend (DAB layer). SWA hosts frontend + DAB API. CosmosDB as source of truth. localStorage as fallback only.

### Why the migration made sense

1. **Data durability:** GitHub file sync is async/eventual. CosmosDB is immediate + durable. Eliminated "clear localStorage and lose data" risk.
2. **Multi-device:** CosmosDB is shareable (though auth still single-user). Easier path to multi-device support later.
3. **Operational simplicity:** No longer maintaining GitHub REST API retry logic, SHA tracking, 409 conflict handling. DAB abstracts that.
4. **Azure ecosystem alignment:** SWA + CosmosDB are free tier, tightly integrated. Single deployment target (vs. GitHub Pages + user's repo).

### The trade-off: We lost simplicity

- **Before:** Fork + enable Pages + done. No backend to manage.
- **After:** Azure account, resource group, CosmosDB provisioning, DAB config, SWA deployment. Higher operational bar.

But we gained:
- **Reliability:** Real database backend (not files).
- **Scalability path:** Ready for multi-user if we add auth.
- **Data consistency:** No more sync races between localStorage → GitHub.

### Migration to CosmosDB + DAB (2026-04)

### Architecture pivot from GitHub Pages to Azure SWA + managed backend

The project migrated from pure-static (GitHub Pages + localStorage) to **Azure Static Web Apps + CosmosDB + Data API Builder**. This was a conscious trade-off:

**Before:** Truly static (no backend). GitHub Pages host. User's GitHub repo as data store. localStorage as client cache.
**After:** Serverless backend (DAB layer). SWA hosts frontend + DAB API. CosmosDB as source of truth. localStorage as fallback only.

### Why the migration made sense

1. **Data durability:** GitHub file sync is async/eventual. CosmosDB is immediate + durable. Eliminated "clear localStorage and lose data" risk.
2. **Multi-device:** CosmosDB is shareable (though auth still single-user). Easier path to multi-device support later.
3. **Operational simplicity:** No longer maintaining GitHub REST API retry logic, SHA tracking, 409 conflict handling. DAB abstracts that.
4. **Azure ecosystem alignment:** SWA + CosmosDB are free tier, tightly integrated. Single deployment target (vs. GitHub Pages + user's repo).

### The trade-off: We lost simplicity

- **Before:** Fork + enable Pages + done. No backend to manage.
- **After:** Azure account, resource group, CosmosDB provisioning, DAB config, SWA deployment. Higher operational bar.

But we gained:
- **Reliability:** Real database backend (not files).
- **Scalability path:** Ready for multi-user if we add auth.
- **Data consistency:** No more sync races between localStorage → GitHub.

### Remaining complexity: GitHub sync as optional backup

GitHub sync logic was a workaround. As of 2026-04-15, Rusty removed all GitHub sync code from frontend. No longer supported. This simplifies the codebase (~250 lines eliminated) and clarifies that **CosmosDB/DAB is the sole authoritative backend**.

### Known gaps that warrant roadmap items

1. **Offline mutations:** If DAB is down, user edits are queued but lost on reload. IndexedDB pending queue needed.
2. **GitHub sync reliability:** (Deprecated — no longer relevant after removal)
3. **Multi-user variant:** DAB auth is now `authenticated` role via GitHub OAuth. SWA auth rules hardened by Basher (2026-04-15). Production-ready for single-user; path clear for multi-user if needed.

The migration validated the original single-tenant design—the codebase is now cleaner and more maintainable after removing the GitHub sync layer.

---

## 2026-04-15 Session: DAB CosmosDB Bugs Fixed (commit 65da48f)

Diagnosed and fixed 4 critical DAB CosmosDB NoSQL bugs that caused 500 errors on all GraphQL requests:

1. **Entity source format:** Schema used bare string `source: "discs"` instead of object `source: { type: "collection", name: "discs" }`
2. **GraphQL type pluralization:** DAB auto-generated plurals but schema enforced singular; misalignment on Disc/Discs types
3. **ID field non-null:** Changed `id: ID` → `id: ID!` to match CosmosDB item guarantee
4. **Partition key in mutations:** Added `_partitionKeyValue` as required parameter in updateDisc and deleteDisc mutations

**Impact:** All REST and GraphQL endpoints now functional. Mutations properly route to correct CosmosDB partition. App.js confirmed using correct `/data-api/rest/Disc` path (not `/api/Disc`).

Key learning: DAB partition key handling is non-obvious—mutations require explicit partition value in payload. This is DAB-specific and not documented in early tutorials. Captured in decisions.md for future reference.
