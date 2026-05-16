# Orchestration Log — Coordinator (Inline Tasks)

**Agent:** Coordinator  
**Role:** Orchestration  
**Timestamp:** 2026-05-16T19:48:00Z  
**Task:** Inline fixes after squad review  

## Summary

Fixed hole filter bug in `getHolesForPin()` to recognize `tee` and `basket` elements alongside `hole` (OSM tagging convention mismatch). Wired `_recordBagHistory()` into `toggleDiscInBag()` and `removeDiscFromBag()` to INSERT bag_history records. Fixed .gitattributes header line endings. All changes integrated into PR #59.

## Changes Made

1. **Hole Filter Fix:** Changed filter from `=== 'hole'` to `['hole', 'tee', 'basket'].includes(el.discGolf)` in `getHolesForPin()`

2. **Bag History Wiring:**
   - Added `_recordBagHistory(bag_id, disc_id, disc_name, action, user_id)` function
   - Called on disc add: `await _recordBagHistory(bagId, discId, disc.name, 'added', this.user.id)`
   - Called on disc remove: `await _recordBagHistory(bagId, discId, disc.name, 'removed', this.user.id)`

3. **Git Attributes Fix:** Corrected .gitattributes header (line endings).

## PR Status

Integrated into PR #59 (draft) — Hole filter + bag history wiring.

## Verification

- Hole list now displays correctly (tees/baskets recognized)
- bag_history table receives INSERT on add/remove operations
- No test failures
