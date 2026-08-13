export type ResolveCreatableWorkspaceResult =
  | { workspaceId: string }
  | { error: "none" | "workspace_required" | "forbidden" };

/**
 * Pure resolution for binding a create action to an authorised RiskAI workspace.
 * Shared by portfolio create and unscoped project create.
 * Never picks the first of many workspaces — 2+ without a valid selection → workspace_required.
 */
export function resolveCreatableWorkspaceId(params: {
  creatableIds: readonly string[];
  requestedWorkspaceId?: string | null;
}): ResolveCreatableWorkspaceResult {
  const authorised = new Set(
    params.creatableIds.map((id) => id.trim()).filter((id) => id.length > 0),
  );

  if (authorised.size === 0) {
    return { error: "none" };
  }

  const requested =
    typeof params.requestedWorkspaceId === "string" ? params.requestedWorkspaceId.trim() : "";

  if (requested) {
    if (!authorised.has(requested)) {
      return { error: "forbidden" };
    }
    return { workspaceId: requested };
  }

  if (authorised.size === 1) {
    const only = [...authorised][0];
    if (!only) return { error: "none" };
    return { workspaceId: only };
  }

  return { error: "workspace_required" };
}

/**
 * When a portfolio is selected, optional client workspaceId must match the portfolio's workspace.
 */
export function assertRequestedWorkspaceMatchesPortfolio(params: {
  portfolioWorkspaceId: string;
  requestedWorkspaceId?: string | null;
}): { ok: true } | { error: "workspace_mismatch" } {
  const requested =
    typeof params.requestedWorkspaceId === "string" ? params.requestedWorkspaceId.trim() : "";
  if (!requested) return { ok: true };
  if (requested !== params.portfolioWorkspaceId.trim()) {
    return { error: "workspace_mismatch" };
  }
  return { ok: true };
}
