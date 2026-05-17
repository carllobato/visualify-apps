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
 * Invite roles the inviter may assign: their own level or lower (cannot assign above themselves).
 * Table/project owners may assign owner/editor/viewer; editors may assign editor/viewer only.
 */
export function getAssignableProjectInviteRoles(
  inviterRole: ProjectMemberRole | null
): ProjectMemberRole[] {
  if (!inviterRole || inviterRole === "owner") return [...PROJECT_INVITE_ROLES];
  if (inviterRole === "editor") return ["editor", "viewer"];
  return [];
}

export function canAssignProjectInviteRole(
  inviterRole: ProjectMemberRole | null,
  inviteRole: string
): boolean {
  if (!isProjectMemberRole(inviteRole)) return false;
  return getAssignableProjectInviteRoles(inviterRole).includes(inviteRole);
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
