import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client for server-only operations (e.g. delete user). Never import in client code.
 * Set `SUPABASE_SERVICE_ROLE_KEY` in the server environment — never NEXT_PUBLIC_*.
 */
export function supabaseAdminClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Add it to the server environment (never expose as NEXT_PUBLIC_*)."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
