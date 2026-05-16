import {
  WORKSPACE_INVITE_ROLES,
  type WorkspaceInviteRole,
  isWorkspaceInviteRole,
} from "@/types/workspace-invitations";

/** `visualify_workspace_members.role` values (highest privilege first). */
export const WORKSPACE_MEMBER_ROLES = ["owner", "admin", "member"] as const;

export type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLES)[number];

const WORKSPACE_MEMBER_ROLE_RANK: Record<WorkspaceMemberRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

export function normalizeWorkspaceMemberRole(
  raw: string | null | undefined,
): WorkspaceMemberRole | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "owner" || s === "admin" || s === "member") return s;
  return null;
}

export function workspaceMemberRoleRank(role: WorkspaceMemberRole): number {
  return WORKSPACE_MEMBER_ROLE_RANK[role];
}

/**
 * Invite roles the inviter may assign: their own level or lower (cannot assign above themselves).
 */
export function getAssignableWorkspaceInviteRoles(
  inviterRoleRaw: string | null | undefined,
): WorkspaceInviteRole[] {
  const inviter = normalizeWorkspaceMemberRole(inviterRoleRaw);
  if (!inviter) return [];
  const inviterRank = workspaceMemberRoleRank(inviter);
  return WORKSPACE_INVITE_ROLES.filter(
    (role) => workspaceMemberRoleRank(role) >= inviterRank,
  );
}

export function canAssignWorkspaceInviteRole(
  inviterRoleRaw: string | null | undefined,
  inviteRoleRaw: string,
): boolean {
  if (!isWorkspaceInviteRole(inviteRoleRaw)) return false;
  return getAssignableWorkspaceInviteRoles(inviterRoleRaw).includes(inviteRoleRaw);
}

/** Lowest-privilege assignable role (default for new invites). */
export function defaultWorkspaceInviteRole(
  inviterRoleRaw: string | null | undefined,
): WorkspaceInviteRole {
  const assignable = getAssignableWorkspaceInviteRoles(inviterRoleRaw);
  return assignable[assignable.length - 1] ?? "member";
}
