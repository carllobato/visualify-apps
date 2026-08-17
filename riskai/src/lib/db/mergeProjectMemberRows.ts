import {
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@visualify/workspace-product-access";
import type {
  ProjectMemberRole,
  ProjectMemberWithProfileRow,
} from "@/types/projectMembers";

type InheritingWorkspaceRole = Extract<WorkspaceRole, "owner" | "admin" | "viewer">;

function isActiveWorkspaceMemberStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.trim().toLowerCase() === "active";
}

function workspaceRoleLabel(role: WorkspaceRole): string {
  switch (role) {
    case "owner":
      return "Workspace owner";
    case "admin":
      return "Workspace admin";
    case "member":
      return "Workspace member";
    case "viewer":
      return "Workspace viewer";
    default:
      return "Workspace member";
  }
}

function syntheticWorkspaceMemberId(workspaceId: string, userId: string): string {
  return `workspace:${workspaceId}:${userId}`;
}

/**
 * Workspace owner, admin, and viewer inherit every Project.
 * Workspace member appears on a Project only via `visualify_project_members`.
 */
export function workspaceRoleInheritsOntoEveryProject(
  role: WorkspaceRole,
): role is InheritingWorkspaceRole {
  return role === "owner" || role === "admin" || role === "viewer";
}

/**
 * Maps inherited workspace access onto a project `role`.
 * Workspace admin is not a project role; it maps to owner (full inherited project access).
 */
export function inheritedProjectRoleForWorkspaceRole(
  role: InheritingWorkspaceRole,
): ProjectMemberRole {
  return role === "viewer" ? "viewer" : "owner";
}

export type WorkspaceMemberRowForMerge = {
  user_id?: unknown;
  role?: unknown;
  status?: unknown;
  created_at?: unknown;
};

/**
 * Merges direct `visualify_project_members` (authoritative) with inherited workspace access.
 * Dedupes by user_id; direct rows always win over inherited workspace rows.
 */
export function mergeDirectAndInheritedProjectMemberRows(args: {
  projectId: string;
  workspaceId: string;
  directRawRows: Record<string, unknown>[];
  workspaceRows: WorkspaceMemberRowForMerge[] | null | undefined;
}): ProjectMemberWithProfileRow[] {
  const { projectId, workspaceId, directRawRows, workspaceRows } = args;

  const shaped: ProjectMemberWithProfileRow[] = directRawRows.map((raw) => ({
    id: raw.id as string,
    project_id: raw.project_id as string,
    user_id: raw.user_id as string,
    role: raw.role as ProjectMemberRole,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
    profiles: null,
    email: null,
    resolvedProfile: null,
    membershipSource: "direct",
    isProjectMemberEditable: true,
  }));

  const directUserIds = new Set(shaped.map((r) => r.user_id));

  for (const row of workspaceRows ?? []) {
    const userId = typeof row.user_id === "string" ? row.user_id.trim() : "";
    if (!userId || directUserIds.has(userId)) {
      continue;
    }
    if (!isActiveWorkspaceMemberStatus(row.status as string | null | undefined)) {
      continue;
    }

    const workspaceRole = normalizeWorkspaceRole(row.role as string | null | undefined);
    if (!workspaceRole || !workspaceRoleInheritsOntoEveryProject(workspaceRole)) {
      continue;
    }

    const createdAt =
      typeof row.created_at === "string" && row.created_at.trim().length > 0
        ? row.created_at
        : "";

    shaped.push({
      id: syntheticWorkspaceMemberId(workspaceId, userId),
      project_id: projectId,
      user_id: userId,
      role: inheritedProjectRoleForWorkspaceRole(workspaceRole),
      created_at: createdAt,
      updated_at: createdAt,
      profiles: null,
      email: null,
      resolvedProfile: null,
      membershipSource: "workspace",
      workspaceRole,
      roleLabel: workspaceRoleLabel(workspaceRole),
      isProjectMemberEditable: false,
    });
  }

  return shaped;
}
