import { resolveCreatableWorkspaceId } from "@/lib/workspace/resolveCreatableWorkspaceId";

export type ResolveProjectCreateTargetResult =
  | { portfolioId: string | null; workspaceId: string }
  | {
      error:
        | "not_found"
        | "forbidden"
        | "unbound_workspace"
        | "workspace_mismatch"
        | "none"
        | "workspace_required";
    };

export type OptionalCreatePortfolio =
  | { status: "omitted" }
  | { status: "missing" }
  | { status: "found"; id: string; workspaceId: string | null };

/**
 * Authorises Workspace-native Project create: Workspace is the required parent,
 * authorised via the same creatable-workspace set as `POST /api/projects`.
 * Portfolio is an optional association that must belong to that Workspace.
 * Never picks a Portfolio when none was supplied.
 */
export function resolveWorkspaceNativeProjectCreateTarget(params: {
  creatableIds: readonly string[];
  requestedWorkspaceId: string;
  optionalPortfolio?: OptionalCreatePortfolio;
}): ResolveProjectCreateTargetResult {
  const workspace = resolveCreatableWorkspaceId({
    creatableIds: params.creatableIds,
    requestedWorkspaceId: params.requestedWorkspaceId,
  });
  if ("error" in workspace) return { error: workspace.error };

  const optional = params.optionalPortfolio ?? { status: "omitted" };
  if (optional.status === "omitted") {
    return { portfolioId: null, workspaceId: workspace.workspaceId };
  }
  if (optional.status === "missing") {
    return { error: "not_found" };
  }

  const portfolioWorkspaceId =
    typeof optional.workspaceId === "string" ? optional.workspaceId.trim() : "";
  if (!portfolioWorkspaceId) return { error: "unbound_workspace" };
  if (portfolioWorkspaceId !== workspace.workspaceId) {
    return { error: "workspace_mismatch" };
  }

  const portfolioId = optional.id.trim();
  if (!portfolioId) return { error: "not_found" };

  return { portfolioId, workspaceId: workspace.workspaceId };
}

/**
 * Unscoped create when the client sent no Workspace and no Portfolio.
 * Auto-binds only when the user has exactly one creatable Workspace.
 */
export function resolveUnscopedProjectCreateTarget(params: {
  creatableIds: readonly string[];
  requestedWorkspaceId?: string | null;
}): ResolveProjectCreateTargetResult {
  const resolved = resolveCreatableWorkspaceId(params);
  if ("error" in resolved) return { error: resolved.error };
  return { portfolioId: null, workspaceId: resolved.workspaceId };
}

function trimRequestedWorkspaceId(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Authorises every Project create request from the creatable-Workspace set
 * (Owner/Admin). Portfolio is never an independent authority; if present it is
 * resolved to a Workspace, authorised against that Workspace, then attached as
 * an optional association.
 */
export function resolveAuthorizedProjectCreateTarget(params: {
  creatableIds: readonly string[];
  requestedWorkspaceId?: string | null;
  optionalPortfolio?: OptionalCreatePortfolio;
}): ResolveProjectCreateTargetResult {
  const requestedWorkspaceId = trimRequestedWorkspaceId(params.requestedWorkspaceId);
  const optionalPortfolio = params.optionalPortfolio ?? { status: "omitted" };

  if (requestedWorkspaceId) {
    return resolveWorkspaceNativeProjectCreateTarget({
      creatableIds: params.creatableIds,
      requestedWorkspaceId,
      optionalPortfolio,
    });
  }

  if (optionalPortfolio.status === "omitted") {
    return resolveUnscopedProjectCreateTarget({ creatableIds: params.creatableIds });
  }

  if (optionalPortfolio.status === "missing") {
    return { error: "not_found" };
  }

  const portfolioWorkspaceId =
    typeof optionalPortfolio.workspaceId === "string" ? optionalPortfolio.workspaceId.trim() : "";
  if (!portfolioWorkspaceId) return { error: "unbound_workspace" };

  return resolveWorkspaceNativeProjectCreateTarget({
    creatableIds: params.creatableIds,
    requestedWorkspaceId: portfolioWorkspaceId,
    optionalPortfolio,
  });
}
