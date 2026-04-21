# Basher (Data Engineer) — RLS Audit Session

**Date:** 2026-04-21
**Task:** Supabase RLS policy audit
**Model:** claude-sonnet-4.5
**Status:** ✅ Completed

## Findings

### CRITICAL
- **collection_discs Missing UPDATE Policy:** Data modification not controlled by RLS
- **Core Tables Not in Migrations:** Schema changes not version-controlled; schema drift risk

### HIGH
- **sale_tokens Enumeration:** Public SELECT allows enumeration of all tokens
- **10-Year Signed URL Lifetime:** CosmosDB signed URLs valid for 10 years (should be hours/days)

## Actions Recommended

1. Add UPDATE RLS policy to `collection_discs`
2. Move all core tables into migrations (20260421000000_security_fixes.sql)
3. Create `lookup_sale_token()` SECURITY DEFINER function to replace public SELECT
4. Reduce signed URL lifetime

## Integration

Findings implemented in migrations and supabase/functions/ (commit 7193326).
