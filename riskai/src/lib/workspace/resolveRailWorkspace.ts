import type { EntitledWorkspace } from "@/types/entitledWorkspace";

function findAuthorisedWorkspace(
  workspaces: readonly EntitledWorkspace[],
  workspaceId: string | null | undefined
): EntitledWorkspace | null {
  const id = typeof workspaceId === "string" ? workspaceId.trim() : "";
  if (!id) return null;
  return workspaces.find((workspace) => workspace.id === id) ?? null;
}

/**
 * Active Workspace for the App Shell rail: URL, then the Project's `workspace_id`,
 * then the authorised cookie selection. Never returns an unentitled Workspace.
 */
export function resolveRailWorkspace(params: {
  workspaces: readonly EntitledWorkspace[];
  pathnameWorkspaceId: string | null;
  projectWorkspaceId: string | null;
  selectedWorkspaceId: string | null;
}): EntitledWorkspace | null {
  return (
    findAuthorisedWorkspace(params.workspaces, params.pathnameWorkspaceId) ??
    findAuthorisedWorkspace(params.workspaces, params.projectWorkspaceId) ??
    findAuthorisedWorkspace(params.workspaces, params.selectedWorkspaceId)
  );
}
