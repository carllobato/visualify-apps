/**
 * `@supabase/ssr` persists refreshed tokens from `getUser()` / `signInWithPassword()`
 * inside an async `onAuthStateChange` handler (see `createServerClient` in that package).
 * If we return the HTTP response before that handler runs, Set-Cookie never attaches and
 * the next navigation looks logged out.
 *
 * Yield the macrotask queue so `applyServerStorage` → `setAll` can finish on this response.
 */
export async function awaitSupabaseCookieSync(): Promise<void> {
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const ms = Number.parseInt(process.env.HQ_SUPABASE_AUTH_SYNC_MS ?? "15", 10);
  if (Number.isFinite(ms) && ms > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
