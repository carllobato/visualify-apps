/**
 * `@supabase/ssr` may persist refreshed tokens inside an async handler after `getUser()`.
 * If the HTTP response returns before that runs, Set-Cookie never attaches and the next
 * navigation looks logged out.
 *
 * Yield the macrotask queue so cookie writes can finish on this response.
 * Optional extra delay: `SUPABASE_AUTH_COOKIE_SYNC_MS` (default `15`).
 */
export async function awaitSupabaseCookieSync(): Promise<void> {
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const ms = Number.parseInt(process.env.SUPABASE_AUTH_COOKIE_SYNC_MS ?? "15", 10);
  if (Number.isFinite(ms) && ms > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
