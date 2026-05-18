export type ProjectMemberRole = "owner" | "editor" | "viewer";

export type ProjectMemberSource = "direct" | "workspace";

export type ProjectWorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  created_at: string;
  updated_at: string;
};

export type ProfileDisplayRow = {
  id: string;
  first_name: string | null;
  surname: string | null;
  email: string | null;
  company: string | null;
};

/** GET /api/projects/.../members: each row includes nested profile when RLS allows. */
export type ProjectMemberWithProfileRow = ProjectMemberRow & {
  /** PostgREST may use `profiles` or `profile` for the FK embed; API normalizes to this when possible. */
  profiles?: ProfileDisplayRow | ProfileDisplayRow[] | null;
  profile?: ProfileDisplayRow | ProfileDisplayRow[] | null;
  /** Duplicated from profile for Name/Email fallbacks when nested shape differs after JSON. */
  email?: string | null;
  /** Single profile for display after server-side coercion / fill (may be null). */
  resolvedProfile?: ProfileDisplayRow | null;
  /** Direct project_members row vs inherited workspace membership (GET list only). */
  membershipSource?: ProjectMemberSource;
  workspaceRole?: ProjectWorkspaceRole | null;
  /** Display label for inherited workspace rows; not a project_members role. */
  roleLabel?: string;
  /** False for inherited workspace rows (no PATCH/DELETE). */
  isProjectMemberEditable?: boolean;
};

export type ProjectMembersViewerContext = {
  currentUserId: string;
  /** True when the viewer may change roles or remove members (project owner capabilities). */
  canManageMembers: boolean;
  memberRole: ProjectMemberRole | null;
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
};
