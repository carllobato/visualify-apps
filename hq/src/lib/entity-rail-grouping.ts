export type EntityRailWorkspace = {
  id: string;
  name: string;
  workspace_type: string;
  website_url: string | null;
  logo_url: string | null;
  avatarInitials: string | null;
  memberRole: string;
};

function normType(t: string): string {
  return t.trim().toLowerCase();
}

/** Human-readable workspace type for lists (rail, dashboard tiles). */
export function workspaceTypeDisplayLabel(workspaceType: string): string {
  const t = normType(workspaceType);
  if (t === "personal") return "Personal";
  if (t === "team" || t === "organization" || t === "organisation") return "Organisation";
  const trimmed = workspaceType.trim();
  return trimmed || "Workspace";
}

export function isOrganisationWorkspaceType(workspaceType: string): boolean {
  const t = normType(workspaceType);
  return t === "team" || t === "organization" || t === "organisation";
}

/**
 * Workspaces for the HQ rail — one list; `personal` is a type subtitle only, not a separate section.
 */
export function groupEntitiesForRail(workspaces: EntityRailWorkspace[]): {
  label: string;
  items: EntityRailWorkspace[];
} {
  return { label: "Workspaces", items: workspaces };
}
