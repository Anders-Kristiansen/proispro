# Lessons Learned: Azure SWA → Supabase Migration

## What Happened

### Timeline
- **2026-04-14:** Deployed proispro to Azure Static Web Apps + CosmosDB + Data API Builder (DAB)
- **2026-04-15 & 2026-04-16:** Production returning instant 500 errors from `/data-api/graphql`
- **Multiple debugging sessions:** Verified ARM templates, connection strings, DAB schema format, partition keys, GraphQL type alignment
- **2026-04-16 discovery:** Azure SWA Database Connections (DAB) was **retired November 30, 2025**
- **Immediate pivot:** Migrated to Supabase PostgreSQL + Alpine.js + GitHub Pages

### Root Cause
DAB is a retired feature. Microsoft no longer deploys the DAB runtime with Azure Static Web Apps. The feature announced deprecation but the outage appeared silent — `/data-api/graphql` returned opaque 500s with zero diagnostic information. Our debugging efforts were fundamentally futile: we were debugging a deprecated platform.

---

## Key Lessons

### 1. Check Service Deprecation BEFORE Config Debugging

**Red flags we missed:**
- Instant 500 responses (not gradual timeout) = runtime not starting
- Zero DAB diagnostics in Azure Portal logs = feature not present
- Microsoft docs pages redirect to overview = deprecation notice
- Local SWA CLI (with DAB 1.3.19 bundled) worked fine ≠ production endpoint works

**Correct diagnosis order for managed service failures:**
1. **Check deprecation announcements first** (Microsoft Learn, Azure Blog)
2. Check service health dashboard
3. THEN debug configuration

**Why this matters:** We spent 8+ hours debugging config that was correct. The feature didn't exist.

### 2. "Works Locally" ≠ "Works in Production" When Local Tools Bundle Their Own Runtime

**The deception:** SWA CLI v2.0.8 bundles DAB 1.3.19 locally. Running `swa start .` gives you a complete local runtime—but production SWA no longer includes DAB at all. The two environments were fundamentally different.

**Implication:** Local testing was validating a feature that didn't exist in production. This masked the real problem for days.

### 3. Azure Complexity Was Overkill from the Start

**The stack:**
- Azure Static Web Apps (hosting) ✓ necessary
- CosmosDB (database) ✓ necessary
- Data API Builder (GraphQL) ✗ fragile, deprecated, adds layer
- ARM templates + connection strings + DAB config ✗ operational burden

**The realization:** For a ~100-disc personal inventory app, this was too many moving parts. A simpler stack would have prevented this entire failure mode.

### 4. Supabase PostgreSQL Is the Right Fit for This Use Case

**Why we chose Supabase:**
- **Standard PostgreSQL** — Every developer knows SQL. No proprietary query language (DAB GraphQL).
- **Built-in GitHub OAuth** — Zero custom auth code. OAuth provider integrated.
- **Row-Level Security (RLS)** — PostgreSQL policies enforce "users see only their own data" at DB level. Even if API key leaks, RLS validates every query.
- **Client-side database access** — Supabase JS client runs in browser. No server-side code needed (no Functions layer).
- **Free tier is generous** — 500MB database (50K+ discs), unlimited requests. Won't outgrow it.
- **Open source + self-hostable** — If Supabase fails, we can migrate (can't do that with CosmosDB).

**What we lost:**
- Azure ecosystem (user explicitly wants to leave)
- CosmosDB global distribution (irrelevant for single-user Swedish app)
- GraphQL (Supabase REST API is simpler anyway)

### 5. Simpler Stacks Reduce Failure Surface Area

**Before (Azure):** 4 services, 3+ config files, 2+ dashboards (Azure Portal, DAB diagnostics), opaque errors
**After (Supabase + GitHub Pages):** 2 services (Supabase + GitHub Pages), 1 config file (app.js constants), 2 dashboards (Supabase console, GitHub Pages), clear errors

Simpler architectures fail less often **and are easier to debug when they do**.

### 6. When a Feature Silently Fails, Question the Platform

**The pattern:**
- Feature worked locally
- Production always returned error
- No hints in Azure logs
- Debugging produced no progress
- This is suspicious ↔ "The feature might be gone"

**Next time:** Before spending 4 hours debugging config, ask "Is this feature actually available in the production environment?"

---

## Technical Decisions Made

### Frontend: Alpine.js Instead of Vanilla JS

**Why:**
- Vanilla JS DOM manipulation was 450 lines of state tracking
- Alpine.js reduces this to ~250 lines via declarative `x-for`, `x-model`, `@click` directives
- Zero build step (CDN script tag)
- Tiny (~15kb gzipped vs. ~130kb React)
- Perfect for "sprinkle interactivity" use case

### Database: PostgreSQL Instead of CosmosDB NoSQL

**Why:**
- Disc inventory is relational data (manufacturers, types, conditions — all queryable)
- CosmosDB partition key strategy (`/id`) was a workaround
- PostgreSQL `WHERE` clauses are the natural fit
- Standard schema is portable (can migrate, export dumps, self-host)

### Hosting: GitHub Pages Instead of Azure SWA

**Why:**
- Static hosting is all we need (no server-side code)
- GitHub Pages: push to main = deployed
- Custom domain + SSL auto-managed (CNAME still works)
- Free, zero-config, familiar to developers
- User explicitly requested "simple GH Pages" if possible

---

## What Went Right

1. **User requested simplicity early** — "We will not use functions" was guidance, not a blocker. This steered us toward Supabase instead of Azure Functions band-aid.
2. **Pivot was fast** — Once we identified DAB was dead, we switched stacks in one session (vs. spending weeks on alternative Azure solutions).
3. **Supabase + Alpine.js delivered** — New stack is live at proispro.com. Cloud sync works. No 500 errors.
4. **Schema migration was straightforward** — CosmosDB JSON → PostgreSQL was a simple transformation. Data wasn't locked.

---

## Conclusion: Boring Infrastructure Wins

**Azure SWA + CosmosDB + DAB** felt like the "right" cloud-native choice. It was wrong because:
- DAB was deprecated (we didn't know)
- CosmosDB NoSQL was overkill (PostgreSQL was simpler)
- SWA was more complex than needed (GitHub Pages works fine)

**Supabase + GitHub Pages** feels "simpler" because it actually is:
- PostgreSQL is standard (not proprietary)
- GitHub Pages is boring (push → deploy)
- Supabase has clear error messages (not opaque 500s)
- The stack is portable (not Azure-locked)

**The lesson:** Complexity isn't always wrong, but it should solve a real problem. For a personal 100-disc app, Supabase + GitHub Pages is the right complexity level. Azure was over-engineered.
