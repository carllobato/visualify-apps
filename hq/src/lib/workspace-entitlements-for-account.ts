import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWorkspaceProductAccessForUser } from "@visualify/workspace-product-access";

/**
 * Visualify model (HQ / platform shell):
 * - Workspace = commercial boundary (billing, product enablement).
 * - Auth user = identity only; app access is derived from workspace membership + workspace product rows.
 *
 * This helper flattens {@link fetchWorkspaceProductAccessForUser} into catalog `id` keys (aligned with
 * `visualify_products.key` and the `id` field on entries in `VISUALIFY_APP_CATALOG`).
 */
export async function fetchWorkspaceEntitledProductKeysForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<readonly string[]> {
  const rows = await fetchWorkspaceProductAccessForUser(supabase, userId);
  const keys = new Set<string>();
  for (const r of rows) {
    const k = r.productKey?.trim();
    if (k) keys.add(k);
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}
