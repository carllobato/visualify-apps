import { redirect } from "next/navigation";
import {
  acceptVisualifyInvitation,
  inviteErrorQueryValue,
  type AcceptVisualifyInvitationErrorCode,
} from "@/lib/auth/acceptVisualifyInvitation";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
import { supabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Appends `invite_accepted=1`, preserving any existing query on `path`. */
function withInviteAcceptedQuery(path: string): string {
  const u = new URL(path, "http://localhost");
  u.searchParams.set("invite_accepted", "1");
  return `${u.pathname}${u.search}`;
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
  code: AcceptVisualifyInvitationErrorCode,
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

  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!inviteToken) {
      redirect("/login?mode=signup");
    }
    loginRedirectWithInviteContext({
      inviteToken,
      invitedEmail,
      mode: mode || "signup",
    });
  }

  if (!inviteToken) {
    redirect(`${DASHBOARD_PATH}?invite_error=invite_token_required`);
  }

  const result = await acceptVisualifyInvitation({
    inviteToken,
    user: { id: user.id, email: user.email },
  });

  if (result.ok) {
    if (result.resource_type === "portfolio" && result.portfolio_id) {
      redirect(withInviteAcceptedQuery(riskaiPath(`/portfolios/${result.portfolio_id}`)));
    }
    if (result.resource_type === "project" && result.project_id) {
      redirect(withInviteAcceptedQuery(riskaiPath(`/projects/${result.project_id}`)));
    }
    redirect(withInviteAcceptedQuery(DASHBOARD_PATH));
  }

  redirectInviteFailure(result.code, inviteToken, invitedEmail, mode || "signup");
}
