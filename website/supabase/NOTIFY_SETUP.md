# Notify on insert (`visualify_signup` & `visualify_contact`)

Architecture: **Website → API route → Supabase insert** → **Database Webhook → Edge Function → Resend** (optional).

The Next.js app only validates and writes rows. Email runs **after** the row exists, from Supabase.

---

## 1. Prerequisites (you apply in Supabase)

- Tables **`public.visualify_signup`** and **`public.visualify_contact`** exist (use the SQL migrations under `supabase/migrations/` in this repo if you have not already).
- **No extra migration is required** for webhooks if you create them in the Dashboard (see below). Supabase provisions the underlying `pg_net` trigger when you save a Database Webhook.

---

## 2. Edge Function code (in this repo)

| Path | Purpose |
|------|---------|
| `supabase/functions/notify-on-insert/index.ts` | Handles webhook payload, optional Resend send |

---

## 3. Secrets (Supabase Dashboard → **Edge Functions** → **Secrets**)

Add these **manually** (names must match):

| Secret | Required | Notes |
|--------|----------|--------|
| `WEBHOOK_SECRET` | **Yes** | Long random string. Same value must be sent as `Authorization: Bearer <WEBHOOK_SECRET>` from each webhook. |
| `RESEND_API_KEY` | No | If omitted, the function logs a warning and returns **200** (no email). |
| `CONTACT_FROM_EMAIL` | No | Example: `Visualify <noreply@yourdomain.com>`. Must be allowed in Resend. Default: `Visualify <onboarding@resend.dev>`. |
| `NOTIFY_TO_EMAIL` | No | Inbox for notifications. Default: `help@visualify.com.au`. |

**Resend:** create an API key at [resend.com](https://resend.com). Verify your sending domain (or use Resend’s test sender per their rules).

---

## 4. Deploy the Edge Function (CLI — you run locally)

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli).
2. From the website repo root: `supabase login` (once).
3. Link the repo to your project: `supabase link --project-ref <YOUR_PROJECT_REF>`  
   (`<YOUR_PROJECT_REF>` is the subdomain in `https://<YOUR_PROJECT_REF>.supabase.co`).
4. Deploy **without JWT verification** so Database Webhooks can call the function using only your shared secret:

   ```bash
   supabase functions deploy notify-on-insert --no-verify-jwt
   ```

   **Important:** `--no-verify-jwt` makes the URL public unless `WEBHOOK_SECRET` is set and checked. The function **rejects** requests without `Authorization: Bearer <WEBHOOK_SECRET>`.

**Alternative:** Deploy from **Supabase Dashboard → Edge Functions** (paste or upload `index.ts`), then disable JWT verification for this function in the function’s settings if the dashboard offers it — equivalent to `--no-verify-jwt`.

Your function URL:

```text
https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/notify-on-insert
```

---

## 5. Database Webhooks (Dashboard — you configure)

For **each** table:

1. Open **Database → Webhooks** (or **Integrations → Database Webhooks**, depending on dashboard version).
2. **Create a new webhook**
3. **Name:** e.g. `notify_signup` / `notify_contact`
4. **Table:** `visualify_signup` or `visualify_contact`
5. **Events:** enable **Insert** only (recommended).
6. **HTTP Request**
   - Method: **POST**
   - URL: `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/notify-on-insert`
   - Headers: add  
     - `Content-Type` = `application/json`  
     - `Authorization` = `Bearer <WEBHOOK_SECRET>` (same value as the Edge secret)
7. Save.

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

**Remove** Resend-related variables from the **Next.js** project if you no longer send mail from the API routes:

- Do **not** set `RESEND_API_KEY` or `CONTACT_FROM_EMAIL` on the website (optional cleanup).

**Keep** for the API routes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

---

## 7. Verify end-to-end

1. Insert a test row via your site (early access or contact).
2. Confirm the row in **Table Editor**.
3. **Edge Functions → Logs** for `notify-on-insert`: should show success or a clear warning.
4. If email is configured, check `help@visualify.com.au` (or `NOTIFY_TO_EMAIL`).
5. **Database → Webhooks** (or `net` schema / pg_net docs): inspect delivery if something fails.

---

## 8. SQL (optional, not default)

This setup uses **Dashboard Database Webhooks** so you do not need to run SQL for triggers.  
If you prefer SQL-defined webhooks, see [Database Webhooks](https://supabase.com/docs/guides/database/webhooks) (advanced; must target the correct function URL and headers).

---

## 9. Failure behaviour

- **Missing `RESEND_API_KEY`:** function returns **200**, logs warning — row insert already succeeded.
- **Invalid webhook auth:** **401** — fix `Authorization` header to match `WEBHOOK_SECRET`.
- **Resend API error:** function returns **502** — Supabase may retry the webhook; the row in the database is still there.
