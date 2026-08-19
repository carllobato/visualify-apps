import type { PortfolioMemberCapabilityFlags } from "@/lib/db/portfolioMemberAccess";

/** Shown when project metadata fields are read-only (viewer / no edit permission). */
export const PROJECT_SETTINGS_METADATA_VIEW_ONLY_NOTICE = "Read-only access";

/** Incomplete Project, authorised metadata editor. */
export const PROJECT_SETUP_INCOMPLETE_EDITOR_NOTICE =
  "Complete the required Project Information before using this Project.";

/** Incomplete Project, Viewer / Project Editor / other non-metadata roles. */
export const PROJECT_SETUP_INCOMPLETE_READONLY_NOTICE =
  "Project setup is incomplete and must be completed by a Project or Workspace administrator.";

/**
 * Portfolio settings banner from server-resolved capabilities (matches portfolio role model).
 */
export function getPortfolioSettingsPermissionNotice(
  caps: PortfolioMemberCapabilityFlags
): string | null {
  if (caps.canEditPortfolioDetails) {
    return null;
  }
  if (!caps.canInviteMembers) {
    return "View-only access: you can review portfolio settings and members but cannot make changes.";
  }
  return "You can view settings and invite members. Only the portfolio owner can edit portfolio details, change roles, or remove members.";
}

/** Workspace Settings banner when name and reporting unit cannot be edited (member / viewer). */
export function getWorkspaceSettingsPermissionNotice(canEditWorkspaceDetails: boolean): string | null {
  return canEditWorkspaceDetails ? null : PROJECT_SETTINGS_METADATA_VIEW_ONLY_NOTICE;
}
