/**
 * Access summary (aligned with RLS, 20250328_project_members + editor invite migration):
 * - Table owner → full project + content + members (roles, remove, invite).
 * - project_members.owner → same as table owner for app checks.
 * - project_members.editor → edit project row + risks/snapshots; may invite members (not change roles / remove).
 * - project_members.viewer → read-only project + risks.
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
 * Pure helper: project access requires table ownership or a direct project_members row.
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
      accessMode: "owner",
    };
  }

  if (memberRole === "owner") {
    return {
      canEditProjectMetadata: true,
      canEditContent: true,
      canManageMembers: true,
      accessMode: "owner",
    };
  }

  if (memberRole === "editor") {
    return {
      canEditProjectMetadata: true,
      canEditContent: true,
      canManageMembers: false,
      accessMode: "editor",
    };
  }

  if (memberRole === "viewer") {
    return {
      canEditProjectMetadata: false,
      canEditContent: false,
      canManageMembers: false,
      accessMode: "viewer",
    };
  }

  return null;
}
