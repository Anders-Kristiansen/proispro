# Data API Builder Configuration

This file configures the Data API Builder (DAB) that's built into Azure Static Web Apps. It auto-generates REST API endpoints from your Cosmos DB schema.

## What This File Does

- **Connects to Cosmos DB:** Uses the `COSMOS_CONNECTION_STRING` environment variable (set in SWA app settings)
- **Exposes REST API:** All endpoints available at `/api/Disc/*`
- **Enables CRUD:** Allows anonymous read, create, update, delete operations on disc records

## Generated Endpoints

### List all discs
```
GET /api/Disc
```

### Get disc by ID
```
GET /api/Disc/id/{disc-id}
```

### Create disc
```
POST /api/Disc
Content-Type: application/json

{
  "name": "Destroyer",
  "manufacturer": "Innova",
  "type": "distance",
  "plastic": "Star",
  "weight": 175,
  "color": "Red",
  "condition": "good",
  "flight": "12 / 5 / -1 / 3",
  "notes": "Favorite hyzer flip disc"
}
```

### Update disc
```
PATCH /api/Disc/id/{disc-id}
Content-Type: application/json

{
  "condition": "fair",
  "notes": "Lost some stability"
}
```

### Delete disc
```
DELETE /api/Disc/id/{disc-id}
```

## Security Note

⚠️ **Current configuration allows anonymous access** (`role: "anonymous"` with all actions).

For production, consider:
1. Requiring authentication for write operations (create/update/delete)
2. Adding field-level permissions
3. Implementing rate limiting

Example authenticated-only writes:
```json
"permissions": [
  {
    "role": "anonymous",
    "actions": ["read"]
  },
  {
    "role": "authenticated",
    "actions": ["create", "update", "delete"]
  }
]
```

## Testing Locally

1. Install Data API Builder CLI:
   ```powershell
   dotnet tool install -g Microsoft.DataApiBuilder
   ```

2. Set connection string:
   ```powershell
   $env:COSMOS_CONNECTION_STRING = "AccountEndpoint=https://..."
   ```

3. Start local server:
   ```powershell
   dab start --config staticwebapp.database.config.json
   ```

4. Test endpoint:
   ```powershell
   curl http://localhost:5000/api/Disc
   ```

## Deployment

1. Commit this file to repo root
2. Push to GitHub
3. Static Web Apps auto-deploys and picks up the config
4. Endpoints available at `https://<swa-hostname>/api/Disc`

## Schema Mapping

The `mappings` section maps JSON property names to Cosmos DB field names:

```json
{
  "id": "id",              // Unique identifier (required by Cosmos DB)
  "name": "name",          // Disc name (e.g., "Destroyer")
  "manufacturer": "manufacturer", // Partition key (e.g., "Innova")
  "type": "type",          // Disc type: putter, midrange, fairway, distance
  "plastic": "plastic",    // Plastic type (e.g., "Star")
  "weight": "weight",      // Weight in grams
  "color": "color",        // Disc color
  "condition": "condition", // new, good, fair, poor
  "flight": "flight",      // Flight numbers (e.g., "12 / 5 / -1 / 3")
  "notes": "notes",        // User notes
  "addedAt": "addedAt"     // Timestamp when added
}
```

## CORS Configuration

CORS is set to allow all origins (`"*"`). For production, restrict to your domain:

```json
"cors": {
  "origins": ["https://proispro.com"],
  "allow-credentials": false
}
```

## References

- [Data API Builder docs](https://learn.microsoft.com/en-us/azure/data-api-builder/)
- [Static Web Apps database connections](https://learn.microsoft.com/en-us/azure/static-web-apps/database-overview)
- [Configuration reference](https://github.com/Azure/data-api-builder/blob/main/docs/configuration-file.md)
