# Visualify release checklist

Lightweight pre/post deploy checklist for **HQ**, **RiskAI**, and **Website** — one monorepo, three Vercel projects, one shared Supabase.

**Related:** [`environment-variables.md`](./environment-variables.md) (env contract) · [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (CI)

---

## 1. Before merging to `main`

- [ ] PR is scoped to what you intend to ship
- [ ] **CI is green** (install, Website lint, RiskAI + workspace-product-access tests, builds for all three apps)
- [ ] Reviewed locally if the change touches auth, env, or shared packages
- [ ] No `.env.local` values or secrets committed
- [ ] If this release includes env or migration work, those steps are planned for the same window (see below)

---

## 2. Env var changes

Use [`environment-variables.md`](./environment-variables.md) as the source of truth.

- [ ] Identified every **Vercel project** affected (HQ / RiskAI / Website)
- [ ] Updated **Production** (and **Preview** if you rely on previews for that var)
- [ ] If the var is shared (`NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_*_ORIGIN`, cookie flags, service role): **same value on every app that needs it**
- [ ] If invite links depend on it: updated **Supabase Edge secrets** in the same change window (`RISKAI_APP_ORIGIN`, `HQ_APP_ORIGIN`, etc. — see env doc §6)
- [ ] If auth redirects depend on it: updated **Supabase Dashboard → Authentication → URL configuration**
- [ ] **Redeployed** each affected Vercel project after changing env (push or manual redeploy)

---

## 3. Supabase migration changes

- [ ] Migration reviewed (RLS, RPCs, breaking column renames, backfills)
- [ ] Applied to the **shared** Supabase project (SQL Editor or CLI) **before or in the same window** as the app deploy that expects it
- [ ] Validated on a non-critical path after apply (e.g. login, load dashboard, save a row)
- [ ] Edge function / webhook behaviour still correct if tables or triggers changed
- [ ] **Rollback plan is forward-fix** — there is no safe “undo migration” button; plan a follow-up migration if something breaks

---

## 4. Shared package changes (`packages/*`)

Packages: `@visualify/app-shell`, `@visualify/design-system`, `@visualify/urls`, `@visualify/workspace-product-access`.

- [ ] CI build passed (apps compile against the new package code)
- [ ] **All three production apps will deploy** — a change under `packages/` affects HQ, RiskAI, and Website even if you only edited one app folder
- [ ] If Vercel “Ignored Build Step” skips unchanged roots, **manually redeploy** any project that did not auto-build
- [ ] Smoke-tested at least one flow in each app that uses the changed package (e.g. cross-links, shell chrome, entitlements)

---

## 5. Auth / session / origin changes

- [ ] Origins updated on **all** relevant Vercel projects (`NEXT_PUBLIC_HQ_ORIGIN`, `NEXT_PUBLIC_RISKAI_ORIGIN`, `NEXT_PUBLIC_WEBSITE_ORIGIN`)
- [ ] Matching **Edge secrets** updated (`HQ_APP_ORIGIN`, `RISKAI_APP_ORIGIN`) in the same release
- [ ] Supabase redirect URLs include new hosts before cutover
- [ ] Shared cookie flags (`NEXT_PUBLIC_HQ_SHARE_AUTH_COOKIE_DOMAIN`, `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN`) are **identical on every authenticated app**, or **both off**
- [ ] Did **not** enable `NEXT_PUBLIC_HQ_AUTH_DISABLED` or `DEV_SKIP_AUTH_GUARD` on Vercel (local only; HQ/RiskAI block these on `VERCEL=1`)
- [ ] Did **not** enable `NEXT_PUBLIC_RISKAI_ENABLE_SINGLE_SESSION_GUARD` while HQ and RiskAI share auth cookies (conflicts with shared sessions — see env doc §13)
- [ ] Tested: sign in → navigate HQ ↔ RiskAI → sign out (production or staging-like env)

---

## 6. Post-deploy smoke test

Quick manual pass after Vercel shows **Ready** for each deployed project:

| Check | HQ | RiskAI | Website |
|-------|:--:|:------:|:-------:|
| Homepage / entry loads (no 5xx) | ☐ | ☐ | ☐ |
| Login or auth-gated route behaves correctly | ☐ | ☐ | — |
| One core happy path (apps launcher / dashboard / form submit) | ☐ | ☐ | ☐ |
| Cross-link to another product opens correct host | ☐ | ☐ | ☐ |

Optional if you touched invites or email: trigger or inspect one invite / notify flow and confirm link host matches live origins.

---

## 7. Rollback steps

**Apps (fast — do this first if something is wrong)**

1. Vercel → project (HQ / RiskAI / Website) → **Deployments**
2. Find last known-good deployment → **⋯ → Promote to Production**
3. If the release changed **`packages/*`**, roll back **all three apps** that shipped the bad commit, not just the one you noticed

**Env vars**

- Rollback deployment does **not** revert env changes — restore previous values in Vercel manually, then redeploy

**Database**

- **Forward-fix only:** ship a corrective migration or hotfix SQL; restore from Supabase backup/PITR only for serious incidents

**Edge functions**

- Redeploy previous function version from git, or fix secrets and redeploy

---

## 8. What not to do casually

- [ ] Do **not** merge to `main` with failing CI
- [ ] Do **not** change production origins on one Vercel project without updating the others + Edge secrets
- [ ] Do **not** apply destructive DB migrations without a backup mindset and a forward-fix plan
- [ ] Do **not** enable auth bypass flags on Vercel
- [ ] Do **not** turn on shared cookie domain on only some apps
- [ ] Do **not** enable single-session guard during shared HQ ↔ RiskAI auth
- [ ] Do **not** assume preview deployments use correct cross-app links unless all three preview origins are set explicitly (defaults in `@visualify/urls` are production hostnames)
- [ ] Do **not** rotate `SUPABASE_SERVICE_ROLE_KEY` on one surface only — update HQ, RiskAI, Website, and Edge together

---

*Solo-founder rule of thumb: if it touches **env**, **DB**, or **`packages/*`**, treat it as a **platform release** — not a single-app deploy.*
