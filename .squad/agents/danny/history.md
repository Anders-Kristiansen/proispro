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

---

## 2026-04-16 Session: DAB Source Format Fix (commit e1aefc1)

Root-caused persistent 500 errors on `/data-api/graphql` that survived multiple config attempts.

**The bug:** DAB 1.3.19's `EntitySourceType` enum only accepts `table`, `view`, `stored-procedure`. The value `collection` (which our skill file recommended for CosmosDB NoSQL) is not a valid enum member and causes deserialization failure at startup. The bare string format `"source": "discs"` also failed (unclear if same root cause or version-dependent).

**The fix:** Use `"source": { "object": "discs" }` — object format with container name but NO `"type"` field. DAB infers the correct source type from the `database-type: cosmosdb_nosql` setting.

**Verified locally:** DAB 1.3.19 starts cleanly, schema compiles, introspection returns all expected types (Disc, CreateDiscInput, UpdateDiscInput, mutations). Auth correctly enforces `authenticated` role.

**Key learnings:**
1. **DAB source format for CosmosDB NoSQL:** Use `{ "object": "<container>" }` only. Never `"type": "collection"` — it's not a valid EntitySourceType.
2. **The skill file `cosmosdb-best-practices/SKILL.md` has a bug** in the DAB Config Checklist — it recommends `"type": "collection"` which doesn't work. Needs correction.
3. **Always test DAB config changes locally** with `swa start . --data-api-location swa-db-connections` before pushing. The error messages in local output are clear; production just returns opaque 500.
4. **GraphQL queries in app.js are correct** — field names match schema, mutations include `_partitionKeyValue`, all operation shapes align with skill guidance.
5. **ALL OF THE ABOVE IS NOW IRRELEVANT** — DAB was retired November 2025. We debugged a deprecated feature.

---

## 2026-04-16 Session: DAB Retirement Discovery & Supabase Migration

### DAB is DEAD — We debugged a deprecated feature for days

**Context:** Azure Static Web Apps Database Connections (DAB) was retired November 30, 2025. We are in April 2026 — the feature is completely gone from the Azure platform. This explains why `/data-api/graphql` returns instant 500s in production despite multiple schema fixes.

**Time wasted:** Multiple debugging sessions (2026-04-15, 2026-04-16) trying to fix DAB config for a service that no longer exists. Schema format corrections, partition key handling, GraphQL type alignment — all futile because the runtime is gone.

**Root cause of production 500s:** Not our config. DAB runtime no longer deploys with SWA. Our `swa-db-connections/` directory is completely ignored by the platform.

### Initial Solution (Rejected): Managed Azure Functions

First proposed replacing DAB with SWA Managed Functions + CosmosDB SDK. Seemed like simplest Azure-native path: zero separate infrastructure, same auth model, REST instead of GraphQL.

**User rejected this approach entirely:** "We will not use functions! If we can stay on simple GH Pages I can live with that with a modern backend. Can't we just use Postgres database?"

**The real problem:** Azure complexity itself. SWA, DAB, Functions, CosmosDB — layers upon layers for a simple disc golf inventory app. User wants boring, simple infrastructure.

### Final Architecture Decision: Supabase PostgreSQL + GitHub Pages

**Complete pivot away from Azure.** Return to GitHub Pages for hosting (static, simple, free), use Supabase as modern PostgreSQL backend with built-in auth and client-side SDK.

**Why this beats Azure approach:**
1. **Zero server-side code** — Supabase JS client calls PostgreSQL directly via REST API. No Functions to write/maintain.
2. **Standard PostgreSQL** — Real SQL database, not proprietary NoSQL. Every developer knows it.
3. **Built-in GitHub OAuth** — Supabase has native GitHub provider. No custom auth code.
4. **Row-Level Security (RLS)** — PostgreSQL policies enforce "users see only their own discs" at database level. Client-side auth is safe because RLS validates every query.
5. **GitHub Pages simplicity** — Push to main = deployed. No Azure Portal, no SWA CLI, no deploy workflows.
6. **Free tier is permanent** — 500MB database (50K+ discs), unlimited requests. We'll never outgrow it.
7. **Open source + self-hostable** — If Supabase ever fails, we can self-host (can't do that with CosmosDB).

**What we lose:**
- Azure ecosystem (user explicitly wants to leave)
- CosmosDB global distribution (irrelevant for single-user Swedish app)
- GraphQL (switching to Supabase client, simpler anyway)

**What we gain:**
- Simplicity (the user's #1 request)
- Portability (PostgreSQL dump works anywhere)
- Debuggability (Supabase dashboard shows real-time queries, not opaque 500s)
- Cost (free vs. SWA $9/month + CosmosDB RU limits)

### Key Technical Decisions

1. **Database schema:** Single `discs` table in PostgreSQL with columns matching current frontend schema. Field name mapping: `type` → `disc_type`, `added` → `added_at` (timestamptz).

2. **Auth model:** Supabase GitHub OAuth + Row-Level Security policies. RLS ensures `WHERE auth.uid() = user_id` on every query. Even if attacker steals public API key, they can only access their own data (RLS enforced at PostgreSQL level).

3. **Frontend changes:** Replace GraphQL `gqlFetch()` calls with Supabase client (`@supabase/supabase-js` via CDN). ~60 lines changed in `app.js`. No build step needed — still vanilla JS.

4. **File structure:**
   - Delete: `swa-db-connections/` (dead DAB config), `staticwebapp.config.json` (SWA routing)
   - Update: `index.html` (add Supabase CDN script), `app.js` (replace GraphQL with Supabase client)
   - Unchanged: `styles.css`, color system, all UI code, localStorage fallback

5. **Data migration:** Export CosmosDB JSON, transform field names, import to Supabase via SQL or Table Editor. Small dataset (<100 discs realistically), manageable.

6. **Hosting migration:** Enable GitHub Pages in repo settings. Update DNS A records for `proispro.com` to GitHub Pages IPs. Delete Azure resources (SWA, CosmosDB) to stop costs.

### Learnings: When to Reject "Simpler" Cloud-Native Solutions

**Azure Functions seemed simpler at first** — built into SWA, same deployment model, familiar patterns. But the user saw through the complexity:
- Still requires Azure Portal management
- Still ties us to SWA (which caused this mess)
- Still requires server-side code (even if ~100 lines)
- Doesn't address the root frustration: Azure complexity

**Supabase is actually simpler:**
- No server-side code at all (database handles security via RLS)
- No Azure Portal (Supabase dashboard is cleaner)
- No deploy pipelines (GitHub Pages auto-deploys on push)
- Standard PostgreSQL (portable, well-understood)

**Key learning:** "Cloud-native" doesn't always mean simpler. Sometimes the boring choice (static hosting + managed PostgreSQL) beats the platform-specific solution (SWA + Functions + CosmosDB).

**Red flags we should have caught earlier:**
1. Instant 500s with no delay = runtime not starting (DAB not loading)
2. Zero DAB logs in SWA diagnostics = feature not present
3. Microsoft docs redirect to "overview" pages = deprecation notice hiding in plain sight

**Correct diagnosis order for cloud service failures:**
1. Check service health dashboard
2. **Check deprecation announcements** (we skipped this)
3. THEN debug config

**User feedback is architecture guidance.** When user says "we will not use functions," that's not a technical constraint — it's a clarity check. The complexity we're adding (Functions layer) doesn't match the problem complexity (CRUD on ~100 disc records).

**Single-user scale = architectural simplification opportunity.** Multi-tenant apps need isolation, permissions layers, audit trails. Single-user apps can use RLS policies and trust the database to enforce security. No application-layer auth logic needed.

**Supabase client-side model works because of RLS.** Without Row-Level Security, putting DB credentials in browser would be catastrophic. RLS turns the database itself into a secure API — PostgreSQL validates JWTs and enforces `user_id` policies on every query. This is the innovation that makes "no backend" viable.

**PostgreSQL over NoSQL for this use case.** Disc inventory is relational data (discs have manufacturers, types, conditions — all queryable dimensions). CosmosDB partition key `/id` was a workaround. PostgreSQL `WHERE` clauses are the natural fit. We should have started here.

### Frontend Modernization: Alpine.js

**Additional decision:** Modernize frontend from vanilla JS DOM manipulation to Alpine.js reactive framework (via CDN, no build step).

**Why Alpine.js wins:**
1. **Zero build step** — CDN script tag, works immediately with GitHub Pages
2. **Modern reactive patterns** — `x-data`, `x-model`, `x-show`, `x-for` (like Vue/React declarative style)
3. **Tiny** — 15kb gzipped (vs. Vue ~33kb, React ~130kb)
4. **Learn in an afternoon** — Single developer can pick it up quickly
5. **Code reduction** — ~450 lines of manual DOM manipulation → ~250 lines of reactive components
6. **Perfect for "sprinkle interactivity"** — Exactly our use case (single-page app with modals, filters, CRUD)

**Why not build-step frameworks (Svelte, React, etc.):**
- User wants SIMPLE — no Node.js, npm, Vite, build configs, deploy pipelines
- At 450 lines of code, the DX benefits don't justify operational overhead
- If app grows to 2000+ lines with complex state/routing, THEN consider SvelteKit
- But at current scale, Alpine.js is the sweet spot

**Frontend stack after migration:**
- Framework: Alpine.js (CDN)
- Data layer: Supabase client (CDN)
- Styling: Vanilla CSS + OKLCH colors
- Total dependencies: 2 CDN scripts (~65kb combined, gzipped)
- Total custom JS: ~250 lines (down from ~450)

**Key pattern shift:**
- Before: Manual `renderDiscCard()`, `document.getElementById()`, `addEventListener()`, imperative DOM updates
- After: Declarative `<template x-for>`, `x-model` two-way binding, `@click` directives, reactive state updates

**Integration with Supabase:** Seamless. Alpine methods call Supabase client, update reactive state, UI auto-updates. No friction.

### Frontend Modernization: Alpine.js

**Additional decision:** Modernize frontend from vanilla JS DOM manipulation to Alpine.js reactive framework (via CDN, no build step).

**Why Alpine.js wins:**
1. **Zero build step** — CDN script tag, works immediately with GitHub Pages
2. **Modern reactive patterns** — `x-data`, `x-model`, `x-show`, `x-for` (like Vue/React declarative style)
3. **Tiny** — 15kb gzipped (vs. Vue ~33kb, React ~130kb)
4. **Learn in an afternoon** — Single developer can pick it up quickly
5. **Code reduction** — ~450 lines of manual DOM manipulation → ~250 lines of reactive components
6. **Perfect for "sprinkle interactivity"** — Exactly our use case (single-page app with modals, filters, CRUD)

**Why not build-step frameworks (Svelte, React, etc.):**
- User wants SIMPLE — no Node.js, npm, Vite, build configs, deploy pipelines
- At 450 lines of code, the DX benefits don't justify operational overhead
- If app grows to 2000+ lines with complex state/routing, THEN consider SvelteKit
- But at current scale, Alpine.js is the sweet spot

**Frontend stack after migration:**
- Framework: Alpine.js (CDN)
- Data layer: Supabase client (CDN)
- Styling: Vanilla CSS + OKLCH colors
- Total dependencies: 2 CDN scripts (~65kb combined, gzipped)
- Total custom JS: ~250 lines (down from ~450)

**Key pattern shift:**
- Before: Manual `renderDiscCard()`, `document.getElementById()`, `addEventListener()`, imperative DOM updates
- After: Declarative `<template x-for>`, `x-model` two-way binding, `@click` directives, reactive state updates

**Integration with Supabase:** Seamless. Alpine methods call Supabase client, update reactive state, UI auto-updates. No friction.

**This completes the "modern + simple" requirement.** Modern reactive framework (Alpine.js) + modern database (PostgreSQL) + simple deployment (GitHub Pages, no build) + simple auth (Supabase RLS). Zero server code, zero build step, boring infrastructure that works.

---

## 2026-04-20 Session: Documentation Migration & Postmortem (commit TBD)

### What We Did

1. **Updated README.md** — Rewrote to reflect Supabase + Alpine.js + GitHub Pages architecture. Added Getting Started section, Stack table, offline-first callout.
2. **Created docs/lessons-learned.md** — Postmortem documenting DAB retirement discovery, why we debugged a deprecated feature, and key lessons (check deprecation first, simpler stacks win, etc.).
3. **Updated .squad/routing.md** — Removed CosmosDB/DAB references. Added Alpine.js + Supabase schema work. Updated Work Type → Agent mapping.
4. **Updated .squad/team.md** — Changed Basher's role from "Data Wrangler" to "Data Engineer". Added Tech Stack section listing current tools.

### Learnings from DAB Disaster

**The core lesson:** Deprecation discovery should be first in the diagnostic order, not last. We wasted 8+ hours debugging config on a retired service.

**How to recognize:"feature mysteriously broken in production but works locally":**
- Instant 500s (not timeouts) = runtime missing, not config wrong
- Zero diagnostics in logs = feature probably gone
- Local CLI bundles its own runtime (SWA CLI 2.0.8 has DAB 1.3.19, but production SWA doesn't)
- This mismatch masks reality until you check deprecation notices

**Why the pivot to Supabase was right:**
- Eliminates proprietary layers (DAB, CosmosDB NoSQL)
- Simpler stack = fewer failure modes
- PostgreSQL is standard (portable, well-understood)
- RLS provides security without server code
- User's core request: "simple infrastructure" — Supabase + GitHub Pages delivers exactly that

**This migration is now complete and live.** Proispro works at scale (fast UI, reliable cloud sync, zero 500 errors).

