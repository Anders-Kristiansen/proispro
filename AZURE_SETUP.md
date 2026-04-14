# Azure Infrastructure Setup — Quick Start

## Prerequisites Check

```powershell
# Check Azure CLI
az account show

# If expired, re-authenticate:
az login

# Check GitHub CLI
gh auth status

# If not authenticated:
gh auth login
```

## Execute Setup

```powershell
# From project root (C:\git\proispro)
.\azure-infra-setup.ps1
```

**Expected duration:** 5-10 minutes (Cosmos DB creation takes ~3-5 min, SWA creation ~2-3 min)

## What Gets Created

| Resource | Name | Purpose |
|----------|------|---------|
| Cosmos DB Account | `proispro-cosmos` | NoSQL database engine |
| Database | `discdb` | Logical database |
| Container | `discs` | Collection for disc data (partition: `/manufacturer`) |
| Static Web App | `proispro-swa` | Hosting + API gateway |

## Post-Deployment

### 1. Test Cosmos DB Access

```powershell
# List containers
az cosmosdb sql container list `
  --account-name proispro-cosmos `
  --resource-group proispro `
  --database-name discdb `
  --query "[].id" -o tsv

# Expected output: discs
```

### 2. Test Static Web App

```powershell
# Get deployment status
az staticwebapp show `
  --name proispro-swa `
  --resource-group proispro `
  --query "{hostname:defaultHostname,status:repositoryToken}" -o table

# Open staging URL
start https://<hostname-from-above>
```

### 3. Configure Data API Builder

Create `staticwebapp.database.config.json` in repo root:

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/latest/download/dab.draft.schema.json",
  "data-source": {
    "database-type": "cosmosdb_nosql",
    "connection-string": "@env('COSMOS_CONNECTION_STRING')",
    "options": {
      "database": "discdb",
      "container": "discs"
    }
  },
  "runtime": {
    "rest": {
      "enabled": true,
      "path": "/api"
    },
    "host": {
      "mode": "production",
      "cors": {
        "origins": ["*"],
        "allow-credentials": false
      }
    }
  },
  "entities": {
    "Disc": {
      "source": "discs",
      "permissions": [
        {
          "role": "anonymous",
          "actions": ["*"]
        }
      ]
    }
  }
}
```

Commit and push — SWA auto-deploys on push.

### 4. Test REST API

```powershell
# List all discs
curl https://<swa-hostname>/api/Disc

# Get disc by id
curl https://<swa-hostname>/api/Disc/id/<disc-id>

# Add disc (POST)
curl -X POST https://<swa-hostname>/api/Disc `
  -H "Content-Type: application/json" `
  -d '{"name":"Destroyer","manufacturer":"Innova","type":"distance"}'
```

### 5. Update DNS

Once tested, update CNAME:

```
Host: proispro.com (or @)
Type: CNAME
Value: <swa-hostname-from-deployment>
TTL: 3600
```

In Azure portal: Custom domains → Add custom domain → Validate → Enable HTTPS

### 6. Update App Code

In `app.js`, replace GitHub API calls with Data API Builder:

```javascript
// Before (GitHub API)
const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
  headers: { Authorization: `token ${pat}` }
});

// After (Data API Builder)
const response = await fetch('/api/Disc', {
  headers: { 'Content-Type': 'application/json' }
});
```

## Troubleshooting

### Azure CLI errors

```powershell
# Clear cache and re-login
az account clear
az login
```

### SWA deployment stuck

```powershell
# Check GitHub Actions workflow
gh run list --repo Anders-Kristiansen/proispro

# View logs
gh run view <run-id> --log
```

### Cosmos DB connection issues

```powershell
# Verify connection string
az cosmosdb keys list `
  --name proispro-cosmos `
  --resource-group proispro `
  --type connection-strings

# Test with Azure portal Data Explorer
start https://portal.azure.com/#resource/subscriptions/70a423f9-c285-4d8b-b264-e0b3ff5f787f/resourceGroups/proispro/providers/Microsoft.DocumentDB/databaseAccounts/proispro-cosmos/dataExplorer
```

## Rollback

If needed to revert to GitHub Pages:

```powershell
# Pause SWA (keeps resources but stops serving)
az staticwebapp update `
  --name proispro-swa `
  --resource-group proispro `
  --no-wait

# Revert DNS CNAME to GitHub Pages
# Update: <username>.github.io

# Re-enable GitHub Pages in repo settings
```

## Cost Monitoring

```powershell
# Check current month usage
az consumption usage list `
  --subscription 70a423f9-c285-4d8b-b264-e0b3ff5f787f `
  --start-date $(Get-Date -Format "yyyy-MM-01") `
  --end-date $(Get-Date -Format "yyyy-MM-dd") `
  --query "[?contains(instanceName, 'proispro')].{Name:instanceName,Cost:pretaxCost}" -o table
```

## Support

- Azure Static Web Apps docs: https://learn.microsoft.com/en-us/azure/static-web-apps/
- Data API Builder docs: https://learn.microsoft.com/en-us/azure/data-api-builder/
- Cosmos DB free tier: https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier
