import { NextResponse } from "next/server";
import {
  createVisualifyPortfolioInvitationAndInvite,
  InviteToPortfolioError,
} from "@/lib/auth/portfolioInviteByEmail";
import { requireUser } from "@/lib/auth/requireUser";
import {
  authEmailMapFromRpcRows,
  isMemberAuthEmailsRpcMissing,
  memberAuthEmailLookup,
} from "@/lib/db/memberAuthEmailsMap";
import { getPortfolioMembersViewerContext } from "@/lib/db/portfolioMemberAccess";
import { coerceProfileFromUnknown } from "@/lib/profileDisplayCoerce";
import type { ProfileDisplayRow } from "@/types/projectMembers";
import type {
  PortfolioMemberRole,
  PortfolioMemberWithProfileRow,
} from "@/types/portfolioMembers";
import { firstRpcTableRow } from "@/lib/supabase/rpcTableFirstRow";
import { supabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const ROLES: PortfolioMemberRole[] = ["owner", "editor", "viewer"];

function isRole(v: unknown): v is PortfolioMemberRole {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

function portfolioInviteDebugEnabled() {
  return process.env.NODE_ENV === "development" || env.PORTFOLIO_INVITE_DEBUG;
}

function portfolioInviteTraceResponse(body: unknown, status: number) {
  if (portfolioInviteDebugEnabled()) {
    console.warn("[portfolio-invite] final response", { status, body });
  }
  return NextResponse.json(body, { status });
}

function isMissingServiceRoleMessage(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("supabase_service_role_key") ||
    lower.includes("admin operations") ||
    lower.includes("missing required environment variable")
  );
}

function splitInviteNameFromEmail(email: string): { firstName: string; surname: string } {
  const localPart = email.split("@")[0]?.trim() ?? "";
  const cleaned = localPart.replace(/[._+\-]+/g, " ").trim();
  const segments = cleaned.split(/\s+/).filter(Boolean);
  const toTitle = (v: string) => (v ? `${v[0].toUpperCase()}${v.slice(1).toLowerCase()}` : "");
  const first = toTitle(segments[0] ?? "");
  const rest = segments.slice(1).map(toTitle).join(" ").trim();
  return {
    firstName: first || "Invited",
    surname: rest || "User",
  };
}

export async function GET(
  _request: Request,
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

  const { data: members, error: mErr } = await supabase
    .from("visualify_portfolio_members")
    .select("id, portfolio_id, user_id, role, created_at")
    .eq("portfolio_id", portfolioId)
    .order("created_at", { ascending: true });

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const rawRows = (members ?? []) as Record<string, unknown>[];

  if (portfolioInviteDebugEnabled()) {
    console.warn("[portfolio-members] GET raw portfolio_members rows", {
      portfolioId,
      count: rawRows.length,
      rows: rawRows,
    });
  }

  let shaped: PortfolioMemberWithProfileRow[] = rawRows.map((raw) => ({
    id: raw.id as string,
    portfolio_id: raw.portfolio_id as string,
    user_id: raw.user_id as string,
    role: String(raw.role ?? ""),
    created_at: raw.created_at as string,
    profiles: null,
    email: null,
    resolvedProfile: null,
  }));

  const memberUserIds = [...new Set(shaped.map((r) => r.user_id))];
  const profilesMap: Record<string, ProfileDisplayRow> = {};

  if (memberUserIds.length > 0) {
    const { data: profileRows, error: profilesErr } = await supabase
      .from("visualify_profiles")
      .select("id, email, first_name, surname, company")
      .in("id", memberUserIds);

    if (profilesErr) {
      return NextResponse.json({ error: profilesErr.message }, { status: 500 });
    }

    for (const row of profileRows ?? []) {
      const p = coerceProfileFromUnknown(row);
      if (!p?.id) continue;
      profilesMap[p.id] = p;
      if (typeof row === "object" && row !== null && "id" in row) {
        const raw = (row as { id: unknown }).id;
        const rawStr = raw == null ? "" : String(raw);
        if (rawStr && rawStr !== p.id) profilesMap[rawStr] = p;
      }
    }
  }

  let authEmails: Record<string, string> = {};
  if (memberUserIds.length > 0) {
    const { data: authRows, error: authErr } = await supabase.rpc(
      "riskai_portfolio_member_auth_emails",
      { p_portfolio_id: portfolioId, p_user_ids: memberUserIds }
    );
    if (authErr) {
      if (isMemberAuthEmailsRpcMissing(authErr)) {
        authEmails = {};
      } else {
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }
    } else {
      authEmails = authEmailMapFromRpcRows(authRows);
    }
    if (portfolioInviteDebugEnabled()) {
      console.warn("[portfolio-members] GET auth email RPC", {
        portfolioId,
        authErr: authErr
          ? { message: authErr.message, code: authErr.code, details: authErr.details, hint: authErr.hint }
          : null,
        rawAuthRows: authRows,
        authEmailsMap: authEmails,
      });
    }
  }

  shaped = shaped.map((r) => {
    const canonical = profilesMap[r.user_id] ?? null;
    const profileEmail = canonical?.email?.trim();
    return {
      ...r,
      profiles: canonical,
      resolvedProfile: canonical,
      email: profileEmail || memberAuthEmailLookup(authEmails, r.user_id) || r.email || null,
    };
  });

  const profiles: Record<string, ProfileDisplayRow> = {};
  for (const r of shaped) {
    const p = r.profiles;
    if (p && !Array.isArray(p) && p.id) {
      profiles[r.user_id] = p;
    }
  }

  if (portfolioInviteDebugEnabled()) {
    const sample = shaped.find((r) => r.email) ?? shaped[0];
    console.warn("[portfolio-members] GET merged payload sample", {
      portfolioId,
      memberCount: shaped.length,
      sampleMember: sample ?? null,
    });
  }

  return NextResponse.json({
    members: shaped,
    profiles,
    viewer,
    roleSemantics: {
      owner: "Edit portfolio details, invite, and manage member roles",
      editor: "Invite members; cannot edit portfolio details or manage roles",
      viewer: "View settings and members only",
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ portfolioId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { portfolioId } = await context.params;
  if (!portfolioId) {
    return portfolioInviteTraceResponse({ error: "Portfolio ID required" }, 400);
  }

  const supabase = await supabaseServerClient();
  const viewer = await getPortfolioMembersViewerContext(supabase, portfolioId, user.id);
  if (!viewer) {
    return portfolioInviteTraceResponse({ error: "Portfolio not found" }, 404);
  }
  if (!viewer.canInviteMembers) {
    return portfolioInviteTraceResponse({ error: "Permission denied" }, 403);
  }

  let body: { email?: unknown; first_name?: unknown; surname?: unknown; role?: unknown };
  try {
    body = (await request.json()) as {
      email?: unknown;
      first_name?: unknown;
      surname?: unknown;
      role?: unknown;
    };
  } catch {
    return portfolioInviteTraceResponse({ error: "Invalid JSON" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return portfolioInviteTraceResponse({ error: "Email is required" }, 400);
  }
  if (!isRole(body.role)) {
    return portfolioInviteTraceResponse({ error: "Invalid role" }, 400);
  }
  const role = body.role;
  const requestedFirstName = typeof body.first_name === "string" ? body.first_name.trim() : "";
  const requestedSurname = typeof body.surname === "string" ? body.surname.trim() : "";

  const { data: found, error: rpcErr } = await supabase.rpc(
    "riskai_find_profile_by_email_for_portfolio",
    { p_email: email, p_portfolio_id: portfolioId }
  );

  if (portfolioInviteDebugEnabled()) {
    console.warn("[portfolio-invite] raw RPC result", {
      email,
      portfolioId,
      rpcErr: rpcErr
        ? { message: rpcErr.message, code: rpcErr.code, details: rpcErr.details, hint: rpcErr.hint }
        : null,
      rawRpc: found,
      rawRpcType: found === null ? "null" : Array.isArray(found) ? "array" : typeof found,
    });
  }

  if (rpcErr) {
    const msg = rpcErr.message?.toLowerCase() ?? "";
    if (msg.includes("permission") || msg.includes("policy") || msg.includes("denied")) {
      return portfolioInviteTraceResponse(
        { error: "PERMISSION_DENIED", message: "Permission denied" },
        403
      );
    }
    return portfolioInviteTraceResponse({ error: rpcErr.message }, 500);
  }

  const match = firstRpcTableRow(found);

  const rpcUserIdRaw = match?.user_id ?? match?.id;

  if (portfolioInviteDebugEnabled()) {
    const idParsed =
      rpcUserIdRaw == null
        ? null
        : typeof rpcUserIdRaw === "string"
          ? rpcUserIdRaw
          : String(rpcUserIdRaw);
    console.warn("[portfolio-invite] parsed lookup row", {
      parsedRow: match,
      parsedUserId: idParsed,
      parsedAlreadyMember: match?.already_member === true,
    });
  }

  if (match && rpcUserIdRaw != null && match.already_member === true) {
    return portfolioInviteTraceResponse({ ok: true, already_member: true }, 200);
  }

  const derivedName = splitInviteNameFromEmail(email);
  const firstName = requestedFirstName || derivedName.firstName;
  const surname = requestedSurname || derivedName.surname;
  try {
    await createVisualifyPortfolioInvitationAndInvite({
      portfolioId,
      email,
      firstName,
      surname,
      role,
      invitedByUserId: user.id,
    });
  } catch (e) {
    if (e instanceof InviteToPortfolioError) {
      if (e.code === "SERVICE_ROLE_UNAVAILABLE") {
        return portfolioInviteTraceResponse(
          {
            error: "INVITE_NOT_CONFIGURED",
            message:
              "Sending invitations is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
          },
          503
        );
      }
      if (e.code === "INVITATION_DB_FAILED") {
        return portfolioInviteTraceResponse(
          {
            error: "INVITATION_DB_FAILED",
            message: "Could not save the invitation. Try again or contact support.",
          },
          500
        );
      }
    }

    const raw = e instanceof Error ? e.message : String(e);
    if (isMissingServiceRoleMessage(raw)) {
      return portfolioInviteTraceResponse(
        {
          error: "INVITE_NOT_CONFIGURED",
          message:
            "Sending invitations is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
        },
        503
      );
    }
    return portfolioInviteTraceResponse(
      {
        error: "INVITE_FAILED",
        message: "Could not send the invitation. Try again or contact support.",
      },
      500
    );
  }

  if (!match || rpcUserIdRaw == null) {
    return portfolioInviteTraceResponse(
      {
        ok: true,
        invitation_sent: true,
        message: "Invitation sent. They will be added to the portfolio after signup.",
      },
      200
    );
  }

  return portfolioInviteTraceResponse({ ok: true, invitation_sent: true }, 200);
}
