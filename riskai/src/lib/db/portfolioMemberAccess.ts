import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import { resolveWorkspacePortfolioCapabilities } from "@/lib/workspace/workspaceRoleCapabilities";
import type {
  PortfolioMemberRole,
  PortfolioMembersViewerContext,
} from "@/types/portfolioMembers";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { PortfolioMemberRole, PortfolioMembersViewerContext };

const STANDARD_ROLES: PortfolioMemberRole[] = ["owner", "editor", "viewer"];

/** Any portfolio_members row with these roles may open portfolio settings (viewer included). Legacy values kept. */
const PORTFOLIO_SETTINGS_PAGE_MEMBER_ROLES = new Set<string>([
  "owner",
  "editor",
  "viewer",
  "admin",
  "member",
]);

export function portfolioMemberRoleAllowsSettingsPageAccess(role: string | null | undefined): boolean {
  return typeof role === "string" && PORTFOLIO_SETTINGS_PAGE_MEMBER_ROLES.has(role);
}

function displayMemberRole(
  isTableOwner: boolean,
  rowRole: string | undefined
): PortfolioMemberRole | null {
  if (isTableOwner) return "owner";
  if (rowRole && (STANDARD_ROLES as string[]).includes(rowRole)) {
    return rowRole as PortfolioMemberRole;
  }
  if (rowRole === "admin") return "owner";
  if (rowRole === "member") return "viewer";
  return null;
}

function effectivePortfolioOwner(isTableOwner: boolean, rowRole: string | undefined): boolean {
  if (isTableOwner) return true;
  return rowRole === "owner" || rowRole === "admin";
}

export type PortfolioMemberCapabilityFlags = {
  canEditPortfolioDetails: boolean;
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
};

export function resolvePortfolioMemberCapabilityFlags(
  isTableOwner: boolean,
  rowRole: string | undefined
): PortfolioMemberCapabilityFlags {
  const ownerCaps = effectivePortfolioOwner(isTableOwner, rowRole);
  const editorOnly = !ownerCaps && rowRole === "editor";
  return {
    canEditPortfolioDetails: ownerCaps,
    canInviteMembers: ownerCaps || editorOnly,
    canChangeMemberRoles: ownerCaps,
    canRemoveMembers: ownerCaps,
  };
}

/**
 * Viewer context for portfolio members UI. Capability flags align with portfolio RLS and API routes.
 */
function viewerContextFromCapabilityFlags(
  userId: string,
  isTableOwner: boolean,
  rowRole: string | undefined,
  caps: PortfolioMemberCapabilityFlags,
): PortfolioMembersViewerContext {
  const canManageMembers = caps.canChangeMemberRoles || caps.canRemoveMembers;
  return {
    currentUserId: userId,
    canManageMembers,
    memberRole: displayMemberRole(isTableOwner, rowRole),
    ...caps,
  };
}

export async function getPortfolioMembersViewerContext(
  supabase: SupabaseClient,
  portfolioId: string,
  userId: string
): Promise<PortfolioMembersViewerContext | null> {
  const { data: portfolio, error: pErr } = await supabase
    .from("visualify_portfolios")
    .select("owner_user_id, workspace_id")
    .eq("id", portfolioId)
    .single();

  if (pErr || !portfolio) return null;

  const ownerUserId = portfolio.owner_user_id as string;
  const isTableOwner = ownerUserId === userId;

  const { data: memberRow } = await supabase
    .from("visualify_portfolio_members")
    .select("role")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", userId)
    .maybeSingle();

  const rowRole = memberRow?.role as string | undefined;

  if (isTableOwner) {
    return viewerContextFromCapabilityFlags(
      userId,
      true,
      rowRole,
      resolvePortfolioMemberCapabilityFlags(true, rowRole),
    );
  }

  if (!memberRow || !portfolioMemberRoleAllowsSettingsPageAccess(rowRole)) {
    const workspaceId =
      typeof portfolio.workspace_id === "string" && portfolio.workspace_id.trim().length > 0
        ? portfolio.workspace_id.trim()
        : null;

    if (workspaceId) {
      const workspaceRole = await fetchWorkspaceMemberRole(supabase, workspaceId, userId);
      if (workspaceRole) {
        const workspaceCaps = resolveWorkspacePortfolioCapabilities(workspaceRole);
        if (workspaceCaps.canAccessPortfolioSettings) {
          const caps: PortfolioMemberCapabilityFlags = {
            canEditPortfolioDetails: workspaceCaps.canEditPortfolioDetails,
            canInviteMembers: workspaceCaps.canInviteMembers,
            canChangeMemberRoles: workspaceCaps.canChangeMemberRoles,
            canRemoveMembers: workspaceCaps.canRemoveMembers,
          };
          return viewerContextFromCapabilityFlags(userId, false, rowRole, caps);
        }
      }
    }

    return null;
  }

  return viewerContextFromCapabilityFlags(
    userId,
    false,
    rowRole,
    resolvePortfolioMemberCapabilityFlags(false, rowRole),
  );
}

export async function countPortfolioOwners(
  supabase: SupabaseClient,
  portfolioId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("visualify_portfolio_members")
    .select("*", { count: "exact", head: true })
    .eq("portfolio_id", portfolioId)
    .eq("role", "owner");

  if (error) return 0;
  return count ?? 0;
}
