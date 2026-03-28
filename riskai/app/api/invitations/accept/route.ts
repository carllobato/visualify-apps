import { NextResponse } from "next/server";
import { normalizeVisualifyInviteEmail } from "@/lib/auth/projectInviteByEmail";
import { requireUser } from "@/lib/auth/requireUser";
import { supabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Matches `visualify_invitations.invite_token` (hex text, e.g. SHA-256) and legacy UUID tokens. */
function isValidInviteToken(value: string): boolean {
  const t = value.trim();
  if (/^[0-9a-f]{64}$/i.test(t)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
}

function isPostgresUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

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

  const sessionEmail = user.email ? normalizeVisualifyInviteEmail(user.email) : "";
  if (!sessionEmail) {
    return NextResponse.json(
      { error: "EMAIL_REQUIRED", message: "Your account has no email; cannot accept this invitation." },
      { status: 400 }
    );
  }

  let admin: ReturnType<typeof supabaseAdminClient>;
  try {
    admin = supabaseAdminClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Admin client unavailable.";
    const missingServiceRole =
      msg.includes("SUPABASE_SERVICE_ROLE_KEY") || msg.includes("admin operations");
    return NextResponse.json(
      {
        error: missingServiceRole
          ? "Invitation acceptance is not configured: add SUPABASE_SERVICE_ROLE_KEY to the server environment."
          : msg,
        code: missingServiceRole ? "SERVICE_ROLE_MISSING" : undefined,
      },
      { status: 503 }
    );
  }

  const { data: row, error: fetchErr } = await admin
    .from("visualify_invitations")
    .select("id, resource_type, resource_id, email, role, expires_at, status, auth_user_id")
    .eq("invite_token", rawToken)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: "Could not load invitation." }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "INVALID_INVITATION" }, { status: 404 });
  }

  if (row.status === "accepted") {
    if (row.auth_user_id === user.id) {
      if (row.resource_type === "portfolio") {
        return NextResponse.json({ ok: true, resource_type: "portfolio", portfolio_id: row.resource_id });
      }
      return NextResponse.json({ ok: true, resource_type: "project", project_id: row.resource_id });
    }
    return NextResponse.json({ error: "INVITATION_ALREADY_USED" }, { status: 409 });
  }

  if (row.status !== "pending") {
    return NextResponse.json({ error: "INVALID_INVITATION" }, { status: 400 });
  }

  if (row.expires_at) {
    const expMs = new Date(row.expires_at).getTime();
    if (!Number.isFinite(expMs) || expMs <= Date.now()) {
      return NextResponse.json({ error: "EXPIRED" }, { status: 410 });
    }
  }

  if (normalizeVisualifyInviteEmail(row.email) !== sessionEmail) {
    return NextResponse.json(
      { error: "EMAIL_MISMATCH", message: "This invitation was sent to a different email address." },
      { status: 403 }
    );
  }

  const nowIso = new Date().toISOString();

  const membershipTable =
    row.resource_type === "portfolio" ? "visualify_portfolio_members" : "visualify_project_members";
  const membershipResourceColumn = row.resource_type === "portfolio" ? "portfolio_id" : "project_id";

  const { data: existingMember, error: memberLookupErr } = await admin
    .from(membershipTable)
    .select("id")
    .eq(membershipResourceColumn, row.resource_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberLookupErr) {
    return NextResponse.json({ error: "Could not verify project membership." }, { status: 500 });
  }

  if (!existingMember) {
    const { error: insErr } = await admin.from(membershipTable).insert({
      [membershipResourceColumn]: row.resource_id,
      user_id: user.id,
      role: row.role,
    });

    if (insErr && !isPostgresUniqueViolation(insErr)) {
      return NextResponse.json({ error: "Could not add project membership." }, { status: 500 });
    }
  }

  if (row.resource_type === "project") {
    const { data: projectRow, error: projectErr } = await admin
      .from("visualify_projects")
      .select("portfolio_id")
      .eq("id", row.resource_id)
      .maybeSingle();

    if (projectErr) {
      return NextResponse.json({ error: "Could not load project for portfolio access." }, { status: 500 });
    }

    if (!projectRow) {
      return NextResponse.json({ error: "Project not found for invitation." }, { status: 500 });
    }

    const portfolioId = projectRow.portfolio_id;
    if (portfolioId) {
      const { data: existingPortfolioMember, error: pmLookupErr } = await admin
        .from("visualify_portfolio_members")
        .select("id")
        .eq("portfolio_id", portfolioId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (pmLookupErr) {
        return NextResponse.json({ error: "Could not verify portfolio membership." }, { status: 500 });
      }

      if (!existingPortfolioMember) {
        const { error: pmInsErr } = await admin.from("visualify_portfolio_members").insert({
          portfolio_id: portfolioId,
          user_id: user.id,
          role: "viewer",
        });

        if (pmInsErr && !isPostgresUniqueViolation(pmInsErr)) {
          return NextResponse.json({ error: "Could not add portfolio membership." }, { status: 500 });
        }
      }
    }
  }

  const { data: updated, error: updErr } = await admin
    .from("visualify_invitations")
    .update({
      status: "accepted",
      accepted_at: nowIso,
      auth_user_id: user.id,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id");

  if (updErr) {
    return NextResponse.json({ error: "Could not finalize invitation." }, { status: 500 });
  }

  if (!updated?.length) {
    const { data: again } = await admin
      .from("visualify_invitations")
      .select("status, auth_user_id, resource_id")
      .eq("id", row.id)
      .maybeSingle();

    if (again?.status === "accepted" && again.auth_user_id === user.id) {
      if (row.resource_type === "portfolio") {
        return NextResponse.json({ ok: true, resource_type: "portfolio", portfolio_id: again.resource_id });
      }
      return NextResponse.json({ ok: true, resource_type: "project", project_id: again.resource_id });
    }

    return NextResponse.json({ error: "CONFLICT" }, { status: 409 });
  }

  if (row.resource_type === "portfolio") {
    return NextResponse.json({ ok: true, resource_type: "portfolio", portfolio_id: row.resource_id });
  }
  return NextResponse.json({ ok: true, resource_type: "project", project_id: row.resource_id });
}

/**
 * GET /api/invitations/accept?invite_token=… — Accept a pending invitation (session cookie).
 */
export async function GET(request: Request) {
  return handleAccept(request);
}

/**
 * POST /api/invitations/accept — Body: `{ "invite_token": "…" }` (query param also supported).
 */
export async function POST(request: Request) {
  return handleAccept(request);
}
