/**
 * Official `visualify_workspace_members.role` values (highest privilege first).
 * Hierarchy: owner > admin > member > viewer
 */
export const WORKSPACE_ROLES = ["owner", "admin", "member", "viewer"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Lower rank number = higher privilege. */
export const WORKSPACE_ROLE_RANK: Readonly<Record<WorkspaceRole, number>> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
};

/** Same order as {@link WORKSPACE_ROLES}: highest privilege first. */
export const WORKSPACE_ROLES_BY_DESCENDING_PRIVILEGE: readonly WorkspaceRole[] =
  WORKSPACE_ROLES;

export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return (WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function normalizeWorkspaceRole(
  raw: string | null | undefined,
): WorkspaceRole | null {
  const normalized = (raw ?? "").trim().toLowerCase();
  return isWorkspaceRole(normalized) ? normalized : null;
}

export function workspaceRoleRank(role: WorkspaceRole): number {
  return WORKSPACE_ROLE_RANK[role];
}

/** True when `role` has at least the privilege level of `minimumRole`. */
export function isWorkspaceRoleAtLeast(
  role: WorkspaceRole,
  minimumRole: WorkspaceRole,
): boolean {
  return workspaceRoleRank(role) <= workspaceRoleRank(minimumRole);
}

/**
 * True when `actorRole` may assign `targetRole` (target is equal to or below actor).
 */
export function canAssignWorkspaceRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  return workspaceRoleRank(targetRole) >= workspaceRoleRank(actorRole);
}
