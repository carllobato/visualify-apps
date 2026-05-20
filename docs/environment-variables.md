# Visualify platform — environment variable contract

Operational contract for all Visualify Next.js apps, Vercel projects, and Supabase Edge secrets. **One shared Supabase project** backs every surface.

**Code reference (defaults & resolution):** `packages/urls` (`@visualify/urls`).

**Related setup:** `riskai/docs/vercel-supabase-env.md` (RiskAI deploy), `website/supabase/NOTIFY_SETUP.md` (edge function + webhooks), per-app `.env.example` files.

---

## 1. Canonical production topology

| Surface | Production host | Vercel project | Primary role |
|---------|-----------------|----------------|--------------|
| **Website** | `https://visualify.com.au` | Website | Marketing, early access, contact forms |
| **HQ** | `https://hq.visualify.com.au` | HQ | Customer home base, workspaces, app launcher |
| **RiskAI** | `https://riskai.visualify.com.au` *(target)* | RiskAI | Authenticated risk product |
| **Template App** | Same origin as RiskAI path or dedicated host *(per deploy)* | Optional | Internal / scaffold product |

**Deprecated host:** `https://app.visualify.com.au` — do not use in new env values. Legacy env names and code fallbacks remain until DNS and production cutover are complete; do not remove them yet.

RiskAI may still serve **dual-host** behaviour (app + marketing paths) when both hosts point at one deployment; set `NEXT_PUBLIC_WEBSITE_ORIGIN` on that project when marketing traffic shares the RiskAI deploy.

---

## 2. Shared Supabase rule

All apps that read or write platform data **must** use the **same** Supabase project:

| Variable | Rule |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Identical on HQ, RiskAI, Website, Template App |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Identical everywhere |
| `SUPABASE_SERVICE_ROLE_KEY` | Same project’s `service_role` secret on every server that needs admin APIs |

**Never** expose `SUPABASE_SERVICE_ROLE_KEY` as `NEXT_PUBLIC_*`.

Server-only features that require the service role (examples): account deletion, invitations, early access/contact inserts, workspace admin on HQ.

---

## 3. Required env vars by app

### HQ (`hq/`)

| Variable | Required | Notes |
|----------|:--------:|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Invites, workspace admin, account delete |
| `NEXT_PUBLIC_HQ_ORIGIN` | ✓ | `https://hq.visualify.com.au` |
| `NEXT_PUBLIC_RISKAI_ORIGIN` | ✓ | Launcher / cross-links |
| `NEXT_PUBLIC_WEBSITE_ORIGIN` | Recommended | Legal / marketing links |
| `NEXT_PUBLIC_HQ_APPS_URL` | Optional | Default: `{HQ_ORIGIN}/apps` |
| `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN` | Optional | Only with share flag (see §13) |
| `NEXT_PUBLIC_HQ_SHARE_AUTH_COOKIE_DOMAIN` | Optional | Set to `1` to enable shared cookies |
| `HQ_SUPABASE_AUTH_SYNC_MS` | Optional | Default `15` |
| `HQ_SUPABASE_AUTH_DEBUG` | Optional | `1` = proxy debug logs (dev/staging only) |
| `NEXT_PUBLIC_HQ_AUTH_DISABLED` | **Local only** | Never on Vercel |

### RiskAI (`riskai/`)

| Variable | Required | Notes |
|----------|:--------:|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Invites, delete account, admin flows |
| `OPENAI_API_KEY` | ✓ | AI routes |
| `UPSTASH_REDIS_REST_URL` | ✓ | AI rate limiting (`Redis.fromEnv()`) |
| `UPSTASH_REDIS_REST_TOKEN` | ✓ | |
| `NEXT_PUBLIC_RISKAI_ORIGIN` | ✓ | Live app host (see migration note) |
| `NEXT_PUBLIC_HQ_ORIGIN` | ✓ | Entitlement redirect / cross-nav |
| `NEXT_PUBLIC_WEBSITE_ORIGIN` | ✓ if dual-host | Marketing host on same deploy |
| `NEXT_PUBLIC_VISUALIFY_PRODUCT_KEY` | Optional | Default `riskai`; must match `visualify_products.key` |
| `NEXT_PUBLIC_HQ_APPS_URL` | Optional | No-entitlement redirect target |
| `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN` | Optional | With share flag only |
| `NEXT_PUBLIC_HQ_SHARE_AUTH_COOKIE_DOMAIN` | Optional | `1` to enable shared cookies |
| `SUPABASE_AUTH_COOKIE_SYNC_MS` | Optional | Default `15` |
| `AI_RATE_LIMIT_MAX` | Optional | Default `10` |
| `AI_RATE_LIMIT_WINDOW_SEC` | Optional | Default `600` |
| `NEXT_PUBLIC_RISKAI_ENABLE_SINGLE_SESSION_GUARD` | Optional | **Leave unset** during shared-auth (§13) |
| `NEXT_PUBLIC_RISKAI_ENABLE_APP_SHELL` | Optional | Migration flag; default off |
| `DEV_SKIP_AUTH_GUARD` | **Local only** | Blocked when `VERCEL=1` |
| `PORTFOLIO_INVITE_DEBUG` | Optional | Debug only |

### Website (`website/`)

| Variable | Required | Notes |
|----------|:--------:|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Early access + contact API routes |
| `NEXT_PUBLIC_RISKAI_ORIGIN` | ✓ | Sign-in / CTA links to the app |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Recommended | If client Supabase is added later |

Website does **not** need OpenAI, Upstash, or HQ cookie-sharing flags unless behaviour changes.

### Template App (`template-app/`) / future product apps

| Variable | Required | Notes |
|----------|:--------:|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Same project as HQ/RiskAI |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | |
| `NEXT_PUBLIC_HQ_ORIGIN` | ✓ | |
| `NEXT_PUBLIC_RISKAI_ORIGIN` | ✓ | Cross-links |
| `NEXT_PUBLIC_WEBSITE_ORIGIN` | Recommended | |
| `NEXT_PUBLIC_VISUALIFY_PRODUCT_KEY` | ✓ when entitled | Must match `visualify_products.key` (default `template-app`) |
| `NEXT_PUBLIC_HQ_APPS_URL` | Optional | No-entitlement redirect |
| `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN` | Optional | With share flag only |
| `NEXT_PUBLIC_HQ_SHARE_AUTH_COOKIE_DOMAIN` | Optional | Must match HQ/RiskAI if enabled |
| `SUPABASE_AUTH_COOKIE_SYNC_MS` | Optional | |
| `SUPABASE_AUTH_DEBUG` | Optional | Proxy debug, non-prod |

Add app-specific secrets (e.g. third-party APIs) only on that app’s Vercel project.

---

## 4. Must match across all apps

Set the **same value** on every Vercel project (and locally) that participates in the platform:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Align for correct cross-navigation and emails:

```
NEXT_PUBLIC_HQ_ORIGIN
NEXT_PUBLIC_RISKAI_ORIGIN
NEXT_PUBLIC_WEBSITE_ORIGIN
```

If shared auth cookies are enabled, **every** authenticated app must use the same pair:

```
NEXT_PUBLIC_HQ_SHARE_AUTH_COOKIE_DOMAIN=1
NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN=.visualify.com.au
```

`SUPABASE_SERVICE_ROLE_KEY` must be the **same project** wherever it is set (HQ, RiskAI, Website, Supabase Edge).

---

## 5. App-specific env vars

| Variable | Apps |
|----------|------|
| `OPENAI_API_KEY` | RiskAI |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | RiskAI |
| `AI_RATE_LIMIT_*` | RiskAI |
| `NEXT_PUBLIC_VISUALIFY_PRODUCT_KEY` | RiskAI, Template App, future products |
| `NEXT_PUBLIC_RISKAI_ENABLE_*` flags | RiskAI |
| `HQ_SUPABASE_AUTH_*` | HQ |
| `NEXT_PUBLIC_HQ_AUTH_DISABLED` | HQ (local only) |
| `DEV_SKIP_AUTH_GUARD` | RiskAI (local only) |
| `PORTFOLIO_INVITE_DEBUG` | RiskAI |

---

## 6. Supabase Edge secrets ↔ Vercel alignment

Edge function: `website/supabase/functions/notify-on-insert` (deploy with `--no-verify-jwt`; protect with webhook auth — see `NOTIFY_SETUP.md`).

Configure in **Supabase Dashboard → Edge Functions → Secrets**:

| Edge secret | Must equal (Vercel / Next) | Purpose |
|-------------|------------------------------|---------|
| `RISKAI_APP_ORIGIN` | `NEXT_PUBLIC_RISKAI_ORIGIN` on RiskAI | Project/portfolio invite links |
| `HQ_APP_ORIGIN` | `NEXT_PUBLIC_HQ_ORIGIN` on HQ | Workspace invite links |
| `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | Auth user lookup for invite email copy |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as app server env | Invite `login` vs `signup` detection |
| `RESEND_API_KEY` | *(Edge only)* | Send email |
| `CONTACT_FROM_EMAIL` | *(Edge only)* | From / reply-to |
| `NOTIFY_TO_EMAIL` | *(Edge only)* | Internal notifications inbox |
| `WEBHOOK_SECRET` | *(webhook `Authorization` header)* | Webhook authentication |

**Invite URL shape:**

- Workspace → `{HQ_APP_ORIGIN}/invite?invite_token=…&invited_email=…&mode=…`
- Project / portfolio → `{RISKAI_APP_ORIGIN}/invite?…`

If `RISKAI_APP_ORIGIN` or `HQ_APP_ORIGIN` is missing, invitation emails are **skipped** (logged, HTTP 200). If service role is missing on invite, email copy may default to “new user” incorrectly.

**Do not** set Resend keys on Website Vercel for notify flow — email runs from Edge after DB insert.

---

## 7. Supabase Auth redirect URL checklist

In **Supabase Dashboard → Authentication → URL configuration**, allow (production + local as needed):

**HQ** (`hq.visualify.com.au`):

```
https://hq.visualify.com.au/**
https://hq.visualify.com.au/auth/confirm**
http://localhost:<hq-port>/**
http://localhost:<hq-port>/auth/confirm**
```

**RiskAI** (use live host; during cutover include both target and legacy until redirect-only):

```
https://riskai.visualify.com.au/**
https://riskai.visualify.com.au/auth/callback**
https://riskai.visualify.com.au/auth/confirm**
# Until cutover complete, if still serving traffic:
https://app.visualify.com.au/**
https://app.visualify.com.au/auth/callback**
https://app.visualify.com.au/auth/confirm**
http://localhost:<riskai-port>/**
```

**Website** (if using Supabase auth on marketing — otherwise forms-only):

```
https://visualify.com.au/**
http://localhost:<website-port>/**
```

**Preview deployments:** add each stable preview URL pattern you use, or test auth only against known aliases — do not assume defaults will match preview hosts.

**Site URL:** set to the primary customer entry you want in auth emails (typically HQ or RiskAI confirm host, per flow). HQ signup uses request origin; RiskAI signup uses `NEXT_PUBLIC_RISKAI_ORIGIN` for confirm links.

---

## 8. Production env baseline

Copy into each Vercel project **Production** environment. Replace `<…>` placeholders.

### All authenticated apps (HQ, RiskAI, Template App)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_HQ_ORIGIN=https://hq.visualify.com.au
NEXT_PUBLIC_RISKAI_ORIGIN=https://riskai.visualify.com.au
NEXT_PUBLIC_WEBSITE_ORIGIN=https://visualify.com.au
```

### HQ (add)

```bash
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
# Optional:
# NEXT_PUBLIC_HQ_APPS_URL=https://hq.visualify.com.au/apps
```

### RiskAI (add)

```bash
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
OPENAI_API_KEY=<openai-key>
UPSTASH_REDIS_REST_URL=<upstash-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-token>
NEXT_PUBLIC_VISUALIFY_PRODUCT_KEY=riskai
```

### Website (add)

```bash
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
NEXT_PUBLIC_RISKAI_ORIGIN=https://riskai.visualify.com.au
```

### Supabase Edge (secrets)

```bash
RISKAI_APP_ORIGIN=https://riskai.visualify.com.au
HQ_APP_ORIGIN=https://hq.visualify.com.au
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
RESEND_API_KEY=<resend-key>
CONTACT_FROM_EMAIL=Visualify <noreply@visualify.com.au>
NOTIFY_TO_EMAIL=help@visualify.com.au
WEBHOOK_SECRET=<long-random-string>
```

### Shared auth cookies (optional — only if deliberately enabled on all apps)

```bash
NEXT_PUBLIC_HQ_SHARE_AUTH_COOKIE_DOMAIN=1
NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN=.visualify.com.au
```

---

## 9. Preview env baseline

Preview must **override origins** — code defaults in `@visualify/urls` are **production hostnames**.

Per preview Vercel project:

```bash
NEXT_PUBLIC_SUPABASE_URL=<same project or dedicated staging project>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<matching anon key>
NEXT_PUBLIC_HQ_ORIGIN=https://<hq-preview-url>
NEXT_PUBLIC_RISKAI_ORIGIN=https://<riskai-preview-url>
NEXT_PUBLIC_WEBSITE_ORIGIN=https://<website-preview-url>
SUPABASE_SERVICE_ROLE_KEY=<matching service role>
```

**RiskAI preview (if AI routes tested):** include `OPENAI_API_KEY`, `UPSTASH_*`.

**Edge invites:** secrets are per Supabase project — preview invite tests will use **production Edge origins** unless you use a separate Supabase project for staging. Plan accordingly.

**Do not set:** `NEXT_PUBLIC_HQ_AUTH_DISABLED`, `DEV_SKIP_AUTH_GUARD`, shared cookie domain (unless all preview apps share a controllable parent domain).

---

## 10. Local dev env baseline

Use per-app `.env.local` (from each app’s `.env.example`). Typical ports are team-defined; example below uses separate ports.

```bash
# Shared Supabase (local CLI or hosted dev project)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role>

# Origins — match how you run each app
NEXT_PUBLIC_HQ_ORIGIN=http://localhost:3001
NEXT_PUBLIC_RISKAI_ORIGIN=http://localhost:3000
NEXT_PUBLIC_WEBSITE_ORIGIN=http://localhost:3002

# RiskAI local
OPENAI_API_KEY=<key>
UPSTASH_REDIS_REST_URL=<url>
UPSTASH_REDIS_REST_TOKEN=<token>
```

**HQ-only local bypass (never commit to Vercel):**

```bash
# NEXT_PUBLIC_HQ_AUTH_DISABLED=true
```

**RiskAI-only local bypass:**

```bash
# DEV_SKIP_AUTH_GUARD=1
```

Localhost is treated as the RiskAI app host for dual-host routing; `NEXT_PUBLIC_WEBSITE_ORIGIN` is optional on localhost-only RiskAI dev.

---

## 11. Deprecated / legacy env vars — do not add on new projects

Avoid setting these on new Vercel projects or in new `.env.local` files:

| Legacy | Use instead |
|--------|-------------|
| `NEXT_PUBLIC_APP_ORIGIN` | `NEXT_PUBLIC_RISKAI_ORIGIN` |
| `NEXT_PUBLIC_APP_HOST` | Derive from `NEXT_PUBLIC_RISKAI_ORIGIN` |
| `NEXT_PUBLIC_WEBSITE_HOST` | Derive from `NEXT_PUBLIC_WEBSITE_ORIGIN` |
| `NEXT_PUBLIC_RISKAI_APP_ORIGIN` | `NEXT_PUBLIC_RISKAI_ORIGIN` |
| `NEXT_PUBLIC_RISKAI_DASHBOARD_URL` | `NEXT_PUBLIC_RISKAI_ORIGIN` + `/dashboard` |

Existing deployments may still set legacy vars until cutover; code continues to read them as fallbacks.

---

## 12. Migration note — `app.visualify.com.au`

| Status | Action |
|--------|--------|
| **Deprecated** | Do not configure new env values to `https://app.visualify.com.au`. |
| **Target** | `NEXT_PUBLIC_RISKAI_ORIGIN` and Edge `RISKAI_APP_ORIGIN` → `https://riskai.visualify.com.au`. |
| **During cutover** | Keep Supabase redirect URLs for **both** hosts until traffic moves; update Edge + Vercel together in one change window. |
| **Legacy code** | Do not remove `NEXT_PUBLIC_APP_*` fallbacks or redirects until production cutover is verified. |

**Cutover checklist (single maintenance window):**

1. Set `NEXT_PUBLIC_RISKAI_ORIGIN` on RiskAI, Website, HQ, Template App Vercel projects.
2. Set Supabase Edge `RISKAI_APP_ORIGIN` to the same value.
3. Add `riskai.visualify.com.au` to Supabase redirect URLs; keep `app.*` until DNS retires.
4. Verify invite email links, marketing CTAs, HQ launcher tiles, OAuth callback, email confirm.
5. Remove `app.*` from redirect URLs only after DNS and monitoring confirm zero traffic.

---

## 13. Safety rules

1. **Shared cookie domain** — Enable only if **every** authenticated app sets `NEXT_PUBLIC_HQ_SHARE_AUTH_COOKIE_DOMAIN=1` **and** the same `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN`. Setting domain without the flag is ignored (safe); setting the flag on only some apps causes session drift.

2. **No auth bypass on Vercel** — Never set `NEXT_PUBLIC_HQ_AUTH_DISABLED` or `DEV_SKIP_AUTH_GUARD` on hosted environments (`VERCEL=1` blocks the latter on RiskAI, but HQ has no hard block).

3. **No default production origins in preview** — Always set all three `NEXT_PUBLIC_*_ORIGIN` values explicitly on preview deployments.

4. **Single-session guard** — Do **not** set `NEXT_PUBLIC_RISKAI_ENABLE_SINGLE_SESSION_GUARD=1` while HQ and RiskAI share auth cookies; it conflicts with `visualify_user_sessions` and HQ token rotation.

5. **Service role** — Same Supabase project everywhere; rotating the key requires updating HQ, RiskAI, Website, and Edge secrets together.

6. **Edge ↔ Vercel** — After any origin change, update both `NEXT_PUBLIC_*_ORIGIN` and `RISKAI_APP_ORIGIN` / `HQ_APP_ORIGIN` in the same release.

---

## Quick verification

| Check | Pass criteria |
|-------|----------------|
| Supabase triple | Same URL + anon + service role project on all apps |
| Origins | Three `NEXT_PUBLIC_*_ORIGIN` match live DNS |
| Edge invites | `RISKAI_APP_ORIGIN` = RiskAI Vercel; `HQ_APP_ORIGIN` = HQ Vercel |
| Auth redirects | All live hosts + localhost patterns in Supabase dashboard |
| Preview | Origins point at preview URLs, not unset |
| Cookies | Share flag + domain identical on all apps, or both off |
| Bypass flags | Absent on Vercel Production and Preview |

---

*Document version: platform contract v1. Inspection-derived; runtime code unchanged.*
