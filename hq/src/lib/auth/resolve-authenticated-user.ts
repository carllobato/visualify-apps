import "server-only";

import type { User } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";
import { authDisabledStubUser, isAuthDisabled } from "./auth-disabled";

/**
 * Returns the signed-in Supabase user, or a dev stub when `NEXT_PUBLIC_HQ_AUTH_DISABLED` is set.
 *
 * Uses `getSession()` when `getUser()` returns empty so HQ navigation does not drop users on
 * transient Auth API / JWT validation failures — cookies may still hold a valid session.
 * API routes use {@link requireUser} which calls `getUser()` only (stricter).
 */
export async function resolveAuthenticatedUser(): Promise<User | null> {
  if (isAuthDisabled()) return authDisabledStubUser();

  const supabase = await supabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const {
    data: { user: verifiedUser },
  } = await supabase.auth.getUser();
  if (verifiedUser) return verifiedUser;

  if (session?.user) return session.user as User;

  return null;
}
