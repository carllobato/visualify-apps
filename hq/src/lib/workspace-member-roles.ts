import {
  WORKSPACE_ROLES,
  canAssignWorkspaceRole,
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

export { workspaceRoleRank as workspaceMemberRoleRank };

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

/** Lowest-privilege assignable role (default for new invites). */
export function defaultWorkspaceInviteRole(
  inviterRoleRaw: string | null | undefined,
): WorkspaceInviteRole {
  const assignable = getAssignableWorkspaceInviteRoles(inviterRoleRaw);
  return assignable[assignable.length - 1] ?? "member";
}
