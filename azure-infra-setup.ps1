# Azure Infrastructure Setup Script for ProIsPro
# Author: Linus (DevOps)
# Date: 2026-04-14
# Description: Creates Azure Static Web Apps + Cosmos DB NoSQL infrastructure

# Configuration
$subscription = "70a423f9-c285-4d8b-b264-e0b3ff5f787f"
$resourceGroup = "proispro"
$cosmosAccount = "proispro-cosmos"
$cosmosDatabase = "discdb"
$cosmosContainer = "discs"
$staticWebApp = "proispro-swa"
$gitHubRepo = "https://github.com/Anders-Kristiansen/proispro"
$gitHubOwner = "Anders-Kristiansen"
$gitHubRepoName = "proispro"
$branch = "main"

# Color output helpers
function Write-Step {
    param($step, $message)
    Write-Host "`n[$step] $message" -ForegroundColor Cyan
}

function Write-Success {
    param($message)
    Write-Host "✅ $message" -ForegroundColor Green
}

function Write-Error {
    param($message)
    Write-Host "❌ $message" -ForegroundColor Red
}

function Write-Info {
    param($message)
    Write-Host "ℹ️  $message" -ForegroundColor Yellow
}

# Check prerequisites
Write-Step "Prerequisites" "Checking Azure CLI and GitHub CLI authentication..."

$azAccount = az account show 2>&1 | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
    Write-Error "Azure CLI not authenticated. Run: az login"
    exit 1
}
Write-Success "Azure CLI authenticated as $($azAccount.user.name)"

$ghUser = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "GitHub CLI not authenticated. Run: gh auth login"
    exit 1
}
Write-Success "GitHub CLI authenticated"

# Step 1: Get resource group region
Write-Step "Step 1" "Getting resource group region..."
$region = az group show --name $resourceGroup --subscription $subscription --query location -o tsv
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to get resource group region"
    exit 1
}
Write-Success "Resource group region: $region"

# Step 2: Check if Cosmos DB free tier is available
Write-Step "Step 2" "Checking Cosmos DB free tier availability..."
$freeTierAccounts = az cosmosdb list --subscription $subscription --query "[?enableFreeTier==\`true\`].name" -o tsv
if ($freeTierAccounts) {
    Write-Info "Free tier already used by: $freeTierAccounts"
    Write-Info "Will use Serverless instead (pay-per-request, very cheap)"
    $useFreeTier = $false
} else {
    Write-Success "Free tier available!"
    $useFreeTier = $true
}

# Step 3: Create Cosmos DB account
Write-Step "Step 3" "Creating Cosmos DB account: $cosmosAccount..."
if ($useFreeTier) {
    Write-Info "Using Free Tier (1000 RU/s + 25GB free)"
    az cosmosdb create `
        --name $cosmosAccount `
        --resource-group $resourceGroup `
        --subscription $subscription `
        --kind GlobalDocumentDB `
        --enable-free-tier true `
        --default-consistency-level Session `
        --locations regionName=$region failoverPriority=0 isZoneRedundant=False
} else {
    Write-Info "Using Serverless (pay-per-request)"
    az cosmosdb create `
        --name $cosmosAccount `
        --resource-group $resourceGroup `
        --subscription $subscription `
        --kind GlobalDocumentDB `
        --default-consistency-level Session `
        --locations regionName=$region failoverPriority=0 isZoneRedundant=False `
        --capabilities EnableServerless
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create Cosmos DB account"
    exit 1
}
Write-Success "Cosmos DB account created: $cosmosAccount"

# Step 4: Create Cosmos DB database
Write-Step "Step 4" "Creating database: $cosmosDatabase..."
az cosmosdb sql database create `
    --account-name $cosmosAccount `
    --resource-group $resourceGroup `
    --subscription $subscription `
    --name $cosmosDatabase

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create database"
    exit 1
}
Write-Success "Database created: $cosmosDatabase"

# Step 5: Create Cosmos DB container
Write-Step "Step 5" "Creating container: $cosmosContainer (partition key: /manufacturer)..."
az cosmosdb sql container create `
    --account-name $cosmosAccount `
    --resource-group $resourceGroup `
    --subscription $subscription `
    --database-name $cosmosDatabase `
    --name $cosmosContainer `
    --partition-key-path "/manufacturer"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create container"
    exit 1
}
Write-Success "Container created: $cosmosContainer"

# Step 6: Get Cosmos DB connection string
Write-Step "Step 6" "Retrieving Cosmos DB connection string..."
$connectionString = az cosmosdb keys list `
    --name $cosmosAccount `
    --resource-group $resourceGroup `
    --subscription $subscription `
    --type connection-strings `
    --query "connectionStrings[0].connectionString" -o tsv

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to get connection string"
    exit 1
}
Write-Success "Connection string retrieved (length: $($connectionString.Length) chars)"

# Step 7: Get GitHub token
Write-Step "Step 7" "Getting GitHub token..."
$githubToken = gh auth token
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to get GitHub token"
    exit 1
}
Write-Success "GitHub token retrieved"

# Step 8: Create Static Web Apps resource
Write-Step "Step 8" "Creating Static Web App: $staticWebApp..."
Write-Info "This may take 2-3 minutes..."

# Determine best region for SWA (westeurope is closest to common EU regions)
$swaRegion = "westeurope"
if ($region -like "*us*") {
    $swaRegion = "eastus2"
}

az staticwebapp create `
    --name $staticWebApp `
    --resource-group $resourceGroup `
    --subscription $subscription `
    --source $gitHubRepo `
    --location $swaRegion `
    --branch $branch `
    --app-location "/" `
    --output-location "" `
    --token $githubToken

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create Static Web App"
    exit 1
}
Write-Success "Static Web App created: $staticWebApp"

# Step 9: Link Cosmos DB to Static Web Apps
Write-Step "Step 9" "Linking Cosmos DB to Static Web App..."
Write-Info "Attempting to use 'az staticwebapp dbconnection create'..."

$dbResourceId = "/subscriptions/$subscription/resourceGroups/$resourceGroup/providers/Microsoft.DocumentDB/databaseAccounts/$cosmosAccount"

az staticwebapp dbconnection create `
    --name $staticWebApp `
    --resource-group $resourceGroup `
    --subscription $subscription `
    --db-resource-id $dbResourceId `
    --db-name $cosmosDatabase `
    --environment default 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Info "Command 'az staticwebapp dbconnection' not available (requires Azure CLI 2.50+)"
    Write-Info "Alternative: Set connection string as SWA app setting manually"
    Write-Info ""
    Write-Info "Run this command to set the connection string:"
    Write-Host "az staticwebapp appsettings set --name $staticWebApp --resource-group $resourceGroup --setting-names COSMOS_CONNECTION_STRING='<connection-string>'" -ForegroundColor Gray
} else {
    Write-Success "Database connection configured"
}

# Step 10: Get SWA hostname
Write-Step "Step 10" "Getting Static Web App hostname..."
$swaHostname = az staticwebapp show `
    --name $staticWebApp `
    --resource-group $resourceGroup `
    --subscription $subscription `
    --query defaultHostname -o tsv

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to get SWA hostname"
    exit 1
}
Write-Success "Static Web App hostname: $swaHostname"

# Summary
Write-Host "`n" + ("="*80) -ForegroundColor Magenta
Write-Host "DEPLOYMENT SUMMARY" -ForegroundColor Magenta
Write-Host ("="*80) -ForegroundColor Magenta

Write-Host "`n✅ COSMOS DB:" -ForegroundColor Green
Write-Host "   Account:    $cosmosAccount" -ForegroundColor White
Write-Host "   Database:   $cosmosDatabase" -ForegroundColor White
Write-Host "   Container:  $cosmosContainer" -ForegroundColor White
Write-Host "   Partition:  /manufacturer" -ForegroundColor White
Write-Host "   Tier:       $(if ($useFreeTier) {'Free Tier (1000 RU/s + 25GB)'} else {'Serverless (pay-per-request)'})" -ForegroundColor White
Write-Host "   Region:     $region" -ForegroundColor White

$cosmosEndpoint = az cosmosdb show --name $cosmosAccount --resource-group $resourceGroup --subscription $subscription --query documentEndpoint -o tsv
Write-Host "   Endpoint:   $cosmosEndpoint" -ForegroundColor Cyan

Write-Host "`n✅ STATIC WEB APP:" -ForegroundColor Green
Write-Host "   Name:       $staticWebApp" -ForegroundColor White
Write-Host "   Region:     $swaRegion" -ForegroundColor White
Write-Host "   Hostname:   https://$swaHostname" -ForegroundColor Cyan
Write-Host "   GitHub:     $gitHubOwner/$gitHubRepoName ($branch)" -ForegroundColor White

Write-Host "`n🔐 CONNECTION STRING (KEEP SECRET):" -ForegroundColor Yellow
Write-Host $connectionString -ForegroundColor Gray

Write-Host "`n📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "   1. Configure Data API Builder schema (create staticwebapp.database.config.json)" -ForegroundColor White
Write-Host "   2. Update app.js to call /api/discs endpoints" -ForegroundColor White
Write-Host "   3. Test locally: swa start" -ForegroundColor White
Write-Host "   4. Migrate disc data from GitHub to Cosmos DB" -ForegroundColor White
Write-Host "   5. Update DNS CNAME from *.github.io to $swaHostname" -ForegroundColor White
Write-Host "   6. Test production: https://$swaHostname" -ForegroundColor White

Write-Host "`n" + ("="*80) -ForegroundColor Magenta
