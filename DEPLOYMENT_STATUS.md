# Azure Infrastructure Setup — Status Report

**Prepared by:** Linus (DevOps)  
**Date:** 2026-04-14  
**Status:** ⏸️ Pending Manual Execution  

---

## 🎯 Objective

Migrate ProIsPro from GitHub Pages + GitHub API backend to Azure Static Web Apps + Cosmos DB NoSQL.

## ❌ Blocker: Azure CLI Authentication Required

**Issue:** Azure CLI session expired (token inactive for 90 days)

**Required action:**
```powershell
az login
```

This will open a browser for interactive authentication. Once authenticated, the setup script can proceed.

---

## ✅ Deliverables Created

I've prepared the complete infrastructure setup, ready to execute once you authenticate:

### 1. **azure-infra-setup.ps1** — Automated Infrastructure Provisioning
   - 10-step automated setup script
   - Creates all Azure resources (Cosmos DB + Static Web App)
   - Auto-detects free tier availability
   - Handles fallback to Serverless if free tier exhausted
   - Colored output with status indicators
   - **Duration:** ~5-10 minutes

### 2. **AZURE_SETUP.md** — Quick Start Guide
   - Prerequisites checklist
   - One-command execution
   - Post-deployment steps
   - Troubleshooting guide
   - Rollback procedures

### 3. **INFRASTRUCTURE.md** — Architecture Documentation
   - System architecture diagram
   - Resource inventory
   - Security considerations
   - Cost estimates (<$1/month)
   - Monitoring commands

### 4. **staticwebapp.database.config.json** — Data API Builder Config
   - REST API endpoint configuration
   - Maps `/api/Disc/*` to Cosmos DB
   - CRUD operations enabled
   - Anonymous access (for MVP)
   - Ready to commit and deploy

### 5. **DAB_CONFIG.md** — API Documentation
   - Generated endpoint reference
   - Example requests (GET, POST, PATCH, DELETE)
   - Local testing guide
   - Security recommendations

### 6. **.squad/decisions/inbox/linus-azure-infra.md** — Architecture Decision Record
   - Rationale for Azure SWA + Cosmos DB
   - Migration impact analysis
   - Rollback plan
   - Open questions

---

## 📋 Execution Steps for AK

### Step 1: Authenticate Azure CLI (REQUIRED)

```powershell
az login
```

This opens a browser. Sign in with your Azure account.

### Step 2: Verify Authentication

```powershell
az account show
```

Expected output:
```json
{
  "name": "Test - MVP",
  "id": "70a423f9-c285-4d8b-b264-e0b3ff5f787f",
  ...
}
```

### Step 3: Run Infrastructure Setup

```powershell
cd C:\git\proispro
.\azure-infra-setup.ps1
```

**What happens:**
- ✅ Validates Azure + GitHub CLI authentication
- ✅ Detects resource group region
- ✅ Checks Cosmos DB free tier availability
- ✅ Creates Cosmos DB account, database, container
- ✅ Creates Static Web App
- ✅ Links Cosmos DB to SWA
- ✅ Outputs connection string + SWA hostname

**Duration:** 5-10 minutes (Cosmos DB ~3-5 min, SWA ~2-3 min)

### Step 4: Post-Deployment Actions

After the script completes:

1. **Commit Data API Builder config:**
   ```powershell
   git add staticwebapp.database.config.json
   git commit -m "Add Data API Builder config for Cosmos DB integration"
   git push origin main
   ```

2. **Wait for SWA deployment (~2 min):**
   ```powershell
   gh run watch
   ```

3. **Test REST API:**
   ```powershell
   $hostname = az staticwebapp show --name proispro-swa --resource-group proispro --query defaultHostname -o tsv
   curl "https://$hostname/api/Disc"
   ```

4. **Update app.js** (Danny's task):
   - Replace GitHub API calls with Data API Builder endpoints
   - Remove GitHub PAT from localStorage
   - Test CRUD operations locally

5. **Update DNS CNAME** (after testing):
   - Point `proispro.com` to `<swa-hostname>`
   - Enable custom domain in Azure portal
   - HTTPS auto-provisions

---

## 📊 Infrastructure Summary (Post-Deployment)

| Resource | Name | Purpose | Cost |
|----------|------|---------|------|
| Cosmos DB Account | `proispro-cosmos` | NoSQL database | Free tier or ~$0.25/month |
| Database | `discdb` | Logical database | Included |
| Container | `discs` | Disc collection | Included |
| Static Web App | `proispro-swa` | Hosting + API gateway | Free |
| **Total** | - | - | **<$1/month** |

**Data model:**
- Partition key: `/manufacturer` (optimized for brand queries)
- Schema: Same as current `discs.json` (id, name, manufacturer, type, etc.)

---

## 🔐 Security Notes

- **Connection string:** Stored as encrypted SWA app setting (not in Git)
- **API access:** Currently anonymous (MVP) — recommend auth for production
- **HTTPS:** Automatic via Static Web Apps
- **No PAT:** Removes GitHub token from localStorage (security win!)

---

## 🔄 Migration Path

### Current State (GitHub Pages)
```
User → proispro.com → GitHub Pages → app.js → GitHub API → discs.json
```

### Future State (Azure)
```
User → proispro.com → Azure SWA → app.js → Data API Builder → Cosmos DB
```

**Benefits:**
- No GitHub PAT needed (removes security risk)
- Dedicated database (not a JSON file in Git)
- Auto-generated REST API (no custom backend code)
- Better query performance (partition key indexing)
- Staging environments for PRs (Azure SWA feature)

---

## ⚠️ Known Issues

1. **Azure CLI command compatibility:**
   - `az staticwebapp dbconnection` requires Azure CLI 2.50+
   - Script handles fallback (manual app setting if command unavailable)

2. **Free tier availability:**
   - Only one Cosmos DB free tier per subscription
   - Script auto-detects and uses Serverless if free tier taken
   - Serverless is still very cheap (~$0.25/month at current usage)

3. **SWA deployment time:**
   - Initial deployment takes 2-3 minutes
   - GitHub Actions workflow auto-created by Azure CLI
   - Subsequent deployments ~60 seconds

---

## 📞 Next Steps

1. **AK:** Run `az login` and execute `.\azure-infra-setup.ps1`
2. **Linus:** Verify deployment, test endpoints
3. **Danny:** Update app.js to use Data API Builder endpoints
4. **AK:** Update DNS after testing
5. **Team:** Test end-to-end CRUD flow
6. **AK:** Decommission GitHub API sync (optional)

---

## 📚 Reference Files

- **Setup script:** `azure-infra-setup.ps1`
- **Quick start:** `AZURE_SETUP.md`
- **Architecture:** `INFRASTRUCTURE.md`
- **API config:** `staticwebapp.database.config.json`
- **API docs:** `DAB_CONFIG.md`
- **Decision log:** `.squad/decisions/inbox/linus-azure-infra.md`
- **Linus history:** `.squad/agents/linus/history.md`

---

**Status:** Ready to execute. Waiting for AK to run `az login` + `.\azure-infra-setup.ps1`.

🚀 **Estimated time to production:** ~30 minutes after authentication.
