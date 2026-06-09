import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";

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

  const acceptParams = new URLSearchParams();
  acceptParams.set("invite_token", inviteToken);
  if (invitedEmail) acceptParams.set("invited_email", invitedEmail);
  if (mode) acceptParams.set("mode", mode);
  redirect(`/api/invitations/accept?${acceptParams.toString()}`);
}
