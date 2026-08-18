import "server-only";

import { hasProductAccess as hasProductAccessWithClient } from "@visualify/workspace-product-access";
import { supabaseServerClient } from "@/lib/supabase/server";

/**
 * Loads product access for a signed-in user (RLS applies).
 *
 * Used by RiskAI to decide which Workspaces are active for this product — not whether
 * the user may enter the RiskAI app. Authenticated RiskAI entry does not call this.
 */
export async function hasProductAccess(userId: string, productKey: string): Promise<boolean> {
  const supabase = await supabaseServerClient();
  return hasProductAccessWithClient(supabase, userId, productKey);
}
