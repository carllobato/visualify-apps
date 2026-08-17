import "server-only";

import {
  fetchWorkspaceProductAccessForUser,
  isWorkspaceRoleAtLeast,
  normalizeWorkspaceRole,
} from "@visualify/workspace-product-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import { productConfig } from "@/lib/product-config";
import { canCreateProjectInCreatableWorkspace } from "@/lib/project/resolveWorkspaceProjectCreateParent";

/**
 * Workspace where the user may create a RiskAI portfolio or unscoped project
 * (owner/admin + RiskAI entitlement).
 */
export type CreatableRiskAiWorkspace = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Workspaces where the authenticated user can create a RiskAI portfolio or unscoped project:
 * active membership, owner/admin role, and active RiskAI product entitlement.
 * Resolves `visualify_workspaces.id` from entitled slugs (RLS applies).
 * Single definition — use for both portfolio and project create binding.
 */
export async function getCreatableRiskAiWorkspaces(
  supabase: SupabaseClient,
  userId: string,
): Promise<CreatableRiskAiWorkspace[]> {
  const rows = await fetchWorkspaceProductAccessForUser(supabase, userId);
  const productKey = productConfig.PRODUCT_KEY;

  const bySlug = new Map<string, string>();
  for (const row of rows) {
    if (row.productKey !== productKey) continue;
    const role = normalizeWorkspaceRole(row.memberRole);
    if (!role || !isWorkspaceRoleAtLeast(role, "admin")) continue;
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
    console.error("[riskai] getCreatableRiskAiWorkspaces:", error.message);
    return [];
  }

  const creatable: CreatableRiskAiWorkspace[] = [];
  for (const row of data ?? []) {
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!slug || !id) continue;
    creatable.push({
      id,
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : bySlug.get(slug) ?? slug,
      slug,
    });
  }

  return creatable.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Server UI gate for Workspace Create Project. Matches `POST /api/projects`
 * creatable-workspace authorisation; the API remains authoritative.
 */
export async function userCanCreateProjectInWorkspace(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const creatable = await getCreatableRiskAiWorkspaces(supabase, userId);
  return canCreateProjectInCreatableWorkspace(
    creatable.map((workspace) => workspace.id),
    workspaceId,
  );
}
