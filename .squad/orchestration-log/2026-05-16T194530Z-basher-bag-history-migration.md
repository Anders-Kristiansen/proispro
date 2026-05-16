# Orchestration Log — basher-bag-history-migration

**Agent:** Basher (Data)  
**Role:** Data Wrangler  
**Timestamp:** 2026-05-16T19:45:30Z  
**Task:** Create bag_history Supabase migration  

## Summary

Created `supabase/migrations/20260516000000_bag_history.sql` with append-only audit table schema. Implemented three key schema decisions: TEXT IDs for consistency, denormalized `disc_name` for history survival, and no UPDATE/DELETE RLS policies for audit integrity. Idempotent migration using `CREATE TABLE IF NOT EXISTS` and exception-based policy guards.

## Key Schema Decisions

1. **TEXT IDs (not UUID):** Matches existing `bags.id` and `discs.id` type. Foreign key constraints require matching types.

2. **Denormalized disc_name:** If a disc is deleted after being added to bag history, the history entry still displays the disc name (audit trail integrity).

3. **Append-only RLS:** SELECT (owner read) and INSERT (owner write) only. No UPDATE/DELETE policies prevent tampering.

## Implementation

- `bag_history(bag_id)` index for fast lookup of changes
- `bag_history(user_id)` index for RLS policy optimization
- `bag_history(changed_at DESC)` index for chronological ordering
- Idempotent pattern: `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` for RLS policies

## Supabase Push Status

✅ Migration `20260516000000_bag_history.sql` pushed to Supabase via CLI.

## Retroactive Tracking Decision

Also created retroactive migration `20260516000001_bags_and_course_pins.sql` to track `bags` and `course_pins` tables that existed ad-hoc in Supabase but were never in `supabase/migrations/`. Wrapped with `IF NOT EXISTS` guards for idempotency.

## PR/Branch Status

None — Data migration only, pushed directly to Supabase.
