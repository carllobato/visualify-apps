import {
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@visualify/workspace-product-access";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Matches `@visualify/workspace-product-access` / portfolio list active-member handling. */
function isActiveWorkspaceMemberStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.trim().toLowerCase() === "active";
}

/**
 * Active `visualify_workspace_members.role` for the user, or null when not a member / inactive / unknown role.
 */
export async function fetchWorkspaceMemberRole(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | null> {
  const wid = workspaceId.trim();
  const uid = userId.trim();
  if (!wid || !uid) {
    return null;
  }

  const { data, error } = await supabase
    .from("visualify_workspace_members")
    .select("role, status")
    .eq("workspace_id", wid)
    .eq("user_id", uid)
    .maybeSingle();

  if (error) {
    console.error("[workspaceMemberAccess] fetchWorkspaceMemberRole:", error.message);
    return null;
  }

  if (!data || !isActiveWorkspaceMemberStatus(data.status)) {
    return null;
  }

  return normalizeWorkspaceRole(data.role);
}
