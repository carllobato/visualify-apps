import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";

async function resolveAuthenticatedUserImpl(): Promise<User | null> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * Returns the signed-in Supabase user for Report server routes and layouts.
 *
 * Wrapped in `cache()` so layout + page loaders in the same request share one auth round-trip.
 */
export const resolveAuthenticatedUser = cache(resolveAuthenticatedUserImpl);
