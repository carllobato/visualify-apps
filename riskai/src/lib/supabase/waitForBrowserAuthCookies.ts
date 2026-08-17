/**
 * `@supabase/ssr` writes `sb-*-auth-token` cookies asynchronously after
 * `signInWithPassword`. Soft/hard navigations that fire before that flush
 * look logged-out to the Next proxy and protected layout.
 */

const AUTH_COOKIE_RE = /(?:^|;\s*)sb-[^=;\s]+-auth-token(?:\.\d+)?=/;

/** True when `document.cookie` already has a Supabase auth token (chunked or not). */
export function documentHasSupabaseAuthCookie(cookie: string): boolean {
  return AUTH_COOKIE_RE.test(cookie);
}

export async function waitForBrowserAuthCookies(timeoutMs = 1500): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (documentHasSupabaseAuthCookie(document.cookie)) {
      return true;
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 20);
    });
  }
  return documentHasSupabaseAuthCookie(document.cookie);
}
