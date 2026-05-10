import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Optional domain scope for Supabase auth cookies.
 *
 * When `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN` is set (e.g. `.visualify.com.au` in production),
 * sessions are shared across Visualify subdomains. When unset (local dev), cookies stay
 * host-only so localhost behaviour is unchanged.
 */
export function getSupabaseAuthCookieOptions(): CookieOptionsWithName | undefined {
  const domain = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN?.trim();
  if (!domain) return undefined;
  return { domain };
}

/** Spread into `createServerClient` / `createBrowserClient` options from `@supabase/ssr`. */
export function supabaseSsrCookieProps(): { cookieOptions?: CookieOptionsWithName } {
  const cookieOptions = getSupabaseAuthCookieOptions();
  return cookieOptions ? { cookieOptions } : {};
}
