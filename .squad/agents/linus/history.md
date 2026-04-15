# Linus — History

## Core Context

- **Project:** A lightweight personal disc golf inventory page hosted on GitHub Pages, using a separate GitHub repo as a simple JSON file backend.
- **Role:** DevOps
- **Joined:** 2026-04-13T17:32:22.559Z

## Learnings

<!-- Append learnings below -->

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
