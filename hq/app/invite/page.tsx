import { redirect } from "next/navigation";
import {
  acceptWorkspaceInvitation,
  inviteErrorQueryValue,
  type AcceptWorkspaceInvitationErrorCode,
} from "@/lib/auth/acceptWorkspaceInvitation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { writeVisualifyActiveWorkspaceIdCookie } from "@/lib/workspace-settings-data";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function loginRedirectWithInviteContext(params: {
  inviteToken: string;
  invitedEmail: string;
  mode: string;
  inviteError?: string;
  inviteConflict?: boolean;
}): never {
  const sp = new URLSearchParams();
  sp.set("mode", params.mode || "signup");
  if (params.inviteToken) sp.set("invite_token", params.inviteToken);
  if (params.invitedEmail) sp.set("invited_email", params.invitedEmail);
  if (params.inviteError) sp.set("invite_error", params.inviteError);
  if (params.inviteConflict) sp.set("invite_conflict", "1");
  redirect(`/login?${sp.toString()}`);
}

function redirectInviteFailure(
  code: AcceptWorkspaceInvitationErrorCode,
  inviteToken: string,
  invitedEmail: string,
  mode: string
): never {
  const useConflict =
    code === "EMAIL_MISMATCH" || code === "CONFLICT" || code === "INVITATION_ALREADY_USED";

  loginRedirectWithInviteContext({
    inviteToken,
    invitedEmail,
    mode,
    inviteError: inviteErrorQueryValue(code),
    inviteConflict: useConflict,
  });
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const inviteToken = getParam(params, "invite_token").trim();
  const invitedEmail = getParam(params, "invited_email").trim();
  const mode = getParam(params, "mode");

  const user = await resolveAuthenticatedUser();

  if (!user) {
    if (!inviteToken) {
      redirect("/login?mode=signup&invite_error=invite_token_required");
    }
    loginRedirectWithInviteContext({
      inviteToken,
      invitedEmail,
      mode: mode || "signup",
    });
  }

  if (!inviteToken) {
    redirect("/login?invite_error=invite_token_required");
  }

  const result = await acceptWorkspaceInvitation({
    inviteToken,
    user: { id: user.id, email: user.email },
  });

  if (result.ok) {
    await writeVisualifyActiveWorkspaceIdCookie(result.workspace_id);
    redirect("/dashboard?invite_accepted=1");
  }

  redirectInviteFailure(result.code, inviteToken, invitedEmail, mode || "signup");
}
