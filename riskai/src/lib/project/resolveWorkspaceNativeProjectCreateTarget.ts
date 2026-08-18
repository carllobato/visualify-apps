import { resolveCreatableWorkspaceId } from "@/lib/workspace/resolveCreatableWorkspaceId";

export type ResolveProjectCreateTargetResult =
  | { workspaceId: string }
  | { error: "forbidden" | "none" | "workspace_required" };

/**
 * Authorises Workspace-native Project create: Workspace is the required parent,
 * authorised via the same creatable-workspace set as `POST /api/projects`.
 * Portfolio is never an authority, association, or insert field.
 */
export function resolveWorkspaceNativeProjectCreateTarget(params: {
  creatableIds: readonly string[];
  requestedWorkspaceId: string;
}): ResolveProjectCreateTargetResult {
  const workspace = resolveCreatableWorkspaceId({
    creatableIds: params.creatableIds,
    requestedWorkspaceId: params.requestedWorkspaceId,
  });
  if ("error" in workspace) return { error: workspace.error };
  return { workspaceId: workspace.workspaceId };
}

/**
 * Unscoped create when the client sent no Workspace.
 * Auto-binds only when the user has exactly one creatable Workspace.
 */
export function resolveUnscopedProjectCreateTarget(params: {
  creatableIds: readonly string[];
  requestedWorkspaceId?: string | null;
}): ResolveProjectCreateTargetResult {
  return resolveCreatableWorkspaceId(params);
}

/**
 * Authorises every Project create request from the creatable-Workspace set
 * (Owner/Admin). Portfolio input is ignored and never consulted.
 */
export function resolveAuthorizedProjectCreateTarget(params: {
  creatableIds: readonly string[];
  requestedWorkspaceId?: string | null;
}): ResolveProjectCreateTargetResult {
  return resolveCreatableWorkspaceId(params);
}

/** Insert payload for `visualify_projects`. Does not write `portfolio_id`. */
export function buildProjectCreateInsert(params: {
  ownerUserId: string;
  name: string;
  workspaceId: string;
}): { owner_user_id: string; name: string; workspace_id: string } {
  return {
    owner_user_id: params.ownerUserId,
    name: params.name,
    workspace_id: params.workspaceId,
  };
}
