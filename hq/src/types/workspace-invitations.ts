import {
  WORKSPACE_ROLES,
  isWorkspaceRole,
  type WorkspaceRole,
} from "@visualify/workspace-product-access";

/**
 * Roles allowed on `visualify_invitations` when `resource_type = 'workspace'`.
 * Matches `visualify_workspace_members.role` (owner/admin/member/viewer).
 */
export const WORKSPACE_INVITE_ROLES = WORKSPACE_ROLES;

export type WorkspaceInviteRole = WorkspaceRole;

export function isWorkspaceInviteRole(value: string): value is WorkspaceInviteRole {
  return isWorkspaceRole(value);
}

export type WorkspacePendingInvitationRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  status: string;
};
