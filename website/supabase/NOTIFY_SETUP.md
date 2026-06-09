# Notify on insert (`visualify_signup`, `visualify_contact`, `visualify_invitations`)

Architecture: **App → API route / server insert → Supabase row** → **Database Webhook → Edge Function → Resend**.

The Next.js apps only validate and write rows. Email runs **after** the row exists, from Supabase.

> **Platform contract:** Cross-app env rules and how Edge secrets align with Vercel — [`docs/environment-variables.md`](../../docs/environment-variables.md) (§6 Edge ↔ Vercel). This doc covers notify-on-insert setup only.

---

## Production setup (summary)

| Component | Configuration |
|-----------|---------------|
| Edge function | `notify-on-insert` deployed with `--no-verify-jwt` |
| Webhooks (INSERT only) | `visualify_signup`, `visualify_contact`, `visualify_invitations` |
| Webhook URL | `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/notify-on-insert` |
| Webhook headers | `Content-Type: application/json` only (no `Authorization` required today) |
| Email provider | Resend via `RESEND_API_KEY` edge secret |

---

## 1. Prerequisites (you apply in Supabase)

- Tables **`public.visualify_signup`**, **`public.visualify_contact`**, and **`public.visualify_invitations`** exist (migrations live under `riskai/supabase/migrations/` and `website/supabase/migrations/` in this monorepo).
- **No extra migration is required** for webhooks if you create them in the Dashboard (see below). Supabase provisions the underlying `pg_net` trigger when you save a Database Webhook.

---

## 2. Edge Function code (in this repo)

| Path | Purpose |
|------|---------|
| `supabase/functions/notify-on-insert/index.ts` | Handles webhook payload, optional Resend send |

**Tables handled:**

| Table | Email recipient | Purpose |
|-------|-----------------|---------|
| `visualify_signup` | `NOTIFY_TO_EMAIL` (internal) | Early-access lead alert |
| `visualify_contact` | `NOTIFY_TO_EMAIL` (internal) | Contact form alert |
| `visualify_invitations` | Invitee email (`record.email`) | Workspace / project / portfolio invite |

Invitation emails use **Visualify HQ** branding for `resource_type = workspace` and **Visualify \| Risk AI** for `project` and `portfolio`.

---

## 3. Secrets (Supabase Dashboard → **Edge Functions** → **Secrets**)

Add these **manually** (names must match):

| Secret | Required | Notes |
|--------|----------|--------|
| `RESEND_API_KEY` | **Yes** (to send mail) | If omitted, the function logs a warning and returns **200** (no email). |
| `CONTACT_FROM_EMAIL` | No | Example: `Visualify <noreply@yourdomain.com>`. Must be allowed in Resend. Default: `Visualify <onboarding@resend.dev>`. |
| `NOTIFY_TO_EMAIL` | No | Inbox for internal notifications. Default: `help@visualify.com.au`. |
| `SUPABASE_URL` | **Yes** (invitations) | Same as project URL (`https://<ref>.supabase.co`). Used to detect existing users for invite copy. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** (invitations) | Service role secret (never expose to the browser). |
| `RISKAI_APP_ORIGIN` | **Yes** (project & portfolio invitations) | RiskAI app origin, no trailing slash — e.g. `https://app.visualify.com.au`. Builds invite links for `resource_type` **project** or **portfolio**. Must match **`NEXT_PUBLIC_RISKAI_ORIGIN`** on the RiskAI Vercel project. |
| `HQ_APP_ORIGIN` | **Yes** (workspace invitations) | HQ app origin, no trailing slash — e.g. `https://hq.visualify.com.au`. Builds invite links for `resource_type` **workspace**. Must match **`NEXT_PUBLIC_HQ_ORIGIN`** on the HQ Vercel project. If unset, workspace invitation emails are skipped (logged). |
| `WEBHOOK_SECRET` | No (not used yet) | Reserved for optional future hardening. The function does **not** check `Authorization` today. |

### Platform URLs (reference)

| Surface | Canonical env (Next.js) | Edge secret (invite links) | Production example |
|---------|-------------------------|----------------------------|-------------------|
| RiskAI app | `NEXT_PUBLIC_RISKAI_ORIGIN` | `RISKAI_APP_ORIGIN` | `https://app.visualify.com.au` |
| HQ | `NEXT_PUBLIC_HQ_ORIGIN` | `HQ_APP_ORIGIN` | `https://hq.visualify.com.au` |
| Marketing | `NEXT_PUBLIC_WEBSITE_ORIGIN` | — | `https://visualify.com.au` |

**Invitation link routing** (`visualify_invitations`, `status = pending`):

| `resource_type` | Origin secret | Example link |
|-----------------|---------------|--------------|
| `workspace` | `HQ_APP_ORIGIN` | `https://hq.visualify.com.au/invite?invite_token=…&invited_email=…&mode=signup` |
| `project`, `portfolio` | `RISKAI_APP_ORIGIN` | `https://app.visualify.com.au/invite?invite_token=…&invited_email=…&mode=login` |

`mode` is `login` when the invited email already exists in Supabase Auth, otherwise `signup`.

**Resend:** create an API key at [resend.com](https://resend.com). Verify your sending domain (or use Resend’s test sender per their rules).

---

## 4. Deploy the Edge Function (CLI — you run locally)

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli).
2. From the **website** app directory: `supabase login` (once).
3. Link the repo to your project: `supabase link --project-ref <YOUR_PROJECT_REF>`  
   (`<YOUR_PROJECT_REF>` is the subdomain in `https://<YOUR_PROJECT_REF>.supabase.co`).
4. Deploy **without JWT verification** so Database Webhooks can call the function:

   ```bash
   supabase functions deploy notify-on-insert --no-verify-jwt
   ```

   **Important:** `--no-verify-jwt` makes the function URL callable without a Supabase JWT. Webhooks today send only `Content-Type: application/json` — no Bearer token is required or validated.

**Alternative:** Deploy from **Supabase Dashboard → Edge Functions** (paste or upload `index.ts`), then disable JWT verification for this function in the function’s settings if the dashboard offers it — equivalent to `--no-verify-jwt`.

Your function URL:

```text
https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/notify-on-insert
```

### Optional future hardening

A future revision may require `Authorization: Bearer <WEBHOOK_SECRET>` when that secret is set on the function. That is **not** active today. If you add it later, set `WEBHOOK_SECRET` as an Edge secret and add the matching header to each Database Webhook.

---

## 5. Database Webhooks (Dashboard — you configure)

Create **three** webhooks (INSERT only), all targeting the same function URL.

For **each** table:

1. Open **Database → Webhooks** (or **Integrations → Database Webhooks**, depending on dashboard version).
2. **Create a new webhook**
3. **Name:** e.g. `notify_signup` / `notify_contact` / `notify_invitations`
4. **Table:** `visualify_signup`, `visualify_contact`, or `visualify_invitations`
5. **Events:** enable **Insert** only (recommended).
6. **HTTP Request**
   - Method: **POST**
   - URL: `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/notify-on-insert`
   - Headers: `Content-Type` = `application/json`
7. Save.

| Webhook name (example) | Table | Trigger |
|------------------------|-------|---------|
| `notify_signup` | `visualify_signup` | INSERT |
| `notify_contact` | `visualify_contact` | INSERT |
| `notify_invitations` | `visualify_invitations` | INSERT |

Webhook **payload** shape (handled by the function):

```json
{
  "type": "INSERT",
  "table": "visualify_signup",
  "schema": "public",
  "record": { "...row columns..." },
  "old_record": null
}
```

---

## 6. Website / hosting env (Vercel, etc.)

**Do not** set `RESEND_API_KEY` or `CONTACT_FROM_EMAIL` on Next.js app projects — email runs from the Edge function after DB insert.

**Keep** for API routes that insert rows:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_RISKAI_ORIGIN` / `NEXT_PUBLIC_HQ_ORIGIN` (app origins; not used directly by notify-on-insert)

HQ and RiskAI create `visualify_invitations` rows via server-side inserts; the **`visualify_invitations` webhook** must exist for invite emails to send.

---

## 7. Verify end-to-end

1. **Early access / contact:** submit a form on the website (or OS contact API).
2. **Invitation:** create a pending invite from HQ (workspace) or RiskAI (project/portfolio).
3. Confirm the row in **Table Editor**.
4. **Edge Functions → Logs** for `notify-on-insert`: success or skip reason.
5. If email is configured, check the recipient inbox (internal for signup/contact; invitee for invitations).
6. **Database → Webhooks:** inspect delivery status if something fails.

**Invitation preview (dev):**  
`GET …/notify-on-insert?preview=visualify_invitations&resource_type=workspace` returns HTML (no auth). Optional `resource_type=workspace` shows HQ branding.

---

## 8. SQL (optional, not default)

This setup uses **Dashboard Database Webhooks** so you do not need to run SQL for triggers.  
If you prefer SQL-defined webhooks, see [Database Webhooks](https://supabase.com/docs/guides/database/webhooks) (advanced; must target the correct function URL and headers).

---

## 9. Failure behaviour

- **Missing `RESEND_API_KEY`:** function returns **200**, logs warning — row insert already succeeded.
- **Missing `HQ_APP_ORIGIN` / `RISKAI_APP_ORIGIN`:** invitation skipped (**200**, logged) — row still exists.
- **Resend API error:** function returns **502** — Supabase may retry the webhook; the row in the database is still there.
