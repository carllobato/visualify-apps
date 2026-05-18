/**
 * Access summary:
 * - Table owner → full project + content + members (roles, remove, invite).
 * - project_members.owner → same as table owner for app checks.
 * - project_members.editor → edit project row + risks/snapshots; may invite members (not change roles / remove).
 * - project_members.viewer → read-only project + risks.
 * - Inherited read (workspace/portfolio via `can_read_project`) → viewer only; no edits.
 */
import type { ProjectMemberRole } from "@/types/projectMembers";
import type { ProjectPermissions } from "@/types/projectPermissions";

type ResolveArgs = {
  tableOwnerUserId: string;
  currentUserId: string;
  /** Null when the user has no project_members row. */
  memberRole: ProjectMemberRole | null;
};

/**
 * Read-only permissions when `can_read_project` is true but the user is not table owner
 * and has no direct project_members row (workspace/portfolio inheritance).
 */
export function resolveInheritedProjectReadPermissions(): ProjectPermissions {
  return {
    canEditProjectMetadata: false,
    canEditContent: false,
    canManageMembers: false,
    canDeleteProject: false,
    accessMode: "viewer",
  };
}

/**
 * Direct membership: table ownership or a project_members role. Returns null when neither applies.
 */
export function resolveProjectPermissions({
  tableOwnerUserId,
  currentUserId,
  memberRole,
}: ResolveArgs): ProjectPermissions | null {
  const isTableOwner = tableOwnerUserId === currentUserId;

  if (isTableOwner) {
    return {
      canEditProjectMetadata: true,
      canEditContent: true,
      canManageMembers: true,
      canDeleteProject: false,
      accessMode: "owner",
    };
  }

  if (memberRole === "owner") {
    return {
      canEditProjectMetadata: true,
      canEditContent: true,
      canManageMembers: true,
      canDeleteProject: false,
      accessMode: "owner",
    };
  }

  if (memberRole === "editor") {
    return {
      canEditProjectMetadata: true,
      canEditContent: true,
      canManageMembers: false,
      canDeleteProject: false,
      accessMode: "editor",
    };
  }

  if (memberRole === "viewer") {
    return {
      canEditProjectMetadata: false,
      canEditContent: false,
      canManageMembers: false,
      canDeleteProject: false,
      accessMode: "viewer",
    };
  }

  return null;
}
