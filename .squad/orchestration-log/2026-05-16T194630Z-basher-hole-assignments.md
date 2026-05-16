# Orchestration Log — basher-hole-assignments

**Agent:** Basher (Data)  
**Role:** Data Wrangler  
**Timestamp:** 2026-05-16T19:46:30Z  
**Task:** Create hole_assignments Supabase migration  

## Summary

Created `supabase/migrations/20260516000002_hole_assignments.sql` with schema scoped to `course_pin_id` (preserving bag context — different bags may have different game plans for same course). Added `holes_data JSONB` column to `course_pins` for OSM hole list caching. Full CRUD RLS policies enable users to update/delete assignments over time (unlike append-only bag_history).

## Schema Design

```sql
CREATE TABLE hole_assignments (
  id UUID PRIMARY KEY,
  course_pin_id TEXT NOT NULL,
  hole_ref TEXT NOT NULL,
  disc_id TEXT,
  disc_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
UNIQUE (course_pin_id, hole_ref, user_id);
```

## Key Schema Decisions

1. **Scoped to course_pin_id:** Preserves bag context; different bags may have different game plans for same course.

2. **Nullable disc_id + denormalized disc_name:** Follows bag_history pattern. If user deletes disc, assignment still displays correctly.

3. **Full CRUD RLS (not append-only):** Unlike bag_history, assignments need UPDATE/DELETE because users change game plan over time.

4. **TEXT for course_pin_id:** Matches `course_pins.id TEXT PRIMARY KEY` type.

5. **holes_data JSONB on course_pins:** OSM hole data is read-heavy, rarely updated, structured. JSONB avoids separate holes table + enables efficient JSON queries.

## Supabase Push Status

✅ Migration `20260516000002_hole_assignments.sql` pushed to Supabase via CLI.

## PR Status

PR #60 — Schema migration only.

## Impact

- Client can query all assignments for a course pin to display game plan UI
- Stats (Core vs Scramble) computed client-side
- No materialized view needed (current user scale: on-demand aggregation sufficient)
