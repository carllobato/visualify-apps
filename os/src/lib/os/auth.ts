import "server-only";

import { supabaseServerClient } from "@/lib/supabase/server";

/** Signed-in Supabase auth user id, or null when unauthenticated. */
export async function resolveAuthenticatedOsUserId(): Promise<string | null> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
