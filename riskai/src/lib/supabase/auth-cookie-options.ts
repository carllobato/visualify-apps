import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Supabase auth cookie policy — **must stay aligned with**
 * `hq/src/lib/supabase/auth-cookie-options.ts`.
 *
 * **Host-only cookies** (no `Domain` attribute) are the safe default: each deployment
 * (`app.*`, `hq.*`, etc.) keeps its own `sb-*` cookies and avoids overlapping host-only vs
 * domain-scoped cookies that confuse browsers and drop sessions.
 *
 * **Cross-subdomain** session sharing is **opt-in** via the same flag as HQ, so production
 * keeps working even if `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN` remains set in Vercel from
 * earlier experiments.
 *
 * To share one Supabase session across Visualify subdomains, set **both**:
 * - `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN=.visualify.com.au` (value only; ignored without the flag)
 * - `NEXT_PUBLIC_HQ_SHARE_AUTH_COOKIE_DOMAIN=1`
 */
export function getSupabaseAuthCookieOptions(): CookieOptionsWithName | undefined {
  if (process.env.NEXT_PUBLIC_HQ_SHARE_AUTH_COOKIE_DOMAIN !== "1") {
    return undefined;
  }

  const raw = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN?.trim();
  if (!raw) return undefined;

  const domain = raw.replace(/^["']|["']$/g, "").trim();
  if (!domain) return undefined;

  if (process.env.NODE_ENV === "production") {
    return { domain, secure: true };
  }

  return { domain };
}

/** Spread into `createServerClient` / `createBrowserClient` options from `@supabase/ssr`. */
export function supabaseSsrCookieProps(): { cookieOptions?: CookieOptionsWithName } {
  const cookieOptions = getSupabaseAuthCookieOptions();
  return cookieOptions ? { cookieOptions } : {};
}
