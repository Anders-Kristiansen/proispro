# Basher — History

## Core Context

- **Project:** A lightweight personal disc golf inventory page hosted on GitHub Pages, using a separate GitHub repo as a simple JSON file backend.
- **Role:** Data Wrangler
- **Joined:** 2026-04-13T17:32:22.557Z

## Learnings

<!-- Append learnings below -->

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
