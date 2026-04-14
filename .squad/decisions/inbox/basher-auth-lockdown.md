# Decision: Require Authentication for All Routes and DAB Access

**By:** Basher (Data Wrangler) | **Date:** 2026-04-15 | **Status:** Active  
**Requested by:** AK

---

## Decision

Lock down all access to the proispro app and its data API behind GitHub OAuth authentication. Nothing is publicly accessible without login.

---

## Changes Made

### 1. DAB Config (`swa-db-connections/staticwebapp.database.config.json`)

- **Disc entity permissions:** Changed `"role": "anonymous"` → `"role": "authenticated"`  
  Previously, anyone with the URL could read or write disc data via the GraphQL endpoint. Now DAB enforces that the caller must be an authenticated SWA user.

- **CORS origins:** Changed `["*"]` → `["https://proispro.com"]`  
  The wildcard was acceptable when the data was public-read. Now that the API is authenticated and handles write operations, CORS must be locked to the known production origin.

### 2. SWA Route Config (`staticwebapp.config.json`) — new file

Controls Azure Static Web Apps route-level authentication:

| Route | Allowed Roles | Rationale |
|-------|--------------|-----------|
| `/.auth/*` | `anonymous` | Must remain open — this IS the login endpoint |
| `/api/*` | `authenticated` | Locks any Azure Functions endpoints |
| `/*` | `authenticated` | Entire site gated behind login |

**401 override:** Redirects to `/.auth/login/github` (HTTP 302) instead of returning an error page. Unauthenticated visitors are silently sent to GitHub OAuth login.

---

## Auth Model

1. User hits any route on `proispro.com`
2. SWA checks session cookie — if absent → 401 → redirected to GitHub OAuth
3. User authenticates with GitHub → SWA issues encrypted session cookie
4. Subsequent requests carry session cookie → SWA validates → user has `authenticated` role
5. GraphQL calls to `/data-api/graphql` carry SWA session → DAB validates `authenticated` role → access granted to `Disc` entity

---

## Rationale

- Personal inventory tool — there is no reason for public access
- DAB `anonymous` role was a development convenience, not a production choice
- CORS wildcard was safe when data was read-only public; now that writes are in scope, tighten to known origin
- GitHub OAuth chosen because: (a) AK already has a GitHub account, (b) SWA has built-in GitHub provider (zero config), (c) consistent with existing GitHub-as-backend architecture decision

---

## Trade-offs

- **Pro:** Data is private. No unauthorized reads or writes.
- **Pro:** GitHub OAuth is zero-config for SWA — no separate identity provider needed.
- **Con:** The app is now inaccessible to anyone who doesn't have a GitHub account (acceptable: this is a single-user personal tool).
- **Con:** `/.auth/login/github` redirect may be surprising on first visit — users see a GitHub OAuth screen instead of the app. Expected behavior for this auth model.
