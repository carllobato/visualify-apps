/**
 * Roles allowed on `visualify_invitations` when `resource_type = 'workspace'`.
 * Subset of workspace member roles: DB constraint allows owner/admin/member only
 * (see migration 20260516120000_workspace_invitations_owner_role.sql).
 */
export const WORKSPACE_INVITE_ROLES = ["owner", "admin", "member"] as const;

export type WorkspaceInviteRole = (typeof WORKSPACE_INVITE_ROLES)[number];

export function isWorkspaceInviteRole(value: string): value is WorkspaceInviteRole {
  return (WORKSPACE_INVITE_ROLES as readonly string[]).includes(value);
}

export type WorkspacePendingInvitationRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  status: string;
};
