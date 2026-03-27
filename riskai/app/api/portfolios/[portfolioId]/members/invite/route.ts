import { NextResponse } from "next/server";
import {
  invitePortfolioUserByEmail,
  InviteToPortfolioError,
} from "@/lib/auth/portfolioInviteByEmail";
import { requireUser } from "@/lib/auth/requireUser";
import { getPortfolioMembersViewerContext } from "@/lib/db/portfolioMemberAccess";
import type { PortfolioMemberRole } from "@/types/portfolioMembers";
import { firstRpcTableRow } from "@/lib/supabase/rpcTableFirstRow";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROLES: PortfolioMemberRole[] = ["owner", "editor", "viewer"];

function isRole(v: unknown): v is PortfolioMemberRole {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

function isAlreadyRegisteredMessage(lower: string): boolean {
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already registered")
  );
}

function isMissingServiceRoleMessage(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("supabase_service_role_key") ||
    lower.includes("admin operations") ||
    lower.includes("missing required environment variable")
  );
}

/**
 * POST /api/portfolios/[portfolioId]/members/invite
 * Sends an account invitation email for non-registered users.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ portfolioId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { portfolioId } = await context.params;
  if (!portfolioId) {
    return NextResponse.json({ error: "Portfolio ID required" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const viewer = await getPortfolioMembersViewerContext(supabase, portfolioId, user.id);
  if (!viewer) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }
  if (!viewer.canInviteMembers) {
    return NextResponse.json(
      { error: "PERMISSION_DENIED", message: "Permission denied." },
      { status: 403 }
    );
  }

  let body: { email?: unknown; role?: unknown; first_name?: unknown; surname?: unknown };
  try {
    body = (await request.json()) as {
      email?: unknown;
      role?: unknown;
      first_name?: unknown;
      surname?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const firstName = typeof body.first_name === "string" ? body.first_name.trim() : "";
  const surname = typeof body.surname === "string" ? body.surname.trim() : "";
  if (!firstName || !surname) {
    return NextResponse.json({ error: "First name and surname are required" }, { status: 400 });
  }
  if (!isRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data: found, error: rpcErr } = await supabase.rpc(
    "riskai_find_profile_by_email_for_portfolio",
    { p_email: email, p_portfolio_id: portfolioId }
  );

  if (rpcErr) {
    const msg = rpcErr.message?.toLowerCase() ?? "";
    if (msg.includes("permission") || msg.includes("policy") || msg.includes("denied")) {
      return NextResponse.json(
        { error: "PERMISSION_DENIED", message: "Permission denied." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "RPC_ERROR", message: "Could not verify email." }, { status: 500 });
  }

  const match = firstRpcTableRow(found);
  const rpcUserIdRaw = match?.user_id ?? match?.id;
  const alreadyMember = match?.already_member === true;

  if (match && rpcUserIdRaw != null && !alreadyMember) {
    return NextResponse.json(
      {
        error: "USER_ALREADY_EXISTS",
        message: "An account already exists for this email. Use Add member.",
      },
      { status: 409 }
    );
  }

  if (match && rpcUserIdRaw != null && alreadyMember) {
    return NextResponse.json(
      {
        error: "USER_ALREADY_EXISTS",
        message: "This user is already a member of the portfolio.",
      },
      { status: 409 }
    );
  }

  try {
    await invitePortfolioUserByEmail({
      email,
      firstName,
      surname,
    });
  } catch (e) {
    if (e instanceof InviteToPortfolioError) {
      if (e.code === "SERVICE_ROLE_UNAVAILABLE") {
        return NextResponse.json(
          {
            error: "INVITE_NOT_CONFIGURED",
            message:
              "Sending invitations is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
          },
          { status: 503 }
        );
      }
      const lower = e.message.toLowerCase();
      if (isAlreadyRegisteredMessage(lower)) {
        return NextResponse.json(
          {
            error: "USER_ALREADY_EXISTS",
            message: "An account already exists for this email. Use Add member.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: "INVITE_FAILED",
          message: "Could not send the invitation. Try again or contact support.",
        },
        { status: 500 }
      );
    }

    const raw = e instanceof Error ? e.message : String(e);
    if (isMissingServiceRoleMessage(raw)) {
      return NextResponse.json(
        {
          error: "INVITE_NOT_CONFIGURED",
          message:
            "Sending invitations is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
        },
        { status: 503 }
      );
    }
    const lower = raw.toLowerCase();
    if (isAlreadyRegisteredMessage(lower)) {
      return NextResponse.json(
        {
          error: "USER_ALREADY_EXISTS",
          message: "An account already exists for this email. Use Add member.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: "INVITE_FAILED",
        message: "Could not send the invitation. Try again or contact support.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "Invitation sent." });
}
