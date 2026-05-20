import type { User } from "@supabase/supabase-js";

function envFlagOn(raw: string | undefined): boolean {
  if (raw == null) return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Local dev only: when true (e.g. `NEXT_PUBLIC_HQ_AUTH_DISABLED=true` in `.env.local`),
 * HQ skips login gates and uses a dev stub user.
 *
 * - Works with `next dev` and with `next start` after `next build`.
 * - Never enabled on Vercel / Netlify (hosted deploys set VERCEL / NETLIFY).
 * - `vercel dev` may set VERCEL=1 — use `pnpm dev` for bypass.
 */
export function isAuthDisabled(): boolean {
  if (!envFlagOn(process.env.NEXT_PUBLIC_HQ_AUTH_DISABLED)) return false;
  if (process.env.VERCEL === "1") return false;
  if (process.env.NETLIFY === "true") return false;
  return true;
}

export const AUTH_DISABLED_DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
export const AUTH_DISABLED_DEV_EMAIL = "dev@local.test";

/** Minimal `User` for header/menu when auth is bypassed (no Supabase session). */
export function authDisabledStubUser(): User {
  return {
    id: AUTH_DISABLED_DEV_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: AUTH_DISABLED_DEV_EMAIL,
    email_confirmed_at: new Date().toISOString(),
    phone: "",
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    factors: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
