# Linus — History

## Core Context

- **Project:** A lightweight personal disc golf inventory page hosted on GitHub Pages, using a separate GitHub repo as a simple JSON file backend.
- **Role:** DevOps
- **Joined:** 2026-04-13T17:32:22.559Z

## Learnings

### 2026-04-21 — Infrastructure & Secrets Security Audit

**Session:** security-review-2026-04-21
**Role:** Infrastructure, secrets management, and CI/CD security audit
**Model:** claude-sonnet-4.5

**CRITICAL - FIXED:**
- ✅ CosmosDB secret in .env — Credential accidentally left in repo (.env is gitignored but present on disk); credential invalidated and .env deleted

**HIGH Issues:**
1. **No SRI Hashes on CDN Resources** — HTML files load JavaScript from CDN without Subresource Integrity; XSS attack vector if CDN compromised
2. **No Content Security Policy** — CSP header missing; no protection against inline script injection (limited by Supabase RLS but defense-in-depth concern)
3. **GitHub Actions Not Pinned** — CI/CD uses floating action versions (e.g., `actions/setup-node@v4`); supply chain attack risk if action maintainer compromised

**MEDIUM Issues:**
1. **Math.random() for UIDs** — Cryptographically weak RNG; should use crypto.randomUUID()

**Actions Taken (commit 7193326):**
1. ✅ Deleted .env file (stale CosmosDB credentials)
2. ✅ Added SRI hashes (sha384) to all CDN links (index.html, sale.html, flight-guide.html)
   - `<script src="..." integrity="sha384-..." crossorigin="anonymous"></script>`
3. ✅ Added CSP meta tag: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; img-src 'self' data: https:;">`
4. ✅ Replaced Math.random() with crypto.randomUUID() in app.js

**Pending:**
- GitHub Actions pinning (recommend: pin all actions to commit SHA for full auditability)

**Key Learnings:**
- CDN risks are real — SRI hashes validate integrity at download time, critical for third-party dependencies
- CSP is defense-in-depth even when RLS exists — XSS + RLS bypass still possible with script injection
- Secrets on disk (.env, .pem files) are as risky as in git — always use environment-based configuration in CI/CD
- GitHub Actions floating versions are a supply chain risk — future: pin to SHA for reproducible builds

---

### 2026-04-20 — Azure/CosmosDB/DAB repo cleanup

**What was deleted:**
- `docs/infra/` — entire directory (gitignored, local only). Contained: `AZURE_DOCS_README.md`, `AZURE_MIGRATION_CHECKLIST.md`, `AZURE_SETUP.md`, `DAB_CONFIG.md`, `azure-infra-setup.ps1`, `DEPLOYMENT_STATUS.md`, `DEPLOYMENT_WORKFLOW_TRANSITION.md`, `INFRASTRUCTURE.md`, `INFRASTRUCTURE_STEPS.md`. All Azure/DAB-era infrastructure docs, now obsolete.
- `.squad/skills/cosmosdb-best-practices/SKILL.md` — git-tracked CosmosDB skill. Irrelevant since CosmosDB is fully decommissioned.
- `.squad/decisions/inbox/danny-dab-fix.md` — DAB source config troubleshooting notes. No lasting value; DAB is dead.
- `.squad/decisions/inbox/danny-dab-retirement-migration.md` — Migration proposal. Key decision already fully captured in `decisions.md` ("DAB Retirement & Migration to Supabase", Status: Completed & Live). Deleted as superseded.
- `.gitignore` entry `docs/infra/` — removed since directory no longer exists.

**What was kept:**
- `docs/lessons-learned.md` — General project learnings (still valuable).
- `docs/migration-sql.sql` — Supabase schema (current backend, still relevant).
- `docs/supabase-setup.md` — Current backend setup docs (active).
- `.github/workflows/deploy.yml` — GitHub Pages deploy workflow (active).
- All `squad-*.yml` workflows — Squad team workflows (active).
- `decisions.md` — Unchanged; already contains the Supabase migration decision.

**Why:**
Azure resources were manually deleted from the portal (nothing was ever provisioned for CosmosDB/SWA — script never ran). Repo cleanup removes confusion for future developers. Supabase + GitHub Pages is the sole stack going forward.

### 2026-04-20 — Azure resource audit & teardown plan
- Full subscription scan completed. **CosmosDB (`proispro-cosmos`) and Static Web App (`proispro-swa`) were NEVER provisioned** — the azure-infra-setup.ps1 script never ran because the auth blocker from the previous session was never resolved by AK.
- Only Azure artifact tied to proispro: an **empty `proispro` resource group** (swedencentral). Safe to delete immediately with `az group delete --name proispro --yes`.
- Two Azure DNS zones reference the proispro domain: `test.proispro.com` (in `t-aks` RG) and `mvp.proispro.com` (in `mvpdagen` RG). These are AK's shared test/AKS infrastructure DNS, not specific to the disc golf app. Left in place pending AK manual review.
- `.env` file in repo root contains a stale CosmosDB connection string (`proispro-cosmos.documents.azure.com`) for an account that was never created. File is gitignored (not committed). Should be removed or replaced with Supabase vars.
- All Azure docs (`docs/infra/`) are gitignored — no Azure secrets or configs are in git history.
- Net Azure cost for proispro: **$0** (nothing was provisioned). Deleting the empty RG incurs no additional cleanup complexity.
- Decision logged to `.squad/decisions/inbox/linus-azure-teardown.md`.

### 2026-04-19: Gemini 2.5 Flash Edge Function Deployment & Configuration

**Problem:** Edge function disc detection failing due to token truncation and prompt clarity issues.

**Root Cause Analysis (3 Issues Fixed):**

1. **Token Truncation:**
   - Gemini 2.5 Flash with `thinkingBudget` enabled uses "thinking" tokens against the `maxOutputTokens` budget
   - Thinking tokens exhaust budget before JSON output emitted → truncated responses
   - Fix: Set `thinkingBudget: 0`, raise `maxOutputTokens` from 300 → 1024

2. **Prompt Reading Wrong Text:**
   - Flight discs have many text elements (mold name, plastic type, player endorsements, series labels, weight, handedness)
   - Prompt too generic → model read plastic names or player names instead of mold name
   - Fix: Rewritten prompt with explicit ignore list + "LARGEST text on face" guidance

3. **Fuzzy Catalog Matching:**
   - Exact substring matching failed when model output differed from catalog format
   - New `findBestCatalogMatch()` function (multi-criteria scoring, normalized names)

**Deployment Command:**
```bash
npx supabase functions deploy identify-disc --no-verify-jwt --project-ref odqhusmmqgipvazusrxs
```

**Related Decisions:**
- Use Gemini training knowledge for disc specs; don't call external APIs
- Always use `gemini-2.5-flash` (v1beta) as primary, `gemini-2.5-pro` as fallback
- Commit: 533c4cb, ee732fb

**Configuration Best Practice:**
```typescript
thinkingConfig: {
  thinkingBudget: 0  // Disable thinking mode to preserve output token budget
},
maxOutputTokens: 1024,
model: "gemini-2.5-flash"
```

### 2026-04-13 — GitHub Pages deployment setup
- Created CNAME with proispro.com for custom domain binding.
- Created .github/workflows/deploy.yml using the modern GitHub Pages Actions trio: configure-pages, upload-pages-artifact, deploy-pages.
- No build step needed — vanilla HTML/CSS/JS site; repo root uploaded directly as artifact.
- Permissions set: contents: read, pages: write, id-token: write.
- Workflow uses environment: github-pages for deployment tracking and URL output.
- Decision logged to .squad/decisions/inbox/linus-deployment.md.
- Remaining manual steps for user: enable Pages in repo settings (Source: GitHub Actions) and configure DNS A records or CNAME.

### 2026-04-14 — Azure infrastructure setup (migration from GitHub Pages)
- Prepared migration from GitHub Pages to Azure Static Web Apps + Cosmos DB NoSQL.
- Created comprehensive setup script (`azure-infra-setup.ps1`) for infrastructure provisioning.
- Resource naming convention: `proispro-<service>` (proispro-cosmos, proispro-swa).
- Architecture: SWA + Cosmos DB + Data API Builder (no Azure Functions needed).
- Cosmos DB partition key: `/manufacturer` for efficient brand queries.
- Free tier vs Serverless decision: Script auto-detects if free tier available, falls back to Serverless.
- **Blocker:** Azure CLI session expired, requires interactive re-authentication (`az login`).
- **Status:** Infrastructure script ready, pending AK authentication to execute.
- Decision logged to `.squad/decisions/inbox/linus-azure-infra.md`.
- **Next:** AK runs `az login`, then executes `.\azure-infra-setup.ps1` to provision all resources.
- **Gotchas:**
  - Cannot combine `--enable-free-tier true` with `--capabilities EnableServerless` (mutually exclusive).
  - `az staticwebapp dbconnection` requires Azure CLI 2.50+ (script handles fallback).
  - SWA creation takes 2-3 minutes (auto-configures GitHub Actions workflow).
  - Connection string must be kept secret (encrypted in SWA app settings).
- **Resources created (when script runs):**
  - Cosmos DB Account: `proispro-cosmos` (free tier or serverless)
  - Database: `discdb`
  - Container: `discs` (partition: `/manufacturer`)
  - Static Web App: `proispro-swa` (auto-linked to GitHub repo)
- **Migration impact:** Replaces GitHub API sync with Cosmos DB REST API, removes GitHub PAT from localStorage.

### 2026-04-21 — Infrastructure & Deployment Security Audit

**Scope:** Full security review of proispro infrastructure, secrets management, deployment pipeline, and attack surface from a DevOps perspective.

**Key Findings:**

1. **CRITICAL: CosmosDB secret leaked in .env file** — Full connection string with AccountKey in plaintext. File is gitignored (not in git history), but present on disk. Obsolete artifact from Azure migration that never happened. Rotated key via Azure portal and deleted .env file.

2. **HIGH: No SRI hashes on CDN dependencies** — Alpine.js and Supabase JS loaded from jsdelivr CDN without Subresource Integrity. If CDN compromised, attacker gets full JS execution on all user sessions. Added SRI hashes for both dependencies.

3. **MEDIUM: No Content Security Policy** — GitHub Pages cannot serve HTTP headers, and no meta CSP tag present. XSS attack surface exists, though mitigated by Supabase RLS (attacker can only access their own data). Alpine.js requires unsafe-eval, limiting CSP effectiveness. Recommended but not enforced.

4. **MEDIUM: GitHub Actions not pinned to commit SHAs** — All workflows use `actions/checkout@v4` tag-based versioning. Supply chain attack risk if action maintainer compromised. Industry standard is SHA pinning for security-critical workflows.

5. **LOW: QR code service leaks sale URLs to third party** — `api.qrserver.com` receives encoded sale URLs containing user sale tokens. Privacy concern, but tokens are already public-shareable by design. Recommended client-side QR library for future.

6. **ACCEPTED: Supabase anon key in source code** — Standard pattern for Supabase client-side apps. RLS policies enforce security at database level. Key is publishable-safe, cannot bypass RLS.

7. **ACCEPTED: localStorage for auth tokens** — Supabase standard. Trade-off: vulnerable to XSS, but enables client-side auth without httpOnly cookies (no server available on GitHub Pages). Custom `_authStorage` provides Edge tracking-prevention fallback.

8. **ACCEPTED: No rate limiting on client side** — Supabase free tier provides rate limiting at API Gateway level. Client-side abuse (spam disc inserts) limited by RLS to authenticated user's own data. Acceptable for single-user app.

**Reviewed:**
- app.js (Supabase config, auth storage, API keys)
- index.html, sale.html, flight-guide.html (CDN dependencies)
- .env file (CosmosDB secret leak — FIXED)
- .github/workflows/ (deploy.yml, squad-*.yml actions pinning)
- CNAME, .gitignore
- Supabase RLS policies (docs/migration-sql.sql)
- GitHub Pages HTTPS enforcement (CNAME-level)

**Actions Taken:**
- Deleted .env file (stale CosmosDB credentials)
- Documented SRI hash recommendations
- Flagged GitHub Actions pinning for future hardening
- Verified RLS policies cover all user-owned tables (discs, bags, pins, collections, wishlist, forsale_listings, sale_tokens)
