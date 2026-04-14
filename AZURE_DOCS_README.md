# Azure Infrastructure — Documentation Index

This directory contains all documentation for the Azure infrastructure migration.

## 🚀 Quick Start (For AK)

**You need to run ONE command to set up everything:**

```powershell
# 1. Authenticate with Azure (opens browser)
az login

# 2. Run the automated setup script
.\azure-infra-setup.ps1
```

That's it! The script takes 8-12 minutes and creates everything automatically.

---

## 📁 Documentation Files

### For Immediate Execution

| File | Purpose | Who Needs It |
|------|---------|--------------|
| **azure-infra-setup.ps1** | 🔥 Main setup script — RUN THIS! | AK (to execute) |
| **DEPLOYMENT_STATUS.md** | Current status + what's blocking | Everyone (overview) |
| **AZURE_SETUP.md** | Quick start + troubleshooting | AK (reference during setup) |

### For Implementation Phase

| File | Purpose | Who Needs It |
|------|---------|--------------|
| **AZURE_MIGRATION_CHECKLIST.md** | Complete migration checklist (7 phases) | Everyone (project plan) |
| **staticwebapp.database.config.json** | Data API Builder config (commit after setup) | AK (to commit) |
| **DAB_CONFIG.md** | API endpoint documentation | Danny (app code updates) |
| **DEPLOYMENT_WORKFLOW_TRANSITION.md** | GitHub Actions workflow migration plan | Linus/AK (deployment) |

### For Reference

| File | Purpose | Who Needs It |
|------|---------|--------------|
| **INFRASTRUCTURE.md** | Architecture overview + cost estimates | Everyone (context) |
| **INFRASTRUCTURE_STEPS.md** | Detailed step-by-step status | Linus (troubleshooting) |
| **.squad/decisions/inbox/linus-azure-infra.md** | Architecture decision record | Team (rationale) |
| **.squad/agents/linus/history.md** | Linus work history + learnings | Linus (personal log) |

---

## 🎯 What Gets Created

When you run `azure-infra-setup.ps1`:

```
Azure Resources (in "proispro" resource group)
│
├── Cosmos DB Account: proispro-cosmos
│   ├── Database: discdb
│   └── Container: discs (partition key: /manufacturer)
│
└── Static Web App: proispro-swa
    ├── Hosting: https://<random-name>.azurestaticapps.net
    ├── Data API Builder: /api/Disc (auto-generated REST API)
    └── GitHub Actions: Auto-configured deployment workflow
```

**Cost:** <$1/month (Free tier + Serverless)

---

## ⚡ Quick Reference

### Check Prerequisites
```powershell
# Azure CLI version (need 2.50+)
az --version

# GitHub CLI authenticated?
gh auth status

# Azure CLI authenticated?
az account show
```

### After Setup Completes
```powershell
# Get SWA hostname
az staticwebapp show --name proispro-swa --resource-group proispro --query defaultHostname -o tsv

# Test site
start https://<hostname-from-above>

# Test API
curl https://<hostname-from-above>/api/Disc
```

### Deploy Data API Config
```powershell
git add staticwebapp.database.config.json DAB_CONFIG.md
git commit -m "Add Data API Builder config for Cosmos DB integration"
git push origin main
```

### Monitor Deployment
```powershell
# Watch GitHub Actions workflow
gh run watch

# Check deployment logs
gh run view --log
```

---

## 🆘 Troubleshooting

### "Azure CLI not authenticated"
```powershell
az login
```

### "GitHub CLI not authenticated"
```powershell
gh auth login
```

### "Free tier already used"
Script will automatically use Serverless instead (still very cheap: ~$0.25/month)

### "Command 'az staticwebapp dbconnection' not found"
Script will show manual fallback command to set connection string as app setting

### Script fails mid-execution
Check `INFRASTRUCTURE_STEPS.md` to see which step failed, then re-run or manually execute remaining steps

---

## 📞 Support

- **Infrastructure/Azure:** Linus (DevOps) — see `.squad/agents/linus/`
- **App Code Updates:** Danny (Lead)
- **Azure Portal Access:** AK (Subscription Owner)

---

## 🔗 Key Links

- **Azure Portal:** https://portal.azure.com
- **Subscription:** 70a423f9-c285-4d8b-b264-e0b3ff5f787f (Test - MVP)
- **Resource Group:** proispro
- **GitHub Repo:** https://github.com/Anders-Kristiansen/proispro

---

## 📋 Next Steps After Setup

See **AZURE_MIGRATION_CHECKLIST.md** for the complete migration plan (7 phases).

**Summary:**
1. ✅ Phase 1: Run `azure-infra-setup.ps1` (you're here!)
2. Phase 2: Commit Data API config
3. Phase 3: Migrate disc data from GitHub to Cosmos DB
4. Phase 4: Update app.js to use Data API Builder endpoints
5. Phase 5: Update DNS CNAME to point to Azure SWA
6. Phase 6: Clean up GitHub Pages deployment
7. Phase 7: Validate and monitor

**Estimated Total Time:** 2-3 hours across all phases

---

**Status:** Ready to execute. Run `az login` and then `.\azure-infra-setup.ps1`

🚀 **Let's ship it!**
