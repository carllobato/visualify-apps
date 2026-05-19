import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";
import { authDisabledStubUser, isAuthDisabled } from "./auth-disabled";

async function resolveAuthenticatedUserImpl(): Promise<User | null> {
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

/**
 * Returns the signed-in Supabase user, or a dev stub when `NEXT_PUBLIC_HQ_AUTH_DISABLED` is set.
 *
 * Uses `getSession()` when `getUser()` returns empty so HQ navigation does not drop users on
 * transient Auth API / JWT validation failures — cookies may still hold a valid session.
 * {@link requireUser} uses the same fallback so API routes stay consistent with pages.
 *
 * Wrapped in `cache()` so layout + page loaders in the same request share one auth round-trip.
 */
export const resolveAuthenticatedUser = cache(resolveAuthenticatedUserImpl);
