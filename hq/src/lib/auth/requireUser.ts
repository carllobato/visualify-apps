import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  AUTH_DISABLED_DEV_EMAIL,
  AUTH_DISABLED_DEV_USER_ID,
  isAuthDisabled,
} from "@/lib/auth/auth-disabled";
import { supabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolve the signed-in user from a Supabase server client (session cookies).
 * Used by {@link requireUser} and Route Handlers that build the client from `NextRequest`.
 */
export async function authenticateRouteSupabase(
  supabase: SupabaseClient,
): Promise<{ id: string; email?: string } | null> {
  if (isAuthDisabled()) {
    return { id: AUTH_DISABLED_DEV_USER_ID, email: AUTH_DISABLED_DEV_EMAIL };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const {
    data: { user: verifiedUser },
  } = await supabase.auth.getUser();

  const user = verifiedUser ?? session?.user ?? null;
  if (!user) return null;

  return { id: user.id, email: user.email ?? undefined };
}

/**
 * Require an authenticated Supabase user for API routes.
 * Returns `{ id, email }` if authenticated, or a 401 NextResponse if not.
 *
 * Uses the same resolution order as {@link resolveAuthenticatedUser}: prefer JWT-validated
 * `getUser()`, then fall back to `getSession().user` when the Auth API omits the user but
 * cookies still hold a session (avoids spurious 401s on saves while the UI stays signed in).
 */
export async function requireUser(): Promise<
  { id: string; email?: string } | NextResponse
> {
  const supabase = await supabaseServerClient();
  const user = await authenticateRouteSupabase(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}
