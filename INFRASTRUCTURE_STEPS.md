# Infrastructure Setup Steps — Detailed Status

**By:** Linus (DevOps)  
**Date:** 2026-04-14  
**Overall Status:** ⏸️ Blocked on Azure CLI Authentication  

---

## Step-by-Step Status

### ✅ Prerequisites Check
**Status:** Partially Complete  
**Details:**
- ✅ Azure CLI installed and available
- ✅ GitHub CLI authenticated (`gh auth status` → OK)
- ❌ Azure CLI session expired (inactive 90 days)
- ❌ Requires interactive login: `az login`

**Next Action:** AK must run `az login` to authenticate with Azure

---

### ⏸️ Step 1: Check Resource Group Region
**Command:**
```powershell
az group show --name proispro --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f --query location -o tsv
```

**Expected Output:** `northeurope` or `westeurope` (or other region)

**Status:** PENDING (blocked by authentication)

**Purpose:** Detect RG region to create Cosmos DB in same region (reduces latency)

---

### ⏸️ Step 2: Check Cosmos DB Free Tier Availability
**Command:**
```powershell
az cosmosdb list --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f --query "[?enableFreeTier==\`true\`].name" -o tsv
```

**Expected Output:** 
- Empty (free tier available) → Use `--enable-free-tier true`
- Account name (free tier used) → Use `--capabilities EnableServerless`

**Status:** PENDING (blocked by authentication)

**Purpose:** Determine if we can use free tier (1000 RU/s + 25GB free) or must use Serverless

**Note:** Cannot combine `--enable-free-tier` with `--capabilities EnableServerless` (mutually exclusive)

---

### ⏸️ Step 3: Create Cosmos DB Account
**Command (if free tier available):**
```powershell
az cosmosdb create \
  --name proispro-cosmos \
  --resource-group proispro \
  --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f \
  --kind GlobalDocumentDB \
  --enable-free-tier true \
  --default-consistency-level Session \
  --locations regionName=<region-from-step1> failoverPriority=0 isZoneRedundant=False
```

**Command (if free tier used):**
```powershell
az cosmosdb create \
  --name proispro-cosmos \
  --resource-group proispro \
  --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f \
  --kind GlobalDocumentDB \
  --default-consistency-level Session \
  --locations regionName=<region-from-step1> failoverPriority=0 isZoneRedundant=False \
  --capabilities EnableServerless
```

**Expected Duration:** 3-5 minutes

**Status:** PENDING (blocked by authentication)

**Purpose:** Create managed Cosmos DB account for NoSQL storage

**Output:** Account endpoint URL (e.g., `https://proispro-cosmos.documents.azure.com:443/`)

---

### ⏸️ Step 4: Create Cosmos DB Database
**Command:**
```powershell
az cosmosdb sql database create \
  --account-name proispro-cosmos \
  --resource-group proispro \
  --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f \
  --name discdb
```

**Expected Duration:** 10-30 seconds

**Status:** PENDING (blocked by Step 3)

**Purpose:** Create logical database within Cosmos DB account

**Output:** Database ID confirmation

---

### ⏸️ Step 5: Create Cosmos DB Container
**Command:**
```powershell
az cosmosdb sql container create \
  --account-name proispro-cosmos \
  --resource-group proispro \
  --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f \
  --database-name discdb \
  --name discs \
  --partition-key-path "/manufacturer"
```

**Expected Duration:** 10-30 seconds

**Status:** PENDING (blocked by Step 4)

**Purpose:** Create container (collection) for disc documents with partition key

**Partition Key Rationale:** 
- `/manufacturer` chosen for efficient queries by brand (Innova, Discraft, etc.)
- Common filter in UI (user often searches by brand)
- Good distribution (many manufacturers, prevents hot partitions)

**Output:** Container ID confirmation

---

### ⏸️ Step 6: Get Cosmos DB Connection String
**Command:**
```powershell
az cosmosdb keys list \
  --name proispro-cosmos \
  --resource-group proispro \
  --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv
```

**Expected Output:** 
```
AccountEndpoint=https://proispro-cosmos.documents.azure.com:443/;AccountKey=<long-base64-key>;
```

**Status:** PENDING (blocked by Step 5)

**Purpose:** Retrieve connection string for Data API Builder

**Security:** 
- ⚠️ KEEP SECRET! Do not commit to Git
- Store as encrypted SWA app setting: `COSMOS_CONNECTION_STRING`
- Shown in script output for initial setup only

---

### ⏸️ Step 7: Get GitHub Token
**Command:**
```powershell
gh auth token
```

**Expected Output:** `ghp_<40-character-token>`

**Status:** PENDING (GitHub CLI likely authenticated, but not verified)

**Purpose:** Provide GitHub token to `az staticwebapp create` for auto-workflow setup

**Security:** Token used only by Azure CLI to create GitHub Actions workflow

---

### ⏸️ Step 8: Create Static Web Apps Resource
**Command:**
```powershell
az staticwebapp create \
  --name proispro-swa \
  --resource-group proispro \
  --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f \
  --source https://github.com/Anders-Kristiansen/proispro \
  --location westeurope \
  --branch main \
  --app-location "/" \
  --output-location "" \
  --token <github-token-from-step7>
```

**Expected Duration:** 2-3 minutes

**Status:** PENDING (blocked by Steps 6-7)

**Purpose:** Create Azure Static Web Apps resource and auto-configure GitHub Actions

**What Happens:**
1. Creates SWA resource in Azure
2. Generates random hostname (e.g., `purple-ocean-abc123.azurestaticapps.net`)
3. Creates GitHub Actions workflow file (`.github/workflows/azure-static-web-apps-<id>.yml`)
4. Commits workflow to repo via GitHub API
5. Triggers initial deployment

**Region:** Using `westeurope` (common European region) or `eastus2` (if US-based RG)

**Output:** 
- SWA resource ID
- Default hostname
- Deployment token (secret, stored in GitHub repo secrets)

---

### ⏸️ Step 9: Link Cosmos DB to Static Web Apps
**Command:**
```powershell
az staticwebapp dbconnection create \
  --name proispro-swa \
  --resource-group proispro \
  --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f \
  --db-resource-id "/subscriptions/70a423f9-c285-4d8b-b264-e0b3ff5f787f/resourceGroups/proispro/providers/Microsoft.DocumentDB/databaseAccounts/proispro-cosmos" \
  --db-name discdb \
  --environment default
```

**Expected Duration:** 10-30 seconds

**Status:** PENDING (blocked by Steps 5, 8)

**Purpose:** Configure SWA to use Cosmos DB for Data API Builder

**Fallback:** If command not available (requires Azure CLI 2.50+):
```powershell
az staticwebapp appsettings set \
  --name proispro-swa \
  --resource-group proispro \
  --setting-names COSMOS_CONNECTION_STRING='<connection-string-from-step6>'
```

**Output:** Database connection confirmation

---

### ⏸️ Step 10: Get SWA Hostname
**Command:**
```powershell
az staticwebapp show \
  --name proispro-swa \
  --resource-group proispro \
  --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f \
  --query defaultHostname -o tsv
```

**Expected Output:** `purple-ocean-abc123.azurestaticapps.net`

**Status:** PENDING (blocked by Step 8)

**Purpose:** Retrieve SWA hostname for testing and DNS configuration

**Next Steps After Retrieval:**
1. Test site at `https://<hostname>`
2. Configure custom domain `proispro.com` in Azure portal
3. Update DNS CNAME to point to hostname

---

## Summary Dashboard

| Step | Command | Status | Duration | Blocked By |
|------|---------|--------|----------|------------|
| Pre | Azure CLI auth | ❌ BLOCKED | N/A | User action required |
| 1 | Get RG region | ⏸️ PENDING | 5s | Pre |
| 2 | Check free tier | ⏸️ PENDING | 5s | Pre |
| 3 | Create Cosmos DB | ⏸️ PENDING | 3-5 min | Pre, 1, 2 |
| 4 | Create database | ⏸️ PENDING | 10-30s | 3 |
| 5 | Create container | ⏸️ PENDING | 10-30s | 4 |
| 6 | Get connection string | ⏸️ PENDING | 5s | 5 |
| 7 | Get GitHub token | ⏸️ PENDING | 5s | Pre |
| 8 | Create SWA | ⏸️ PENDING | 2-3 min | 7 |
| 9 | Link DB to SWA | ⏸️ PENDING | 10-30s | 5, 8 |
| 10 | Get SWA hostname | ⏸️ PENDING | 5s | 8 |

**Total Expected Duration:** ~8-12 minutes (after authentication)

**Critical Path:** Pre → 1 → 2 → 3 → 4 → 5 → (6, 7) → 8 → 9 → 10

---

## Automation Status

✅ **FULLY AUTOMATED:** All steps are scripted in `azure-infra-setup.ps1`

**To Execute:**
```powershell
# 1. Authenticate (one-time, manual)
az login

# 2. Run script (fully automated)
.\azure-infra-setup.ps1
```

**Script Features:**
- ✅ Color-coded output (success, error, info)
- ✅ Progress indicators for each step
- ✅ Error handling and validation
- ✅ Auto-detects free tier availability
- ✅ Handles fallback for newer CLI commands
- ✅ Outputs summary with all key information
- ✅ Displays connection string (secret, for setup only)
- ✅ Displays next manual steps

---

## Deliverables Status

| Deliverable | Status | Location |
|-------------|--------|----------|
| Infrastructure script | ✅ COMPLETE | `azure-infra-setup.ps1` |
| Quick start guide | ✅ COMPLETE | `AZURE_SETUP.md` |
| Architecture docs | ✅ COMPLETE | `INFRASTRUCTURE.md` |
| Data API config | ✅ COMPLETE | `staticwebapp.database.config.json` |
| API documentation | ✅ COMPLETE | `DAB_CONFIG.md` |
| Status report | ✅ COMPLETE | `DEPLOYMENT_STATUS.md` |
| Workflow transition plan | ✅ COMPLETE | `DEPLOYMENT_WORKFLOW_TRANSITION.md` |
| Migration checklist | ✅ COMPLETE | `AZURE_MIGRATION_CHECKLIST.md` |
| Step-by-step status | ✅ COMPLETE | `INFRASTRUCTURE_STEPS.md` (this file) |
| Architecture decision | ✅ COMPLETE | `.squad/decisions/inbox/linus-azure-infra.md` |
| Linus history update | ✅ COMPLETE | `.squad/agents/linus/history.md` |

---

## Handoff to AK

**Immediate Action Required:**
```powershell
az login
```

**Then Execute:**
```powershell
cd C:\git\proispro
.\azure-infra-setup.ps1
```

**Expected Outcome:**
- 10 steps complete successfully
- Cosmos DB account + database + container created
- Static Web App created with auto-configured GitHub Actions
- Connection string displayed (save securely!)
- SWA hostname displayed (needed for DNS)

**After Completion:**
- Review `DEPLOYMENT_STATUS.md` for next steps
- Follow `AZURE_MIGRATION_CHECKLIST.md` for full migration
- Coordinate with Danny for app code updates

---

**Last Updated:** 2026-04-14 by Linus  
**Script Version:** 1.0  
**Status:** Ready to execute pending authentication
