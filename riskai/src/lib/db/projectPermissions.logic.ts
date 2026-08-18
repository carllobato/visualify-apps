/**
 * Access summary:
 * - Table owner → project content + metadata. Member administration is not granted here.
 * - project_members.owner → same content/metadata as table owner; no member administration.
 * - project_members.editor → working user: edit risks/snapshots; no project metadata or member admin.
 * - project_members.viewer → read-only project + risks.
 * - Inherited read (workspace via `can_read_project`) → viewer only; no edits.
 * - `canManageProjectMembers` is overlaid from active Workspace Owner/Admin only.
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
 * and has no direct project_members row (workspace inheritance).
 */
export function resolveInheritedProjectReadPermissions(): ProjectPermissions {
  return {
    canEditProjectMetadata: false,
    canEditContent: false,
    canManageProjectMembers: false,
    canArchiveProject: false,
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
      canManageProjectMembers: false,
      canArchiveProject: false,
      accessMode: "owner",
    };
  }

  if (memberRole === "owner") {
    return {
      canEditProjectMetadata: true,
      canEditContent: true,
      canManageProjectMembers: false,
      canArchiveProject: false,
      accessMode: "owner",
    };
  }

  if (memberRole === "editor") {
    return {
      canEditProjectMetadata: false,
      canEditContent: true,
      canManageProjectMembers: false,
      canArchiveProject: false,
      accessMode: "editor",
    };
  }

  if (memberRole === "viewer") {
    return {
      canEditProjectMetadata: false,
      canEditContent: false,
      canManageProjectMembers: false,
      canArchiveProject: false,
      accessMode: "viewer",
    };
  }

  return null;
}
