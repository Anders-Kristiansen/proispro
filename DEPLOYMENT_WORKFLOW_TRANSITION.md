# Deployment Workflow Transition

## Current State (GitHub Pages)

**Workflow:** `.github/workflows/deploy.yml`

Deploys to GitHub Pages on every push to `main`:
- Uploads entire repo root as artifact
- Deploys via GitHub Pages action
- No build step (vanilla HTML/CSS/JS)

**URL:** `https://proispro.com` (via CNAME)

---

## Future State (Azure Static Web Apps)

When you run `azure-infra-setup.ps1` (Step 8), Azure CLI will:
1. Create Static Web App resource
2. **Automatically generate** `.github/workflows/azure-static-web-apps-<id>.yml`
3. Commit this workflow to your repo via GitHub API

**New workflow will:**
- Deploy to Azure SWA on every push to `main`
- Build with Oryx (auto-detects vanilla JS, no build needed)
- Deploy `staticwebapp.database.config.json` automatically
- Create staging environments for PRs

**URL:** `https://<random-name>.azurestaticapps.net` (initially)

---

## Migration Strategy

### Option A: Parallel Deployment (Recommended)

Keep both workflows active during transition:

1. ✅ GitHub Pages workflow continues deploying
2. ✅ Azure SWA workflow auto-created by `az staticwebapp create`
3. ✅ Test Azure SWA at `https://<swa-hostname>`
4. ✅ Update DNS CNAME to point to SWA hostname when ready
5. ✅ Delete/disable GitHub Pages workflow after successful cutover

**Pros:**
- Zero downtime
- Easy rollback (revert DNS CNAME)
- Test both in parallel

**Cons:**
- Two deployments on each push (temporary)

### Option B: Direct Cutover

Disable GitHub Pages, deploy only to Azure SWA:

1. Delete/disable `.github/workflows/deploy.yml`
2. Run `az staticwebapp create` (auto-creates Azure workflow)
3. Update DNS CNAME immediately

**Pros:**
- Clean cutover
- Only one deployment per push

**Cons:**
- Brief downtime during DNS propagation
- Harder to roll back

---

## Recommended: Option A

Keep GitHub Pages active until Azure SWA is fully tested and DNS updated. Then clean up:

```powershell
# After successful Azure SWA deployment and DNS cutover:
git mv .github/workflows/deploy.yml .github/workflows/deploy.yml.bak
git commit -m "Archive GitHub Pages deployment workflow (migrated to Azure SWA)"
git push origin main
```

---

## Azure SWA Workflow Preview

The auto-generated workflow will look similar to:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || github.event.action != 'closed'
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v3
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: ""

  close_pull_request_job:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request
    steps:
      - name: Close Pull Request
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
```

**Key differences:**
- Uses `Azure/static-web-apps-deploy@v1` action
- Auto-injects `AZURE_STATIC_WEB_APPS_API_TOKEN` secret
- Supports PR preview environments
- No artifact upload step (direct deployment)

---

## Post-Migration Cleanup

After Azure SWA is live and DNS updated:

1. **Disable GitHub Pages:**
   ```
   Settings → Pages → Source → None
   ```

2. **Archive old workflow:**
   ```powershell
   git mv .github/workflows/deploy.yml .github/workflows/deploy.yml.archive
   git commit -m "chore: archive GitHub Pages workflow (migrated to Azure SWA)"
   git push
   ```

3. **Update CNAME file (optional):**
   - Keep `CNAME` file if Azure SWA supports it (it does for custom domains)
   - Or delete it (custom domain configured in Azure portal instead)

4. **Clean up DNS:**
   - Remove old GitHub Pages A records (if using A records)
   - Keep CNAME pointing to Azure SWA hostname

---

## Testing Checklist

Before DNS cutover, verify on Azure SWA staging URL:

- [ ] Site loads at `https://<swa-hostname>`
- [ ] All static assets load (HTML, CSS, JS)
- [ ] `staticwebapp.database.config.json` deployed
- [ ] `/api/Disc` endpoint responds
- [ ] CRUD operations work (create, read, update, delete disc)
- [ ] Custom domain configured in Azure portal
- [ ] HTTPS certificate provisioned
- [ ] CORS allows requests from domain

---

**Status:** Documented. Will be executed automatically when `az staticwebapp create` runs in Step 8.
