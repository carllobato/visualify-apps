# Supabase & platform env (local + Vercel)

The app saves risks to **Supabase** when you click the header **Save** button. This is the same in local development and on Vercel: there is no "local-only" mode. For Save to work you need Supabase env vars set in both places.

## Canonical URL env (platform)

RiskAI serves **two hosts** in production (app + marketing). Routes are **flat** (e.g. `/dashboard`, not `/riskai/dashboard`). Use these **canonical** names on every Visualify app (RiskAI, HQ, website, template-app):

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_RISKAI_ORIGIN` | `https://app.visualify.com.au` | Authenticated RiskAI app (no trailing slash) |
| `NEXT_PUBLIC_HQ_ORIGIN` | `https://hq.visualify.com.au` | HQ launcher & workspace UI |
| `NEXT_PUBLIC_WEBSITE_ORIGIN` | `https://visualify.com.au` | Marketing site |

**Legacy compatibility** (optional; still read if canonical vars are unset):

| Variable | Replaced by |
|----------|-------------|
| `NEXT_PUBLIC_APP_ORIGIN` | `NEXT_PUBLIC_RISKAI_ORIGIN` |
| `NEXT_PUBLIC_APP_HOST` | hostname derived from `NEXT_PUBLIC_RISKAI_ORIGIN` |
| `NEXT_PUBLIC_WEBSITE_HOST` | hostname derived from `NEXT_PUBLIC_WEBSITE_ORIGIN` |

See `riskai/.env.example` for the full list.

**Supabase Auth redirect URLs** (Dashboard → Authentication → URL configuration) should include:

- `https://<app-host>/auth/confirm**`
- `https://<app-host>/auth/callback**`
- `https://<app-host>/**` (and localhost equivalents for dev)

Invitation emails use the Edge secret `RISKAI_APP_ORIGIN` (same value as `NEXT_PUBLIC_RISKAI_ORIGIN`) — see `website/supabase/NOTIFY_SETUP.md`.

## Local development

1. Create `.env.local` in the **riskai** app directory with:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon/public key
   - **`SUPABASE_SERVICE_ROLE_KEY`** (required for **Settings → Delete account** and **Project team → Send invitation**): copy the **service_role** secret from Supabase → **Project Settings** → **API** → **Project API keys**. Never expose this in client code or `NEXT_PUBLIC_*` vars.
   - **`NEXT_PUBLIC_RISKAI_ORIGIN`** / **`NEXT_PUBLIC_WEBSITE_ORIGIN`** when testing dual-host behaviour (optional on localhost; localhost is treated as the app host).
2. Restart the dev server after adding or changing env vars.
3. If Save fails, check the browser console and the red error message under the Save button (e.g. RLS policy, missing table, or invalid key).
4. **Account profile**: **first name, surname, company** go to **`public.profiles`** (with **`email`** synced on save); **role** (job title) goes to **`user_metadata.role`**. Run **`supabase/migrations/20250322_public_profiles.sql`** in the Supabase **SQL Editor**—see **[supabase-users-table.md](./supabase-users-table.md)** if PostgREST cannot find the table. Until that works, the client fallback may write name fields to **`user_metadata`**.

## Vercel (production)

### 1. Confirm deployment

- Repo is connected to Vercel and deploys from `main`.
- Note your production URL: `https://<your-app>.vercel.app` (custom domains: `app.visualify.com.au`, `visualify.com.au`, etc.).

### 2. Set environment variables in Vercel

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your project.
2. **Settings** → **Environment Variables**.
3. Add (values must match `.env.local`; no extra spaces or quotes):

   | Name | Value | Environments |
   |------|--------|---------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | same as `.env.local` | Production (and Preview if desired) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as `.env.local` | Production (and Preview if desired) |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role secret from Supabase API settings | Production (and Preview if you use delete account or invitations there) |
   | `NEXT_PUBLIC_RISKAI_ORIGIN` | e.g. `https://app.visualify.com.au` | Production (and Preview if desired) |
   | `NEXT_PUBLIC_WEBSITE_ORIGIN` | e.g. `https://visualify.com.au` | Production when marketing host is on this deployment |
   | `NEXT_PUBLIC_HQ_ORIGIN` | e.g. `https://hq.visualify.com.au` | Optional on RiskAI; required on HQ project |
   | `UPSTASH_REDIS_REST_URL` | same as `.env.local` | Production (and Preview if desired) |
   | `UPSTASH_REDIS_REST_TOKEN` | same as `.env.local` | Production (and Preview if desired) |

4. Save. Redeploy so the new vars are applied (see step 3).

### 3. Redeploy

- **Option A:** Vercel → **Deployments** → latest → **⋯** → **Redeploy** (no cache if you want a clean build).
- **Option B:** Push a new commit to `main` to trigger a new deployment.

### 4. Verify

- Open: `https://<your-app>.vercel.app/dev/supabase`
- You should see: **Supabase connected ✅**
- If you see an error: check env vars are set for the right environment (Production / Preview), no spaces or quotes in values, and that you redeployed after changing vars.

## Deliverable (after you verify)

- Confirm the production URL you tested (e.g. “production `/dev/supabase` works”).
- Confirm whether env vars were set for **Production only** or **Production + Preview**.
