import "server-only";

import { fetchWorkspaceProductAccessForUser } from "@visualify/workspace-product-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import { productConfig } from "@/lib/product-config";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

export type { EntitledWorkspace };

/**
 * Workspaces where the user has active ControlAI product entitlement.
 * Resolves `visualify_workspaces.id` from entitled slugs (RLS applies).
 */
export async function getControlAIEntitledWorkspaces(
  supabase: SupabaseClient,
  userId: string,
): Promise<EntitledWorkspace[]> {
  const rows = await fetchWorkspaceProductAccessForUser(supabase, userId);
  const productKey = productConfig.PRODUCT_KEY;

  const bySlug = new Map<string, string>();
  for (const row of rows) {
    if (row.productKey !== productKey) continue;
    const slug = row.workspaceSlug?.trim();
    if (!slug || bySlug.has(slug)) continue;
    bySlug.set(slug, row.workspaceName?.trim() || slug);
  }

  if (bySlug.size === 0) {
    return [];
  }

  const slugs = [...bySlug.keys()];
  const { data, error } = await supabase
    .from("visualify_workspaces")
    .select("id, name, slug")
    .in("slug", slugs);

  if (error) {
    console.error("[controlai] getControlAIEntitledWorkspaces:", error.message);
    return [];
  }

  const entitled: EntitledWorkspace[] = [];
  for (const row of data ?? []) {
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!slug || !id) continue;
    entitled.push({
      id,
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : bySlug.get(slug) ?? slug,
      slug,
    });
  }

  return entitled.sort((a, b) => a.name.localeCompare(b.name));
}
