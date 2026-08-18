import { isWorkspaceRoleAtLeast, type WorkspaceRole } from "@visualify/workspace-product-access";
import type {
  ProjectMemberRole,
  ProjectMembersViewerContext,
} from "@/types/projectMembers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import { resolveAuthoritativeProjectWorkspaceId } from "@/lib/project/projectArchiveLifecycle";
import { workspaceRoleCanManageProjectMembers } from "@/lib/workspace/workspaceRoleCapabilities";

export type { ProjectMemberRole, ProjectMembersViewerContext };

export type ProjectMemberCapabilityFlags = {
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
};

/**
 * Mutation flags for Project members. True only when `canManageProjectMembers` is true
 * (active Workspace Owner/Admin). Direct Project roles never grant these.
 */
export function resolveProjectMemberCapabilityFlags(
  canManageProjectMembers: boolean,
): ProjectMemberCapabilityFlags {
  return {
    canInviteMembers: canManageProjectMembers,
    canChangeMemberRoles: canManageProjectMembers,
    canRemoveMembers: canManageProjectMembers,
  };
}

export type AuthorizeProjectMemberMutationArgs = {
  /** `visualify_projects.workspace_id` only. */
  projectWorkspaceId: string | null | undefined;
  /** Active Workspace role for the actor. */
  workspaceRole: WorkspaceRole | null | undefined;
  /** Ignored. Table owner never grants member administration. */
  isTableOwner?: boolean;
  /** Ignored. Direct Project owner never grants member administration. */
  isDirectProjectOwner?: boolean;
  /** Ignored. Direct Project editor never grants member administration. */
  isDirectProjectEditor?: boolean;
  /** Ignored. Client-provided role claims are never an authority. */
  clientClaimedRole?: string | null;
};

/**
 * Project membership mutation (add / invite / change role / remove).
 * Requires the Project's `workspace_id` and an active Workspace Owner/Admin.
 */
export function authorizeProjectMemberMutation(args: AuthorizeProjectMemberMutationArgs): boolean {
  const workspaceId = resolveAuthoritativeProjectWorkspaceId({
    projectWorkspaceId: args.projectWorkspaceId,
  });
  if (!workspaceId) return false;
  return workspaceRoleCanManageProjectMembers(args.workspaceRole);
}

function viewerContextFromMemberAdminFlags(
  userId: string,
  memberRole: ProjectMemberRole | null,
  canManageProjectMembers: boolean,
): ProjectMembersViewerContext {
  const caps = resolveProjectMemberCapabilityFlags(canManageProjectMembers);
  return {
    currentUserId: userId,
    canManageMembers: canManageProjectMembers,
    memberRole,
    ...caps,
  };
}

export type ProjectMemberMutationAuthority =
  | { ok: true; workspaceId: string }
  | { ok: false; status: 403 | 404; error: string };

/**
 * Independently loads `visualify_projects.workspace_id` and requires an active
 * Workspace Owner/Admin. Does not consult Project role, `owner_user_id`, or client claims.
 */
export async function requireProjectMemberMutationAuthority(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<ProjectMemberMutationAuthority> {
  const { data: project, error } = await supabase
    .from("visualify_projects")
    .select("workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return { ok: false, status: 404, error: "Project not found" };
  }

  const workspaceId = resolveAuthoritativeProjectWorkspaceId({
    projectWorkspaceId:
      typeof project.workspace_id === "string" ? project.workspace_id : null,
  });
  if (!workspaceId) {
    return { ok: false, status: 403, error: "Permission denied" };
  }

  const workspaceRole = await fetchWorkspaceMemberRole(supabase, workspaceId, userId);
  if (
    !authorizeProjectMemberMutation({
      projectWorkspaceId: workspaceId,
      workspaceRole,
    })
  ) {
    return { ok: false, status: 403, error: "Permission denied" };
  }

  return { ok: true, workspaceId };
}

/**
 * Server-side: member list UI + API capability flags (invite vs role/remove).
 * List visibility follows Project access. Mutation flags are Workspace Owner/Admin only.
 */
export async function getProjectMembersViewerContext(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<ProjectMembersViewerContext | null> {
  const { data: project, error: pErr } = await supabase
    .from("visualify_projects")
    .select("owner_user_id, workspace_id")
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
  const workspaceId = resolveAuthoritativeProjectWorkspaceId({
    projectWorkspaceId:
      typeof project.workspace_id === "string" ? project.workspace_id : null,
  });
  const workspaceRole = workspaceId
    ? await fetchWorkspaceMemberRole(supabase, workspaceId, userId)
    : null;
  const canManageProjectMembers = authorizeProjectMemberMutation({
    projectWorkspaceId: workspaceId,
    workspaceRole,
  });

  if (isTableOwner) {
    return viewerContextFromMemberAdminFlags(userId, "owner", canManageProjectMembers);
  }

  if (!memberRow) {
    if (workspaceRole && isWorkspaceRoleAtLeast(workspaceRole, "admin")) {
      return viewerContextFromMemberAdminFlags(userId, null, canManageProjectMembers);
    }
    return null;
  }

  return viewerContextFromMemberAdminFlags(userId, rowRole ?? null, canManageProjectMembers);
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
