import type { PortfolioMemberRole } from "@/types/portfolioMembers";
import type { ProjectMemberRole } from "@/types/projectMembers";

const PROJECT_INVITE_ROLES: ProjectMemberRole[] = ["owner", "editor", "viewer"];
const PORTFOLIO_INVITE_ROLES: PortfolioMemberRole[] = ["owner", "editor", "viewer"];

export function isProjectMemberRole(v: unknown): v is ProjectMemberRole {
  return typeof v === "string" && (PROJECT_INVITE_ROLES as string[]).includes(v);
}

export function isPortfolioMemberRole(v: unknown): v is PortfolioMemberRole {
  return typeof v === "string" && (PORTFOLIO_INVITE_ROLES as string[]).includes(v);
}

/**
 * Invite roles the inviter may assign.
 * Project member administration is Workspace Owner/Admin only; they may assign any Project role.
 * Direct Project Owner/Editor never receive assignable invite roles from Project role alone.
 */
export function getAssignableProjectInviteRoles(
  _inviterRole: ProjectMemberRole | null,
  options?: { canManageProjectMembers?: boolean },
): ProjectMemberRole[] {
  if (options?.canManageProjectMembers) return [...PROJECT_INVITE_ROLES];
  return [];
}

export function canAssignProjectInviteRole(
  inviterRole: ProjectMemberRole | null,
  inviteRole: string,
  options?: { canManageProjectMembers?: boolean },
): boolean {
  if (!isProjectMemberRole(inviteRole)) return false;
  return getAssignableProjectInviteRoles(inviterRole, options).includes(inviteRole);
}

export function getAssignablePortfolioInviteRoles(
  inviterRole: PortfolioMemberRole | null
): PortfolioMemberRole[] {
  if (!inviterRole || inviterRole === "owner") return [...PORTFOLIO_INVITE_ROLES];
  if (inviterRole === "editor") return ["editor", "viewer"];
  return [];
}

export function canAssignPortfolioInviteRole(
  inviterRole: PortfolioMemberRole | null,
  inviteRole: string
): boolean {
  if (!isPortfolioMemberRole(inviteRole)) return false;
  return getAssignablePortfolioInviteRoles(inviterRole).includes(inviteRole);
}
