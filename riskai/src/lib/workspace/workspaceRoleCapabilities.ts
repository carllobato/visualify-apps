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
 * Project creation is Workspace Owner/Admin only.
 * Portfolio ownership/membership never grants this.
 */
export function workspaceRoleCanCreateProject(role: WorkspaceRole): boolean {
  return isWorkspaceRoleAtLeast(role, "admin");
}

/**
 * Project archive/restore is Workspace Owner/Admin only.
 * Direct Project roles and Portfolio membership never grant this.
 */
export function workspaceRoleCanArchiveProject(role: WorkspaceRole | null | undefined): boolean {
  if (!role) return false;
  return isWorkspaceRoleAtLeast(role, "admin");
}

/**
 * Project membership administration (add / invite / change role / remove).
 * Workspace Owner/Admin only. Direct Project roles never grant this.
 */
export function workspaceRoleCanManageProjectMembers(
  role: WorkspaceRole | null | undefined,
): boolean {
  if (!role) return false;
  return isWorkspaceRoleAtLeast(role, "admin");
}

/**
 * Maps a workspace role to project content/metadata/member capabilities.
 * Member may edit content when this mapping is applied; viewer is read-only.
 * Project member administration is Owner/Admin only.
 */
export function resolveWorkspaceProjectCapabilities(
  role: WorkspaceRole,
): WorkspaceProjectCapabilities {
  const canEditContent = isWorkspaceRoleAtLeast(role, "member");
  const canEditProjectMetadata = isWorkspaceRoleAtLeast(role, "admin");
  const canManageProjectMembers = workspaceRoleCanManageProjectMembers(role);

  let accessMode: ProjectAccessMode = "viewer";
  if (isWorkspaceRoleAtLeast(role, "admin")) {
    accessMode = "owner";
  } else if (role === "member") {
    accessMode = "editor";
  }

  return {
    canEditContent,
    canEditProjectMetadata,
    canInviteMembers: canManageProjectMembers,
    canChangeMemberRoles: canManageProjectMembers,
    canRemoveMembers: canManageProjectMembers,
    accessMode,
  };
}
