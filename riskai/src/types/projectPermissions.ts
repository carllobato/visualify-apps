/**
 * Effective project capabilities for the current user (table owner, direct project_members role,
 * or inherited read). Viewers and inherited readers cannot mutate risks/snapshots.
 */
export type ProjectAccessMode = "owner" | "editor" | "viewer";

export type ProjectPermissions = {
  /** PATCH project (name, etc.); project settings form */
  canEditProjectMetadata: boolean;
  /** Risks, simulation snapshots, AI merge review, etc. */
  canEditContent: boolean;
  /**
   * Add / invite / change role / remove Project members.
   * True only for active Workspace Owner/Admin. Direct Project roles never grant this.
   */
  canManageProjectMembers: boolean;
  /** Archive or restore the Project. Workspace Owner/Admin only; never Portfolio or Project Editor. */
  canArchiveProject: boolean;
  accessMode: ProjectAccessMode;
};
