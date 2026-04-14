# ProIsPro Infrastructure as Code

This directory contains the Infrastructure as Code (IaC) for deploying ProIsPro to Azure.

## Files

- **azure-infra-setup.ps1** — Automated setup script (creates all Azure resources)
- **AZURE_SETUP.md** — Quick start guide and post-deployment steps

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ proispro.com (Custom Domain)                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Azure Static Web Apps (proispro-swa)                        │
│ • CDN-backed hosting                                        │
│ • Auto HTTPS                                                │
│ • GitHub Actions CI/CD                                      │
│ • Built-in Data API Builder                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ /api/Disc/*
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Data API Builder (built into SWA)                           │
│ • Auto-generated REST endpoints                             │
│ • CRUD operations                                           │
│ • Role-based access control                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Cosmos DB NoSQL (proispro-cosmos)                           │
│ • Database: discdb                                          │
│ • Container: discs                                          │
│ • Partition key: /manufacturer                              │
│ • Free tier: 1000 RU/s + 25GB                               │
└─────────────────────────────────────────────────────────────┘
```

## Resources

| Type | Name | SKU | Location |
|------|------|-----|----------|
| Static Web App | proispro-swa | Free | westeurope |
| Cosmos DB Account | proispro-cosmos | Free/Serverless | (auto-detected from RG) |
| Database | discdb | - | - |
| Container | discs | - | - |

## Prerequisites

1. **Azure CLI** (v2.50+)
   ```powershell
   az --version
   ```

2. **GitHub CLI**
   ```powershell
   gh --version
   ```

3. **Authenticated sessions**
   ```powershell
   az login
   gh auth login
   ```

4. **Azure subscription** with:
   - Contributor access to `proispro` resource group
   - Available Cosmos DB free tier quota (or willing to use Serverless)

## Quick Start

```powershell
# 1. Authenticate
az login
gh auth login

# 2. Run setup script
.\azure-infra-setup.ps1

# 3. Wait 5-10 minutes for provisioning

# 4. Follow post-deployment steps in AZURE_SETUP.md
```

## What the Script Does

1. ✅ Validates Azure CLI + GitHub CLI authentication
2. ✅ Detects resource group region
3. ✅ Checks Cosmos DB free tier availability
4. ✅ Creates Cosmos DB account (free tier or serverless)
5. ✅ Creates database `discdb`
6. ✅ Creates container `discs` with partition key `/manufacturer`
7. ✅ Retrieves Cosmos DB connection string
8. ✅ Retrieves GitHub token
9. ✅ Creates Static Web App `proispro-swa`
10. ✅ Links Cosmos DB to SWA (or shows manual fallback)
11. ✅ Outputs SWA hostname for DNS configuration

## Manual Steps After Script

1. **Configure Data API Builder**
   - Create `staticwebapp.database.config.json`
   - Define REST endpoints for `/api/Disc`
   - Commit and push (auto-deploys)

2. **Update App Code**
   - Replace GitHub API calls with Data API Builder endpoints
   - Remove GitHub PAT from localStorage
   - Test CRUD operations

3. **Configure Custom Domain**
   - Update DNS CNAME to point to SWA hostname
   - Add custom domain in Azure portal
   - Enable HTTPS (automatic)

4. **Migrate Data**
   - Export existing discs from GitHub `discs.json`
   - Import to Cosmos DB via Data API Builder or Azure portal

## Idempotency

The script is **not** fully idempotent:
- If resources exist, some commands will fail
- Safe to re-run for retrieval steps (6, 7, 10)
- Use Azure portal to delete resources before re-running full script

## Security

- **Connection strings** are printed to console (for setup only)
- Store connection string in SWA app settings (encrypted at rest)
- Never commit connection strings to Git
- Use Data API Builder for access control (not direct Cosmos DB access)

## Cost

- **Static Web Apps:** Free tier (100GB bandwidth/month)
- **Cosmos DB Free Tier:** $0 (1000 RU/s + 25GB)
- **Cosmos DB Serverless:** ~$0.25/million requests + $0.25/GB/month

**Estimated monthly cost at current usage:** <$1

## Monitoring

```powershell
# Check SWA deployment status
az staticwebapp show --name proispro-swa --resource-group proispro

# Check Cosmos DB metrics
az cosmosdb show --name proispro-cosmos --resource-group proispro

# View SWA logs (requires app insights)
az monitor app-insights query --app <app-id> --analytics-query "traces | limit 50"
```

## Cleanup

To delete all resources:

```powershell
# Delete Static Web App
az staticwebapp delete --name proispro-swa --resource-group proispro --yes

# Delete Cosmos DB account
az cosmosdb delete --name proispro-cosmos --resource-group proispro --yes

# Note: This does NOT delete the resource group itself
```

## Troubleshooting

See **AZURE_SETUP.md** for detailed troubleshooting steps.

Common issues:
- **Azure CLI auth expired:** Run `az login` again
- **Free tier quota exceeded:** Script auto-falls back to Serverless
- **SWA creation timeout:** Normal, takes 2-3 minutes
- **GitHub token invalid:** Run `gh auth refresh`

## Support

- Linus (DevOps): See `.squad/agents/linus/` for history and charter
- Azure docs: https://learn.microsoft.com/en-us/azure/
- Team decisions: `.squad/decisions.md`
