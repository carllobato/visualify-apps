import {
  isWorkspaceRoleAtLeast,
  type WorkspaceRole,
} from "@visualify/workspace-product-access";
import type { ProjectAccessMode } from "@/types/projectPermissions";

/** Portfolio-level capabilities derived from `visualify_workspace_members.role`. */
export type WorkspacePortfolioCapabilities = {
  /** Open portfolio settings / admin surfaces. */
  canAccessPortfolioSettings: boolean;
  canEditPortfolioDetails: boolean;
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
};

/** Project-level capabilities derived from `visualify_workspace_members.role`. */
export type WorkspaceProjectCapabilities = {
  canEditContent: boolean;
  canEditProjectMetadata: boolean;
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
  accessMode: ProjectAccessMode;
};

function resolveMemberManagementCapabilities(role: WorkspaceRole): Pick<
  WorkspacePortfolioCapabilities,
  "canInviteMembers" | "canChangeMemberRoles" | "canRemoveMembers"
> {
  const canManage = isWorkspaceRoleAtLeast(role, "member");
  return {
    canInviteMembers: canManage,
    canChangeMemberRoles: canManage,
    canRemoveMembers: canManage,
  };
}

/**
 * Maps a workspace role to portfolio settings/admin capabilities.
 * Owner and admin are equivalent; member and viewer are read-only for portfolio admin.
 */
export function resolveWorkspacePortfolioCapabilities(
  role: WorkspaceRole,
): WorkspacePortfolioCapabilities {
  const canAdminPortfolio = isWorkspaceRoleAtLeast(role, "admin");

  return {
    canAccessPortfolioSettings: canAdminPortfolio,
    canEditPortfolioDetails: canAdminPortfolio,
    ...resolveMemberManagementCapabilities(role),
  };
}

/**
 * Maps a workspace role to project content/metadata/member capabilities.
 * Member may edit content and manage users but not project metadata; viewer is read-only.
 */
export function resolveWorkspaceProjectCapabilities(
  role: WorkspaceRole,
): WorkspaceProjectCapabilities {
  const canEditContent = isWorkspaceRoleAtLeast(role, "member");
  const canEditProjectMetadata = isWorkspaceRoleAtLeast(role, "admin");

  let accessMode: ProjectAccessMode = "viewer";
  if (isWorkspaceRoleAtLeast(role, "admin")) {
    accessMode = "owner";
  } else if (role === "member") {
    accessMode = "editor";
  }

  return {
    canEditContent,
    canEditProjectMetadata,
    ...resolveMemberManagementCapabilities(role),
    accessMode,
  };
}
