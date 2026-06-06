import {
  WORKSPACE_ROLES,
  canAssignWorkspaceRole,
  isWorkspaceRoleAtLeast,
  normalizeWorkspaceRole,
  workspaceRoleRank,
  type WorkspaceRole,
} from "@visualify/workspace-product-access";
import {
  WORKSPACE_INVITE_ROLES,
  type WorkspaceInviteRole,
  isWorkspaceInviteRole,
} from "@/types/workspace-invitations";

/** `visualify_workspace_members.role` values (highest privilege first). */
export const WORKSPACE_MEMBER_ROLES = WORKSPACE_ROLES;

export type WorkspaceMemberRole = WorkspaceRole;

export const normalizeWorkspaceMemberRole = normalizeWorkspaceRole;

export { workspaceRoleRank as workspaceMemberRoleRank, isWorkspaceRoleAtLeast };

/** Owner/admin — may open HQ workspace administration (billing, invites, settings). */
export function canManageWorkspaceInHq(roleRaw: string | null | undefined): boolean {
  const role = normalizeWorkspaceRole(roleRaw);
  return role != null && isWorkspaceRoleAtLeast(role, "admin");
}

/**
 * Invite roles the inviter may assign: their own level or lower (cannot assign above themselves).
 */
export function getAssignableWorkspaceInviteRoles(
  inviterRoleRaw: string | null | undefined,
): WorkspaceInviteRole[] {
  const inviter = normalizeWorkspaceRole(inviterRoleRaw);
  if (!inviter) return [];
  const inviterRank = workspaceRoleRank(inviter);
  return WORKSPACE_INVITE_ROLES.filter(
    (role) => workspaceRoleRank(role) >= inviterRank,
  );
}

export function canAssignWorkspaceInviteRole(
  inviterRoleRaw: string | null | undefined,
  inviteRoleRaw: string,
): boolean {
  const inviter = normalizeWorkspaceRole(inviterRoleRaw);
  const target = normalizeWorkspaceRole(inviteRoleRaw);
  if (!inviter || !target || !isWorkspaceInviteRole(inviteRoleRaw)) return false;
  return canAssignWorkspaceRole(inviter, target);
}

/** Display label for `visualify_workspace_members.role` on admin surfaces. */
export function workspaceMemberRoleLabel(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "owner" || s === "admin" || s === "member" || s === "viewer") {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const t = raw?.trim();
  return t && t.length > 0 ? t : "Member";
}

/** Lowest-privilege assignable role (default for new invites). */
export function defaultWorkspaceInviteRole(
  inviterRoleRaw: string | null | undefined,
): WorkspaceInviteRole {
  const assignable = getAssignableWorkspaceInviteRoles(inviterRoleRaw);
  return assignable[assignable.length - 1] ?? "member";
}
