import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Supabase auth cookies default to **host-only** (e.g. `hq.visualify.com.au`), which is the
 * reliable setup for a single HQ deployment.
 *
 * Setting `Domain=.visualify.com.au` via env caused fragile behaviour (overlapping cookies,
 * browsers dropping sessions between navigations). Sharing sessions across subdomains is **opt-in**
 * so production keeps working even if `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN` is still set in Vercel.
 *
 * To experiment with cross-subdomain cookies later, set **both**:
 * - `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN=.visualify.com.au`
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
