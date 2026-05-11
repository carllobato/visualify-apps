export type WorkspaceInviteRole = "admin" | "member";

export type WorkspacePendingInvitationRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  status: string;
};
