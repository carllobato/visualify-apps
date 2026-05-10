export type EntityRailWorkspace = {
  id: string;
  name: string;
  workspace_type: string;
};

function normType(t: string): string {
  return t.trim().toLowerCase();
}

/**
 * Group workspaces for the rail: split personal vs non-personal when both exist.
 * Visible labels use “Workspace” terminology (no “Organisation” in section headers).
 */
export function groupEntitiesForRail(workspaces: EntityRailWorkspace[]):
  | { kind: "single"; label: string; items: EntityRailWorkspace[] }
  | { kind: "split"; personal: EntityRailWorkspace[]; nonPersonal: EntityRailWorkspace[] } {
  const personal = workspaces.filter((w) => normType(w.workspace_type) === "personal");
  const nonPersonal = workspaces.filter((w) => normType(w.workspace_type) !== "personal");

  if (personal.length === 0) {
    return { kind: "single", label: "Workspaces", items: nonPersonal };
  }
  if (nonPersonal.length === 0) {
    return { kind: "single", label: "Workspaces", items: personal };
  }
  return { kind: "split", personal, nonPersonal };
}
