# Data API Builder Configuration

## Overview

Azure Static Web Apps includes **Data API Builder (DAB)**, which auto-generates REST and GraphQL endpoints from the Cosmos DB NoSQL container. No Azure Functions or custom backend code needed—DAB handles all CRUD operations and query logic.

## Database Setup

- **Database:** `discdb` (Cosmos DB NoSQL, free tier)
- **Container:** `discs`
- **Partition Key:** `/manufacturer`
- **Connection String:** Set `DATABASE_CONNECTION_STRING` environment variable in Azure Static Web App settings

## REST API Endpoints

Once deployed, the following endpoints are available at `/data-api/rest/`:

### List All Discs
```
GET /data-api/rest/Disc
```

Supports OData query parameters:
- `$filter` — Filter results (e.g., `manufacturer eq 'Innova'`)
- `$orderby` — Sort results (e.g., `name asc`, `speed desc`)
- `$top` — Limit results (e.g., `20`)
- `$skip` — Pagination offset (e.g., `40`)

**Examples:**
```
GET /data-api/rest/Disc?$filter=manufacturer eq 'Innova'&$orderby=name
GET /data-api/rest/Disc?$filter=type eq 'Putter'&$top=20
GET /data-api/rest/Disc?$filter=speed ge 10&$orderby=speed desc
GET /data-api/rest/Disc?$filter=discontinued eq false&$top=50
```

### Get Disc by ID
```
GET /data-api/rest/Disc/{id}
```

**Example:**
```
GET /data-api/rest/Disc/innova-destroyer-champion
```

## GraphQL Endpoint

GraphQL introspection is disabled in production for security. The endpoint is available at:

```
POST /data-api/graphql
```

## Permissions

**Read-only access for anonymous users:**
- Only `read` actions are permitted
- No `create`, `update`, or `delete` operations from frontend
- Write operations handled by daily crawler with service credentials

## Schema

See `staticwebapp.database.schema.gql` for the GraphQL schema definition and `sample-disc.json` for an example document structure.

## Disc Document Structure

Each disc document includes:
- **Identity:** `id`, `manufacturer` (partition key), `name`
- **Classification:** `type` (Distance Driver, Fairway Driver, Midrange, Putter)
- **Materials:** `plastic` (array of available plastics)
- **Flight Numbers:** `speed`, `glide`, `turn`, `fade`
- **Physical:** `weightMin`, `weightMax` (in grams)
- **Metadata:** `description`, `imageUrl`, `approved`, `pdgaClass`, `discontinued`
- **Audit:** `updatedAt` (ISO 8601 timestamp)

## Local Development

Data API Builder can be run locally with the DAB CLI:

```bash
# Install DAB CLI
dotnet tool install -g Microsoft.DataApiBuilder

# Run local instance (requires local Cosmos DB emulator or connection string)
dab start --config staticwebapp.database.config.json
```

Endpoints will be available at `http://localhost:5000/data-api/`.

## Deployment

The configuration files in this directory are automatically picked up by Azure Static Web Apps when:
1. `swa-db-connections/` folder exists in repo root
2. `staticwebapp.database.config.json` and `staticwebapp.database.schema.gql` are present
3. `DATABASE_CONNECTION_STRING` environment variable is set in Azure portal

No additional deployment steps required—SWA handles DAB provisioning automatically.
