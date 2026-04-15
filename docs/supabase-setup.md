# Supabase Setup Guide — ProIsPro

This guide walks you through setting up Supabase as the backend for ProIsPro.

---

## 1. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and sign in (GitHub account works).
2. Click **New Project**.
3. Name it `proispro`, choose your region (e.g., West Europe), set a database password.
4. Wait ~2 minutes for provisioning.
5. Once ready, go to **Settings → API** and note:
   - **Project URL** — e.g., `https://abcdefg.supabase.co`
   - **anon public key** — a long `eyJ...` string

---

## 2. Create the `discs` Table

1. In your Supabase dashboard, go to **SQL Editor**.
2. Paste the contents of [`docs/migration-sql.sql`](./migration-sql.sql) and click **Run**.

This creates:
- The `discs` table with all required columns
- An index on `user_id` for fast queries
- Row-Level Security (RLS) policies so users can only access their own discs

---

## 3. Enable GitHub OAuth

### 3a. Create a GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**.
2. Fill in:
   - **Application name:** `ProIsPro`
   - **Homepage URL:** `https://proispro.com` (or your domain)
   - **Authorization callback URL:** `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
     - Replace `<YOUR_PROJECT_REF>` with your Supabase project ref (the subdomain from your Project URL)
3. Click **Register application**.
4. Note the **Client ID**.
5. Click **Generate a new client secret** and copy the **Client Secret**.

### 3b. Configure GitHub Provider in Supabase

1. In Supabase dashboard, go to **Authentication → Providers**.
2. Find **GitHub** and toggle it **ON**.
3. Paste your **Client ID** and **Client Secret**.
4. Click **Save**.

### 3c. Set Redirect URL

1. In Supabase dashboard, go to **Authentication → URL Configuration**.
2. Add your site URL to **Site URL**: `https://proispro.com` (or your GitHub Pages URL).
3. Add to **Redirect URLs**: `https://proispro.com` (must match `redirectTo` in app.js).

---

## 4. Connect the Frontend

Open `app.js` and replace the placeholder values at the top:

```javascript
const SUPABASE_URL  = 'https://abcdefg.supabase.co';  // Your Project URL
const SUPABASE_ANON = 'eyJhbGci...';                   // Your anon public key
```

That's it! The app will now:
- Show a "Sign in with GitHub" button
- After login, load/save discs from your Supabase PostgreSQL database
- Fall back to localStorage if Supabase is unreachable

---

## 5. Deploy to GitHub Pages

1. Push your code to the `main` branch.
2. In your repo, go to **Settings → Pages**.
3. Set source to **Deploy from a branch** → `main` → `/ (root)`.
4. Your site will be live at `https://<username>.github.io/<repo>/` (or your custom domain).

---

## Troubleshooting

- **"Supabase not configured" toast:** You haven't replaced the placeholder values in `app.js`.
- **Login redirects but nothing happens:** Check that your Supabase redirect URL matches your site URL exactly.
- **Discs don't load after login:** Make sure you ran the SQL migration (step 2) and RLS is enabled.
- **CORS errors:** Supabase handles CORS automatically for the JS client. If you see errors, check your Project URL is correct.

---

## Local Development

Without Supabase configured, the app runs in **localStorage-only mode** — all data stays in the browser. This is great for local development and testing.
