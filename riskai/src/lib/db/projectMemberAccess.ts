import { isWorkspaceRoleAtLeast } from "@visualify/workspace-product-access";
import type {
  ProjectMemberRole,
  ProjectMembersViewerContext,
} from "@/types/projectMembers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import { resolveWorkspaceProjectCapabilities } from "@/lib/workspace/workspaceRoleCapabilities";

export type { ProjectMemberRole, ProjectMembersViewerContext };

export type ProjectMemberCapabilityFlags = {
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
};

/** Aligns with project RLS: owners (table or role) full member admin; editors may invite only. */
export function resolveProjectMemberCapabilityFlags(
  isTableOwner: boolean,
  rowRole: ProjectMemberRole | undefined
): ProjectMemberCapabilityFlags {
  const ownerCaps = isTableOwner || rowRole === "owner";
  const editorOnly = !ownerCaps && rowRole === "editor";
  return {
    canInviteMembers: ownerCaps || editorOnly,
    canChangeMemberRoles: ownerCaps,
    canRemoveMembers: ownerCaps,
  };
}

/** Workspace on the project row, else the linked portfolio (member UI workspace inheritance). */
async function resolveWorkspaceIdForProject(
  supabase: SupabaseClient,
  project: {
    portfolio_id: string | null;
    workspace_id: string | null;
  },
): Promise<string | null> {
  if (typeof project.workspace_id === "string" && project.workspace_id.trim().length > 0) {
    return project.workspace_id.trim();
  }

  const portfolioId = project.portfolio_id?.trim();
  if (!portfolioId) {
    return null;
  }

  const { data: portfolio } = await supabase
    .from("visualify_portfolios")
    .select("workspace_id")
    .eq("id", portfolioId)
    .maybeSingle();

  const workspaceId = portfolio?.workspace_id;
  if (typeof workspaceId === "string" && workspaceId.trim().length > 0) {
    return workspaceId.trim();
  }

  return null;
}

function viewerContextFromWorkspaceProjectCapabilities(
  userId: string,
  workspaceCaps: ReturnType<typeof resolveWorkspaceProjectCapabilities>,
): ProjectMembersViewerContext {
  return {
    currentUserId: userId,
    canManageMembers: workspaceCaps.canChangeMemberRoles || workspaceCaps.canRemoveMembers,
    memberRole: null,
    canInviteMembers: workspaceCaps.canInviteMembers,
    canChangeMemberRoles: workspaceCaps.canChangeMemberRoles,
    canRemoveMembers: workspaceCaps.canRemoveMembers,
  };
}

/**
 * Server-side: member list UI + API capability flags (invite vs role/remove), aligned with RLS.
 * Direct project membership remains authoritative; workspace owner/admin supplements when absent.
 */
export async function getProjectMembersViewerContext(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<ProjectMembersViewerContext | null> {
  const { data: project, error: pErr } = await supabase
    .from("visualify_projects")
    .select("owner_user_id, portfolio_id, workspace_id")
    .eq("id", projectId)
    .single();

  if (pErr || !project) return null;

  const ownerUserId = project.owner_user_id as string;
  const isTableOwner = ownerUserId === userId;

  const { data: memberRow } = await supabase
    .from("visualify_project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  const rowRole = memberRow?.role as ProjectMemberRole | undefined;

  if (isTableOwner) {
    const caps = resolveProjectMemberCapabilityFlags(true, rowRole);
    return {
      currentUserId: userId,
      canManageMembers: caps.canChangeMemberRoles || caps.canRemoveMembers,
      memberRole: "owner",
      ...caps,
    };
  }

  if (!memberRow) {
    const workspaceId = await resolveWorkspaceIdForProject(supabase, {
      portfolio_id:
        typeof project.portfolio_id === "string" ? project.portfolio_id : null,
      workspace_id:
        typeof project.workspace_id === "string" ? project.workspace_id : null,
    });

    if (workspaceId) {
      const workspaceRole = await fetchWorkspaceMemberRole(supabase, workspaceId, userId);
      if (workspaceRole && isWorkspaceRoleAtLeast(workspaceRole, "admin")) {
        return viewerContextFromWorkspaceProjectCapabilities(
          userId,
          resolveWorkspaceProjectCapabilities(workspaceRole),
        );
      }
    }

    return null;
  }

  const memberRole: ProjectMemberRole | null = rowRole ?? null;
  const caps = resolveProjectMemberCapabilityFlags(false, rowRole);

  return {
    currentUserId: userId,
    canManageMembers: caps.canChangeMemberRoles || caps.canRemoveMembers,
    memberRole,
    ...caps,
  };
}

export async function countProjectOwners(
  supabase: SupabaseClient,
  projectId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("visualify_project_members")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("role", "owner");

  if (error) return 0;
  return count ?? 0;
}
