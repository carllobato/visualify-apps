/**
 * Effective project capabilities for the current user (table owner or direct project_members role).
 * Viewers cannot mutate risks/snapshots.
 */
export type ProjectAccessMode = "owner" | "editor" | "viewer";

export type ProjectPermissions = {
  /** PATCH project (name, etc.); project settings form */
  canEditProjectMetadata: boolean;
  /** Risks, simulation snapshots, AI merge review, etc. */
  canEditContent: boolean;
  /** project_members CRUD */
  canManageMembers: boolean;
  /** Destructive project deletion; requires owner access on both the project and its portfolio. */
  canDeleteProject: boolean;
  accessMode: ProjectAccessMode;
};
