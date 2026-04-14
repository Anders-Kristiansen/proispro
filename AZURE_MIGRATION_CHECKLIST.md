# Azure Migration Checklist

**Project:** ProIsPro — Disc Golf Bag Tracker  
**Migration:** GitHub Pages → Azure Static Web Apps + Cosmos DB  
**Prepared by:** Linus (DevOps)  
**Date:** 2026-04-14  

---

## ✅ Pre-Migration (COMPLETED)

- [x] Architecture decision documented (`.squad/decisions/inbox/linus-azure-infra.md`)
- [x] Infrastructure script created (`azure-infra-setup.ps1`)
- [x] Quick start guide created (`AZURE_SETUP.md`)
- [x] Architecture documentation created (`INFRASTRUCTURE.md`)
- [x] Data API Builder config created (`staticwebapp.database.config.json`)
- [x] API documentation created (`DAB_CONFIG.md`)
- [x] Deployment status report created (`DEPLOYMENT_STATUS.md`)
- [x] Workflow transition plan created (`DEPLOYMENT_WORKFLOW_TRANSITION.md`)
- [x] Linus history updated (`.squad/agents/linus/history.md`)

---

## 🚀 Phase 1: Infrastructure Provisioning (PENDING AK)

### Prerequisites
- [ ] Azure CLI installed (`az --version` → 2.50+)
- [ ] GitHub CLI installed (`gh --version`)
- [ ] Azure CLI authenticated (`az login`)
- [ ] GitHub CLI authenticated (`gh auth status`)

### Execute Setup Script
- [ ] Run `.\azure-infra-setup.ps1` from project root
- [ ] Wait ~5-10 minutes for provisioning
- [ ] Verify all 10 steps complete successfully
- [ ] Save connection string output (keep secret!)
- [ ] Save SWA hostname output

### Verification
- [ ] Cosmos DB account exists: `az cosmosdb show --name proispro-cosmos --resource-group proispro`
- [ ] Database exists: `az cosmosdb sql database show --account-name proispro-cosmos --resource-group proispro --name discdb`
- [ ] Container exists: `az cosmosdb sql container show --account-name proispro-cosmos --resource-group proispro --database-name discdb --name discs`
- [ ] Static Web App exists: `az staticwebapp show --name proispro-swa --resource-group proispro`
- [ ] SWA hostname retrieved: `az staticwebapp show --name proispro-swa --resource-group proispro --query defaultHostname -o tsv`

---

## 📦 Phase 2: Deploy Data API Builder Config (PENDING AK)

### Commit Config
- [ ] Review `staticwebapp.database.config.json`
- [ ] Commit: `git add staticwebapp.database.config.json DAB_CONFIG.md`
- [ ] Commit: `git commit -m "Add Data API Builder config for Cosmos DB integration"`
- [ ] Push: `git push origin main`

### Verify Deployment
- [ ] Check GitHub Actions: `gh run watch`
- [ ] Wait for Azure SWA workflow completion (~2 min)
- [ ] Verify deployment succeeded: `gh run view --log`

### Test API
- [ ] Get SWA hostname: `$hostname = az staticwebapp show --name proispro-swa --resource-group proispro --query defaultHostname -o tsv`
- [ ] Test health: `curl https://$hostname`
- [ ] Test API: `curl https://$hostname/api/Disc`
- [ ] Expected: `200 OK` or `[]` (empty array)

---

## 💾 Phase 3: Data Migration (PENDING LINUS/DANNY)

### Export Current Data
- [ ] Locate current disc data source (localStorage or GitHub discs.json)
- [ ] Export to JSON file
- [ ] Validate schema matches Cosmos DB schema

### Import to Cosmos DB
Option A: Via Azure Portal Data Explorer
- [ ] Open Cosmos DB in Azure portal
- [ ] Navigate to Data Explorer → discdb → discs
- [ ] Click "New Item" for each disc (or bulk import)

Option B: Via Data API Builder
- [ ] Use POST `/api/Disc` for each disc
- [ ] Verify partition key `/manufacturer` populated
- [ ] Check inserted records in Azure portal

Option C: Via Azure CLI
- [ ] Use `az cosmosdb sql container create` with bulk import
- [ ] Requires JSON array format

### Verification
- [ ] Query API: `curl https://$hostname/api/Disc`
- [ ] Verify all discs returned
- [ ] Verify manufacturer field populated (partition key)
- [ ] Test filtering by manufacturer

---

## 🎨 Phase 4: Update App Code (PENDING DANNY)

### Replace GitHub API with Data API Builder
- [ ] Update `app.js`: Remove GitHub API functions
- [ ] Update `app.js`: Add Data API Builder functions
- [ ] Update `loadDiscs()`: `GET /api/Disc`
- [ ] Update `addDisc()`: `POST /api/Disc`
- [ ] Update `editDisc()`: `PATCH /api/Disc/id/{id}`
- [ ] Update `deleteDisc()`: `DELETE /api/Disc/id/{id}`

### Remove GitHub PAT Requirements
- [ ] Remove PAT input from Settings modal
- [ ] Remove PAT storage in localStorage
- [ ] Update settings UI to reflect no GitHub auth needed

### Local Testing
- [ ] Test CRUD operations locally
- [ ] Verify localStorage still works for offline-first
- [ ] Verify sync to Cosmos DB works
- [ ] Test error handling (network failures, etc.)

### Commit Changes
- [ ] `git add app.js`
- [ ] `git commit -m "Migrate from GitHub API to Data API Builder (Cosmos DB)"`
- [ ] `git push origin main`

---

## 🌐 Phase 5: DNS Cutover (PENDING AK)

### Pre-Cutover Testing
- [ ] Test full app at staging URL: `https://<swa-hostname>`
- [ ] Verify all features work (add/edit/delete/filter)
- [ ] Verify HTTPS certificate valid
- [ ] Verify API endpoints respond correctly

### Configure Custom Domain in Azure
- [ ] Azure Portal → Static Web Apps → Custom domains
- [ ] Add custom domain: `proispro.com`
- [ ] Get validation CNAME/TXT record
- [ ] Add validation record to DNS
- [ ] Wait for validation (~5-10 min)
- [ ] Enable HTTPS (automatic)

### Update DNS CNAME
- [ ] Update CNAME record:
  - Host: `proispro.com` (or `@`)
  - Type: `CNAME`
  - Value: `<swa-hostname-from-step-10>`
  - TTL: `3600`
- [ ] Wait for DNS propagation (~5-30 min)

### Verification
- [ ] `nslookup proispro.com` → Should resolve to Azure SWA
- [ ] `curl -I https://proispro.com` → Should return 200 OK
- [ ] Open `https://proispro.com` in browser
- [ ] Verify HTTPS certificate valid (Let's Encrypt via Azure)
- [ ] Test full app functionality

---

## 🧹 Phase 6: Cleanup (OPTIONAL)

### Archive GitHub Pages Deployment
- [ ] Verify Azure SWA fully operational
- [ ] Disable GitHub Pages: Settings → Pages → Source: None
- [ ] Archive workflow: `git mv .github/workflows/deploy.yml .github/workflows/deploy.yml.archive`
- [ ] Commit: `git commit -m "Archive GitHub Pages workflow (migrated to Azure SWA)"`
- [ ] Push: `git push origin main`

### Remove Old DNS Records (if applicable)
- [ ] Remove old GitHub Pages A records (if used A records instead of CNAME)
- [ ] Keep CNAME pointing to Azure SWA

### Optional: Remove CNAME file
- [ ] Azure SWA doesn't require `CNAME` file in repo (configured in portal)
- [ ] Can delete `CNAME` file if desired
- [ ] Or keep it (doesn't hurt)

---

## 📊 Phase 7: Post-Migration Validation

### Functional Testing
- [ ] Add new disc via UI → Verify appears in list
- [ ] Edit disc → Verify changes saved
- [ ] Delete disc → Verify removed from list
- [ ] Filter by type → Verify filtering works
- [ ] Filter by manufacturer → Verify partition key query efficient
- [ ] Test on mobile device → Verify responsive design

### Performance Testing
- [ ] Check page load time (should be <2s)
- [ ] Check API response time (should be <500ms)
- [ ] Check offline functionality (localStorage still works)

### Security Testing
- [ ] Verify no GitHub PAT in localStorage
- [ ] Verify HTTPS enforced
- [ ] Verify connection string not exposed in client
- [ ] Verify CORS configured correctly

### Monitoring Setup
- [ ] Enable Application Insights (optional, costs money)
- [ ] Set up cost alerts in Azure portal
- [ ] Monitor Cosmos DB RU consumption
- [ ] Monitor SWA bandwidth usage

---

## 🆘 Rollback Plan (If Needed)

### Immediate Rollback (DNS only)
- [ ] Revert DNS CNAME to GitHub Pages: `<username>.github.io`
- [ ] Wait for DNS propagation (~5-30 min)
- [ ] Verify GitHub Pages still live

### Full Rollback (Delete Azure Resources)
- [ ] Delete Static Web App: `az staticwebapp delete --name proispro-swa --resource-group proispro --yes`
- [ ] Delete Cosmos DB: `az cosmosdb delete --name proispro-cosmos --resource-group proispro --yes`
- [ ] Revert app.js to use GitHub API
- [ ] Re-enable `.github/workflows/deploy.yml`

---

## 📈 Success Metrics

- [ ] Zero downtime during migration
- [ ] All disc data migrated successfully
- [ ] HTTPS enabled and working
- [ ] Page load time ≤ 2 seconds
- [ ] API response time ≤ 500ms
- [ ] Monthly cost ≤ $1
- [ ] No GitHub PAT security risk

---

## 📞 Support Contacts

- **Azure Infrastructure:** Linus (DevOps)
- **App Code Updates:** Danny (Lead)
- **DNS/Domain:** AK (Owner)
- **Azure Portal Access:** AK (Subscription Owner)

---

## 📚 Documentation Index

| File | Purpose |
|------|---------|
| `azure-infra-setup.ps1` | Automated infrastructure provisioning script |
| `AZURE_SETUP.md` | Quick start guide and troubleshooting |
| `INFRASTRUCTURE.md` | Architecture documentation and reference |
| `staticwebapp.database.config.json` | Data API Builder configuration |
| `DAB_CONFIG.md` | API endpoint documentation |
| `DEPLOYMENT_STATUS.md` | Current status report |
| `DEPLOYMENT_WORKFLOW_TRANSITION.md` | GitHub Actions workflow migration plan |
| `.squad/decisions/inbox/linus-azure-infra.md` | Architecture decision record |
| `.squad/agents/linus/history.md` | Linus work history and learnings |
| `AZURE_MIGRATION_CHECKLIST.md` | This file |

---

**Current Phase:** Phase 1 (Infrastructure Provisioning)  
**Blocked By:** Azure CLI authentication (`az login`)  
**Next Action:** AK runs `az login` and executes `.\azure-infra-setup.ps1`  
**Estimated Time to Production:** ~2-3 hours total across all phases  

---

Last Updated: 2026-04-14 by Linus
