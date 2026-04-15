---
name: cosmosdb-best-practices
description: |
  Azure Cosmos DB NoSQL best practices for data modeling, partition key design,
  query optimization, and DAB (Data API Builder) GraphQL integration. Use when
  writing or reviewing any code that reads from or writes to CosmosDB, designing
  document schemas, or troubleshooting DAB + CosmosDB NoSQL issues.
source: .agents/skills/cosmosdb-best-practices/
confidence: high
---

# CosmosDB Best Practices (ProIsPro Project)

Distilled from the full 75-rule guide in `.agents/skills/cosmosdb-best-practices/`. Project-specific guidance first; full rules in `AGENTS.md` and `rules/` therein.

## Project Context

- **Account**: `proispro-cosmos` (West Europe)
- **Database**: `discdb`, **Container**: `discs`, **Partition key**: `/id`
- **Access**: via Data API Builder (DAB) over GraphQL at `/data-api/graphql`
- **Auth**: SWA EasyAuth → `authenticated` role in DAB (StaticWebApps provider)

---

## 1. Data Modeling (CRITICAL)

- **Embed related data** retrieved together in one document — avoids cross-partition joins.
- Keep items **well under 2 MB** (current disc documents are tiny — no concern).
- **Schema versioning**: add a `schemaVersion` field if the document shape will evolve.
- **Type discriminators**: use a field like `docType` if multiple document types share a container.
- **Field names**: avoid GraphQL reserved keywords (`type`, `query`, `mutation`, `schema`, `fragment`, `subscription`, `on`, `true`, `false`, `null`). We already renamed `type → discType`.

## 2. Partition Key Design (CRITICAL)

- **Current key `/id`** is simple and avoids cross-partition queries for point reads, but gives low cardinality — fine for small single-user workloads. Revisit if multi-user.
- **Immutable partition key**: `/id` (UUID) is immutable — correct.
- **20 GB logical partition limit**: with `/id` every disc is its own partition — no limit risk.
- **Never use high-write-rate single values** (e.g., `/userId` for a single user = hotspot) for write-heavy workloads. For a personal tracker, `/id` per disc is fine.

Full guidance: [partition-high-cardinality](../../.agents/skills/cosmosdb-best-practices/rules/partition-high-cardinality.md)

## 3. Query Optimization (HIGH)

- **Point reads** (`ReadItem` by `id` + partition key) cost ~1 RU. Always prefer over a query when both are known.
- **Avoid cross-partition queries** — with `/id` as key, any filter other than `id` is cross-partition. For a small bag tracker this is acceptable; add composite indexes if query latency grows.
- **Use projections** — request only the fields needed, not `SELECT *`.
- **Parameterize queries** — never concatenate user input into query strings.
- **Pagination**: use continuation tokens (`afterToken`) for lists, never `OFFSET/LIMIT` at scale.

Full guidance: [query-point-reads](../../.agents/skills/cosmosdb-best-practices/rules/query-point-reads.md), [query-avoid-cross-partition](../../.agents/skills/cosmosdb-best-practices/rules/query-avoid-cross-partition.md)

## 4. DAB + CosmosDB NoSQL Integration

### Transport: always GraphQL, never REST
- DAB REST is designed for **relational** databases. For CosmosDB NoSQL, use **GraphQL only** (`/data-api/graphql`).
- REST returning 500 for CosmosDB NoSQL is expected — do not debug REST.

### GraphQL Operation Shapes
```graphql
# List all discs
query { discs { items { id name manufacturer discType plastic weight color condition flight notes addedAt } } }

# Create
mutation CreateDisc($item: CreateDiscInput!) {
  createDisc(item: $item) { id name }
}

# Update (CosmosDB NoSQL requires _partitionKeyValue)
mutation UpdateDisc($id: ID!, $item: UpdateDiscInput!) {
  updateDisc(id: $id, _partitionKeyValue: $id, item: $item) { id }
}

# Delete
mutation DeleteDisc($id: ID!) {
  deleteDisc(id: $id, _partitionKeyValue: $id) { id }
}
```

### GraphQL Reserved Keywords
HotChocolate (DAB's GraphQL engine) rejects these as **field names** — rename them:

| Forbidden  | Use instead  |
|------------|-------------|
| `type`     | `discType`   |
| `query`    | avoid        |
| `mutation` | avoid        |
| `id: ID`   | OK (standard)|

### DAB Config Checklist
```json
{
  "entities": {
    "Disc": {
      "source": { "object": "discs", "type": "collection" },
      "graphql": { "enabled": true, "type": { "singular": "Disc", "plural": "discs" } },
      "rest": { "enabled": false },
      "permissions": [{ "role": "authenticated", "actions": ["*"] }]
    }
  }
}
```

### DAB Schema Requirements
- Schema file: `swa-db-connections/staticwebapp.database.schema.gql`
- Every entity must have `@model` directive
- `id` field should be type `ID!` or `String!`
- Schema is compiled by HotChocolate at startup — any error returns 500 on ALL requests

## 5. Indexing (MEDIUM-HIGH)

- Default CosmosDB indexing indexes **all paths** — fine for small collections.
- Exclude unused paths to reduce write RU cost:
  ```json
  { "excludedPaths": [{ "path": "/notes/*" }] }
  ```
- Add **composite indexes** if you add ORDER BY with filters:
  ```json
  { "compositeIndexes": [[{ "path": "/manufacturer" }, { "path": "/discType" }]] }
  ```

## 6. Throughput (MEDIUM)

- **Serverless** is ideal for this personal tracker (pay-per-request, no minimum RU/s).
- If switched to provisioned, use **autoscale** (min 100 RU/s, max 1000 RU/s).
- Each disc list query (cross-partition, full scan) costs ~5–15 RU for small containers.

Full guidance: [throughput-serverless](../../.agents/skills/cosmosdb-best-practices/rules/throughput-serverless.md)

## 7. Diagnostics / Troubleshooting

- A 500 on `/data-api/graphql` with no response body usually means **schema compilation failed** at DAB startup.
  - Check for reserved GraphQL keywords in field names.
  - Check for malformed `@model` directives.
  - Check for missing required fields in mutations.
- Test schema compilation with an introspection query:
  ```bash
  curl -X POST https://<swa-host>/data-api/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __schema { types { name } } }"}'
  ```
  If this returns 500, the schema is broken. If it returns a list of types, the schema is fine and the issue is data or permissions.

Full diagnostics guide: `.agents/skills/cosmosdb-best-practices/AGENTS.md`

## Routing

Tasks involving CosmosDB queries, DAB config, partition key decisions, or schema design should use this skill. Assign to **Danny** (architecture/decisions) or **Rusty** (implementation).
