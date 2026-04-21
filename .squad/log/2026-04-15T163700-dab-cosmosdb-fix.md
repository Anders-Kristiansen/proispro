# 2026-04-15T163700 — DAB CosmosDB Fix Session

## Summary
Danny diagnosed and fixed 4 DAB CosmosDB NoSQL bugs causing 500 errors on all GraphQL requests. Commit 65da48f to main.

## Bugs Fixed
1. Entity source format (string → object with type:collection)
2. GraphQL type name pluralization (singular/plural alignment)
3. ID field non-null enforcement (id: ID → id: ID!)
4. Partition key missing from mutations (_partitionKeyValue added to updateDisc + deleteDisc)

## Files Modified
- `swa-db-connections/staticwebapp.database.config.json`
- `swa-db-connections/staticwebapp.database.schema.gql`

## Result
✅ All GraphQL 500 errors resolved. REST + GraphQL endpoints functional.
