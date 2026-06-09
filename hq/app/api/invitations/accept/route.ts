import { NextResponse, type NextRequest } from "next/server";
import {
  acceptWorkspaceInvitation,
  inviteErrorQueryValue,
  isValidInviteToken,
  type AcceptWorkspaceInvitationErrorCode,
} from "@/lib/auth/acceptWorkspaceInvitation";
import { requireUser } from "@/lib/auth/requireUser";
import { writeVisualifyActiveWorkspaceIdCookie } from "@/lib/workspace-settings-data";

export const dynamic = "force-dynamic";

async function readInviteToken(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("invite_token");
  if (fromQuery?.trim()) return fromQuery.trim();

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { invite_token?: unknown };
      const t = typeof body.invite_token === "string" ? body.invite_token.trim() : "";
      if (t) return t;
    } catch {
      return null;
    }
  }

  return null;
}

function resultToResponse(result: Awaited<ReturnType<typeof acceptWorkspaceInvitation>>) {
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      resource_type: "workspace",
      workspace_id: result.workspace_id,
    });
  }

  const body: { error: string; message?: string; code?: string } = {
    error: result.code,
  };
  if (result.message) body.message = result.message;
  if (result.code === "SERVICE_ROLE_MISSING") body.code = "SERVICE_ROLE_MISSING";

  return NextResponse.json(body, { status: result.httpStatus });
}

function readInviteContext(request: NextRequest): {
  inviteToken: string;
  invitedEmail: string;
  mode: string;
} {
  const url = new URL(request.url);
  return {
    inviteToken: url.searchParams.get("invite_token")?.trim() ?? "",
    invitedEmail: url.searchParams.get("invited_email")?.trim() ?? "",
    mode: url.searchParams.get("mode")?.trim() ?? "",
  };
}

function loginRedirectWithInviteContext(
  request: NextRequest,
  params: {
    inviteToken: string;
    invitedEmail: string;
    mode: string;
    inviteError?: string;
    inviteConflict?: boolean;
  },
): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("mode", params.mode || "signup");
  if (params.inviteToken) loginUrl.searchParams.set("invite_token", params.inviteToken);
  if (params.invitedEmail) loginUrl.searchParams.set("invited_email", params.invitedEmail);
  if (params.inviteError) loginUrl.searchParams.set("invite_error", params.inviteError);
  if (params.inviteConflict) loginUrl.searchParams.set("invite_conflict", "1");
  return NextResponse.redirect(loginUrl, 303);
}

function inviteFailureRedirect(
  request: NextRequest,
  code: AcceptWorkspaceInvitationErrorCode,
  inviteToken: string,
  invitedEmail: string,
  mode: string,
): NextResponse {
  const useConflict =
    code === "EMAIL_MISMATCH" || code === "CONFLICT" || code === "INVITATION_ALREADY_USED";

  return loginRedirectWithInviteContext(request, {
    inviteToken,
    invitedEmail,
    mode: mode || "signup",
    inviteError: inviteErrorQueryValue(code),
    inviteConflict: useConflict,
  });
}

async function handleAccept(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const rawToken = await readInviteToken(request);
  if (!rawToken) {
    return NextResponse.json({ error: "invite_token is required" }, { status: 400 });
  }
  if (!isValidInviteToken(rawToken)) {
    return NextResponse.json({ error: "INVALID_INVITATION" }, { status: 400 });
  }

  const result = await acceptWorkspaceInvitation({
    inviteToken: rawToken,
    user: { id: user.id, email: user.email },
  });

  if (result.ok) {
    await writeVisualifyActiveWorkspaceIdCookie(result.workspace_id);
  }

  return resultToResponse(result);
}

/**
 * GET /api/invitations/accept?invite_token=… — Browser invite accept (redirect + Set-Cookie).
 */
export async function GET(request: NextRequest) {
  const { inviteToken, invitedEmail, mode } = readInviteContext(request);

  const user = await requireUser();
  if (user instanceof NextResponse) {
    if (!inviteToken) {
      return NextResponse.redirect(new URL("/login?mode=signup&invite_error=invite_token_required", request.url), 303);
    }
    return loginRedirectWithInviteContext(request, {
      inviteToken,
      invitedEmail,
      mode: mode || "signup",
    });
  }

  if (!inviteToken) {
    return NextResponse.redirect(new URL("/login?invite_error=invite_token_required", request.url), 303);
  }
  if (!isValidInviteToken(inviteToken)) {
    return inviteFailureRedirect(request, "INVALID_INVITATION", inviteToken, invitedEmail, mode);
  }

  const result = await acceptWorkspaceInvitation({
    inviteToken,
    user: { id: user.id, email: user.email },
  });

  if (result.ok) {
    await writeVisualifyActiveWorkspaceIdCookie(result.workspace_id);
    return NextResponse.redirect(new URL("/dashboard?invite_accepted=1", request.url), 303);
  }

  return inviteFailureRedirect(request, result.code, inviteToken, invitedEmail, mode);
}

/**
 * POST /api/invitations/accept — Body: `{ "invite_token": "…" }` (query param also supported).
 */
export async function POST(request: Request) {
  return handleAccept(request);
}
