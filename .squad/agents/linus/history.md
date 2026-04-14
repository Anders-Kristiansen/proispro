# Linus — History

## Core Context

- **Project:** A lightweight personal disc golf inventory page hosted on GitHub Pages, using a separate GitHub repo as a simple JSON file backend.
- **Role:** DevOps
- **Joined:** 2026-04-13T17:32:22.559Z

## Learnings

<!-- Append learnings below -->

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
