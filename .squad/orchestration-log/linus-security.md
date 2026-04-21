# Linus (DevOps) — Infrastructure & Secrets Audit Session

**Date:** 2026-04-21
**Task:** Infrastructure and secrets security audit
**Model:** claude-sonnet-4.5
**Status:** ✅ Completed

## Findings

### FIXED
- **CosmosDB Secret in .env:** Accidentally committed to repo; credential compromised

### HIGH
- **No SRI Hashes:** HTML files not using Subresource Integrity for CDN resources
- **No CSP Header:** Content Security Policy not enforced; XSS risk
- **GitHub Actions Not Pinned:** CI/CD uses floating action versions

### MEDIUM
- **Math.random() for UIDs:** Should use crypto.randomUUID()

## Actions Taken

1. ✅ Deleted CosmosDB secret from `.env` (commit 7193326)
2. ✅ Added SRI hashes (sha384) to all CDN links (index.html, sale.html, flight-guide.html)
3. ✅ Added CSP meta tag to HTML files
4. ✅ Replaced Math.random() with crypto.randomUUID() in app.js
5. ⏳ GitHub Actions pin — defer to squad decision

## Status

Infrastructure fixes deployed in commit 7193326.
