# Basher — History

## Core Context

- **Project:** A lightweight personal disc golf inventory page hosted on GitHub Pages, using a separate GitHub repo as a simple JSON file backend.
- **Role:** Data Wrangler
- **Joined:** 2026-04-13T17:32:22.557Z

## Learnings

<!-- Append learnings below -->

### 2026-04-20: Phase 1–3 Supabase Migrations (Collections, Wishlist, For Sale)

**Tables created:**
- `collections` — named disc groupings (distinct from `bags`, which are round loadouts). UUID PK, user_id FK to auth.users, name, description, created_at, updated_at. Updated_at maintained via trigger.
- `collection_discs` — many-to-many junction (collections ↔ discs). Composite PK (collection_id, disc_id), sort_order INTEGER, added_at TIMESTAMPTZ. No updated_at (inserts only, rows deleted/re-inserted for reordering).
- `wishlist_items` — disc acquisition wishlist. UUID PK, user_id FK, disc_name, manufacturer, plastic_pref, weight_min/max (INTEGER), priority (SMALLINT 0/1/2), notes, acquired BOOLEAN, timestamps. Updated_at trigger.
- `forsale_listings` — marketplace listings. UUID PK, user_id + disc_id FKs, price NUMERIC(8,2), currency TEXT DEFAULT 'SEK', contact_method TEXT, contact_info TEXT, status TEXT with CHECK constraint, listed_at, sold_at. No updated_at (status transitions cover lifecycle).

**RLS patterns used:**
- Direct ownership (`auth.uid() = user_id`): collections, wishlist_items, forsale_listings — all four ops (SELECT/INSERT/UPDATE/DELETE).
- Indirect ownership via JOIN: collection_discs has no user_id column; ownership checked by `EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND c.user_id = auth.uid())` — avoids denormalized user_id on junction table.
- UPDATE policies include both USING (row filter) and WITH CHECK (new-value guard).

**Idempotency strategy:**
- `CREATE TABLE IF NOT EXISTS` for all tables.
- `CREATE OR REPLACE FUNCTION` for the shared `update_updated_at_column()` trigger function (re-declared in each migration so each file is self-contained).
- `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` for updated_at triggers (DROP+CREATE is idempotent; no native IF NOT EXISTS for triggers in PG 15/16).
- `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` guards for all RLS policies (CREATE POLICY IF NOT EXISTS requires PG 17, Supabase runs 15/16).

### 2026-04-14: Disc Golf Catalog Schema & Data API Builder Configuration

**Disc Schema Design:**
- Chose `/manufacturer` as partition key for Cosmos DB NoSQL — provides natural data distribution across major brands (Innova, Discraft, Dynamic Discs, etc.)
- Flight numbers (`speed`, `glide`, `turn`, `fade`) stored as individual numeric fields rather than composite string — enables range queries and sorting (`speed >= 10`, `fade desc`)
- `plastic` as array of strings — discs come in multiple plastic types, array allows filter queries like "contains 'Champion'"
- Separated catalog metadata (disc specs, PDGA approval, discontinuation status) from user inventory (which discs AK owns, their condition) — catalog is read-only reference data
- `weightMin`/`weightMax` instead of single weight — catalog represents what's manufactured, not specific disc in bag
- ISO 8601 `updatedAt` timestamp for crawler audit trail and staleness detection

**Partition Key Rationale:**
- `/manufacturer` provides ~10-20 logical partitions (major brands) rather than per-disc partitioning
- Query pattern aligns with partition: "show me all Innova discs" hits one partition; "show me all Putters" is cross-partition but acceptable for catalog queries
- Alternative `/id` would create 1000s of tiny partitions (one doc each) — poor for throughput distribution
- Alternative `/type` would create only 4 partitions — risk of hot partition if one type dominates queries

**Data API Builder Config Choices:**
- Cosmos DB NoSQL requires explicit GraphQL schema file (`staticwebapp.database.schema.gql`) — not inferred like SQL databases
- Locked down to `anonymous` role with `read` only — frontend is pure consumer, no writes
- CORS `origins: ["*"]` safe here because API is read-only public catalog data
- `allow-introspection: false` in production — prevents schema snooping, security best practice
- REST path `/rest` and GraphQL path `/graphql` follow SWA conventions — final URLs are `/data-api/rest/Disc`, `/data-api/graphql`

**OData Query Design:**
- `$filter` syntax maps naturally to disc queries: `type eq 'Putter'`, `speed ge 12`, `manufacturer eq 'Innova'`
- `$orderby` critical for UX: sort by name (alphabetical), speed (fastest first), fade (most overstable)
- `$top` + `$skip` for pagination — catalog could grow to 1000+ discs
- Example: `GET /data-api/rest/Disc?$filter=discontinued eq false and speed ge 10&$orderby=speed desc&$top=20` — "show me top 20 fastest in-production discs"

**Schema Evolution Considerations:**
- Adding fields to GraphQL schema is non-breaking (crawler can populate new fields, old docs return null)
- Removing fields breaks queries — would require schema versioning or field deprecation strategy
- Partition key `/manufacturer` is immutable — cannot change without full data migration

### 2026-04-15: Auth Lockdown — Require Authentication for All Routes and DAB Access

**Security directive from AK:** "we cant have anything wide open."

**DAB Config changes (`staticwebapp.database.config.json`):**
- Changed `Disc` entity permission `role` from `"anonymous"` to `"authenticated"` — prevents unauthenticated reads or writes to Cosmos DB via `/data-api/graphql`
- Tightened CORS `origins` from `["*"]` to `["https://proispro.com"]` — DAB will only accept requests from the known production domain

**SWA Route Config created (`staticwebapp.config.json`):**
- `/.auth/*` remains open (anonymous) — required for the login flow itself to work
- `/api/*` requires `authenticated` role — locks down any Azure Functions endpoints
- `/*` catch-all requires `authenticated` role — entire site gated behind login
- 401 response overridden to HTTP 302 redirect to `/.auth/login/github` — unauthenticated visitors are sent to GitHub OAuth automatically, never see an error page

**Auth model:** GitHub OAuth via Azure SWA built-in auth. SWA issues a session cookie post-login. DAB validates session via `StaticWebApps` provider and enforces `authenticated` role on all Disc entity operations.

### 2026-04-19: Disc Catalog Fuzzy Matching — findBestCatalogMatch Pattern

**Problem:** AI disc detection returns mold name (e.g., "Destroyer"), but catalog lookup fails due to exact substring matching against full catalog entries (e.g., "Innova Destroyer 12/5/-1/3").

**Solution:** New `findBestCatalogMatch(moldName, manufacturerName)` function in `disc-catalog.js`:
- **Normalization:** Both input and catalog entries normalized (lowercase, non-alphanumeric removed, whitespace stripped)
- **Multi-criteria scoring:**
  - Exact name match: +10 points
  - Partial name match (first word, key terms): +5 points
  - Brand/manufacturer match: +3 points
  - Score-based ranking: returns top 3 candidates with confidence
- **Fallback:** If no manufacturer provided, find closest alphabetic match
- **Result:** Robust matching that handles name variations, punctuation differences, descriptor text (e.g., "Destroyer" ← "Destroyer 12/5/-1/3")

**Implementation:** `disc-catalog.js` lines ~150–220. Called from `app.js` in AI identify handler.

**Pattern Applicability:** Useful for any catalog lookup where:
- Input names vary in format/verbosity (user input, OCR, model output)
- Catalog entries have descriptive metadata mixed with canonical names
- Fuzzy matching with manual scoring is preferred over Levenshtein/Jaro-Winkler (simpler, transparent scoring logic)

### 2026-04-14: Disc Golf Catalog Schema & Data API Builder Configuration

**Disc Schema Design:**
- Chose `/manufacturer` as partition key for Cosmos DB NoSQL — provides natural data distribution across major brands (Innova, Discraft, Dynamic Discs, etc.)
- Flight numbers (`speed`, `glide`, `turn`, `fade`) stored as individual numeric fields rather than composite string — enables range queries and sorting (`speed >= 10`, `fade desc`)
- `plastic` as array of strings — discs come in multiple plastic types, array allows filter queries like "contains 'Champion'"
- Separated catalog metadata (disc specs, PDGA approval, discontinuation status) from user inventory (which discs AK owns, their condition) — catalog is read-only reference data
- `weightMin`/`weightMax` instead of single weight — catalog represents what's manufactured, not specific disc in bag
- ISO 8601 `updatedAt` timestamp for crawler audit trail and staleness detection

**Partition Key Rationale:**
- `/manufacturer` provides ~10-20 logical partitions (major brands) rather than per-disc partitioning
- Query pattern aligns with partition: "show me all Innova discs" hits one partition; "show me all Putters" is cross-partition but acceptable for catalog queries
- Alternative `/id` would create 1000s of tiny partitions (one doc each) — poor for throughput distribution
- Alternative `/type` would create only 4 partitions — risk of hot partition if one type dominates queries

**Data API Builder Config Choices:**
- Cosmos DB NoSQL requires explicit GraphQL schema file (`staticwebapp.database.schema.gql`) — not inferred like SQL databases
- Locked down to `anonymous` role with `read` only — frontend is pure consumer, no writes
- CORS `origins: ["*"]` safe here because API is read-only public catalog data
- `allow-introspection: false` in production — prevents schema snooping, security best practice
- REST path `/rest` and GraphQL path `/graphql` follow SWA conventions — final URLs are `/data-api/rest/Disc`, `/data-api/graphql`

**OData Query Design:**
- `$filter` syntax maps naturally to disc queries: `type eq 'Putter'`, `speed ge 12`, `manufacturer eq 'Innova'`
- `$orderby` critical for UX: sort by name (alphabetical), speed (fastest first), fade (most overstable)
- `$top` + `$skip` for pagination — catalog could grow to 1000+ discs
- Example: `GET /data-api/rest/Disc?$filter=discontinued eq false and speed ge 10&$orderby=speed desc&$top=20` — "show me top 20 fastest in-production discs"

**Schema Evolution Considerations:**
- Adding fields to GraphQL schema is non-breaking (crawler can populate new fields, old docs return null)
- Removing fields breaks queries — would require schema versioning or field deprecation strategy
- Partition key `/manufacturer` is immutable — cannot change without full data migration
