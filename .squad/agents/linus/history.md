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
