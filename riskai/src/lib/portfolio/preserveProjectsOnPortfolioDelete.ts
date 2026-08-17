/**
 * Portfolio removal must never physically delete Projects or Project child data.
 * Linked Projects are unlinked (`portfolio_id = null`) and remain on their Workspace.
 *
 * Legacy rows with a null `workspace_id` used the linked Portfolio as their only
 * Workspace association. Copy that Portfolio's `workspace_id` onto those rows in
 * the same write that unlinks them, so they still appear in Workspace project and
 * archived-restore lists, and so archive/restore can resolve a Workspace after the
 * Portfolio is gone.
 */
export type PortfolioDeleteProjectPlan = {
  action: "unlink";
  /**
   * Applied first, only to linked rows whose `workspace_id` is null.
   * Unlinks and backfills Workspace in one write so those rows never exist as
   * `portfolio_id` null with no Workspace.
   */
  legacyProjectUpdate: { workspace_id: string; portfolio_id: null } | null;
  projectUpdate: { portfolio_id: null };
  mayDeleteProjectRows: false;
  mayDeleteProjectChildData: false;
};

export function planPortfolioDeleteProjectHandling(options?: {
  portfolioWorkspaceId?: string | null;
}): PortfolioDeleteProjectPlan {
  const workspaceId =
    typeof options?.portfolioWorkspaceId === "string" ? options.portfolioWorkspaceId.trim() : "";

  return {
    action: "unlink",
    legacyProjectUpdate: workspaceId
      ? { workspace_id: workspaceId, portfolio_id: null }
      : null,
    projectUpdate: { portfolio_id: null },
    mayDeleteProjectRows: false,
    mayDeleteProjectChildData: false,
  };
}

export type PortfolioDeleteProjectRow = {
  workspace_id: string | null;
  portfolio_id: string | null;
};

function existingWorkspaceId(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * In-memory equivalent of the DELETE writes: backfill null-`workspace_id` rows
 * from the Portfolio, then unlink every linked Project. Existing `workspace_id`
 * values are left unchanged.
 */
export function applyPortfolioDeleteProjectHandling<T extends PortfolioDeleteProjectRow>(
  projects: readonly T[],
  plan: PortfolioDeleteProjectPlan,
): T[] {
  return projects.map((project) => {
    if (!existingWorkspaceId(project.workspace_id) && plan.legacyProjectUpdate) {
      return { ...project, ...plan.legacyProjectUpdate };
    }
    return { ...project, ...plan.projectUpdate };
  });
}
