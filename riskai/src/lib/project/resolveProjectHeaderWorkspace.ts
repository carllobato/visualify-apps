/**
 * Customer-facing Workspace identity for the Project header.
 * Uses the Project's `visualify_projects.workspace_id` only — never `portfolio_id`.
 * Returns null when the id is missing or the viewer is not entitled to that Workspace.
 */

export type ProjectHeaderWorkspace = {
  id: string;
  name: string;
};

function trimId(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveProjectHeaderWorkspace(params: {
  projectWorkspaceId: string | null | undefined;
  entitledWorkspaces: readonly { id: string; name: string }[];
}): ProjectHeaderWorkspace | null {
  const projectWorkspaceId = trimId(params.projectWorkspaceId);
  if (!projectWorkspaceId) return null;

  const workspace = params.entitledWorkspaces.find((row) => trimId(row.id) === projectWorkspaceId);
  if (!workspace) return null;

  const name = workspace.name.trim();
  if (!name) return null;

  return { id: workspace.id, name };
}
