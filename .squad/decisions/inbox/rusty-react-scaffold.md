# Decision: React + Vite + TypeScript Scaffold

**Date:** 2026-05-16  
**Submitted by:** Rusty (Frontend Dev)  
**Context:** Anders requested migration from Alpine.js (CDN, no build) to React + Vite + TypeScript

## Decision

Scaffolded the React migration foundation with the following structure:

### Package Structure
```json
{
  "name": "proispro",
  "version": "2.0.0",
  "type": "module"
}
```

### Dependencies Added
- **React ecosystem:** `react@18.3.1`, `react-dom@18.3.1`, `react-router-dom@6.28.0`
- **Supabase:** `@supabase/supabase-js@2.48.0`
- **Charts:** `recharts@2.15.0`
- **Build tools:** `vite@6.0.7`, `typescript@5.7.2`, `@vitejs/plugin-react@4.3.4`
- **Type definitions:** `@types/react`, `@types/react-dom`, `@types/node`

### File Structure
```
C:\git\proispro\
├── legacy-index.html          ← Preserved Alpine.js app (1530 lines)
├── index.html                 ← New Vite entry point (13 lines)
├── vite.config.ts            ← Vite config (React plugin, /base, dist output)
├── tsconfig.json             ← TypeScript config (ES2020, strict mode)
├── app.js                    ← Preserved Alpine.js logic (2682 lines, DO NOT DELETE)
├── styles.css                ← Preserved (will be imported globally)
└── src/
    ├── main.tsx              ← React entry point
    ├── App.tsx               ← Shell with React Router
    ├── index.css             ← Global styles
    ├── lib/
    │   └── supabase.ts       ← Supabase client config
    └── types/
        └── database.ts       ← Type stubs (Disc, Bag, CoursePin, HoleAssignment)
```

### Build Verification
- ✅ `npm install` — 124 packages, 0 vulnerabilities
- ✅ `npm run build` — Clean TypeScript + Vite build (1.02s)
- ✅ Output: `dist/` with bundled assets (160KB JS gzipped to 52KB)

## Rationale

1. **Preserve legacy app**: `legacy-index.html` + `app.js` stay intact as migration reference
2. **Type stubs over codegen**: Manual types for now; `supabase gen types` can be run later for full schema sync
3. **React Router upfront**: Enables future route-based pages (inventory, bags, courses, flight-guide)
4. **Supabase client unchanged**: Same URL + anon key from Alpine.js app (no schema changes)
5. **Recharts for analytics**: Replaces hand-rolled SVG flight charts with a battle-tested library
6. **Vite over CRA**: Fast dev server, minimal config, ESM-native

## Migration Strategy

**Incremental port** (not big-bang rewrite):
1. Auth layer (Google/GitHub OAuth)
2. Component structure (Layout, DiscCard, BagCard, modals)
3. State management (discs, bags, coursePins, holeAssignments)
4. CRUD operations per tab (inventory → bags → courses → collections)
5. Flight guide as separate route
6. Analytics/charts with recharts

**Key constraint:** `app.js` and `legacy-index.html` MUST NOT be deleted during migration — they are the reference implementation.

## Impact

- **Build time:** None → 1.02s (development uses Vite HMR, production uses `npm run build`)
- **Bundle size:** None (Alpine.js CDN) → 160KB (React + deps, 52KB gzipped)
- **Dev workflow:** Edit → F5 → Alpine.js reactive → Edit → HMR → React re-render
- **Type safety:** Zero → Full TypeScript strict mode
- **Routing:** Hash-based (#) → History API (cleaner URLs)

## Status

✅ Scaffold complete, committed to `feat/refactor` branch (commit 132c8a8).

---

**Submitted to:** `.squad/decisions/inbox/`  
**Next:** Scribe will merge into main decisions.md
