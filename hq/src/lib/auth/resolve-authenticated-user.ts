import "server-only";

import type { User } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";
import { authDisabledStubUser, isAuthDisabled } from "./auth-disabled";

/**
 * Returns the signed-in Supabase user, or a dev stub when `NEXT_PUBLIC_HQ_AUTH_DISABLED` is set.
 */
export async function resolveAuthenticatedUser(): Promise<User | null> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user;
  if (isAuthDisabled()) return authDisabledStubUser();
  return null;
}
