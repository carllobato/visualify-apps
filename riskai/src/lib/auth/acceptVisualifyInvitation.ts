import "server-only";

import {
  ensureVisualifyProfileForAuthUser,
  normalizeVisualifyInviteEmail,
} from "@/lib/auth/projectInviteByEmail";
import { supabaseAdminClient } from "@/lib/supabase/admin";

/** Matches `visualify_invitations.invite_token` (hex text, e.g. SHA-256) and legacy UUID tokens. */
export function isValidInviteToken(value: string): boolean {
  const t = value.trim();
  if (/^[0-9a-f]{64}$/i.test(t)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
}

export type AcceptVisualifyInvitationErrorCode =
  | "NOT_AUTHENTICATED"
  | "INVITE_TOKEN_REQUIRED"
  | "INVALID_INVITATION"
  | "EMAIL_MISMATCH"
  | "EMAIL_REQUIRED"
  | "EXPIRED"
  | "SERVICE_ROLE_MISSING"
  | "MEMBERSHIP_INSERT_FAILED"
  | "PROFILE_FAILED"
  | "CONFLICT"
  | "INVITATION_ALREADY_USED"
  | "UNSUPPORTED_INVITATION_TYPE";

export type AcceptVisualifyInvitationSuccess =
  | { ok: true; resource_type: "portfolio"; portfolio_id: string }
  | { ok: true; resource_type: "project"; project_id: string };

export type AcceptVisualifyInvitationFailure = {
  ok: false;
  code: AcceptVisualifyInvitationErrorCode;
  message?: string;
  httpStatus: number;
};

export type AcceptVisualifyInvitationResult =
  | AcceptVisualifyInvitationSuccess
  | AcceptVisualifyInvitationFailure;

/** Query value for `?invite_error=` on the login/invite landing routes. */
export function inviteErrorQueryValue(code: AcceptVisualifyInvitationErrorCode): string {
  switch (code) {
    case "EMAIL_MISMATCH":
      return "email_mismatch";
    case "EXPIRED":
      return "expired";
    case "INVALID_INVITATION":
      return "invalid_invitation";
    case "SERVICE_ROLE_MISSING":
      return "service_role_missing";
    case "MEMBERSHIP_INSERT_FAILED":
      return "membership_insert_failed";
    case "NOT_AUTHENTICATED":
      return "not_authenticated";
    case "INVITE_TOKEN_REQUIRED":
      return "invite_token_required";
    case "EMAIL_REQUIRED":
      return "email_required";
    case "CONFLICT":
      return "conflict";
    case "INVITATION_ALREADY_USED":
      return "invitation_already_used";
    case "UNSUPPORTED_INVITATION_TYPE":
      return "unsupported_invitation";
    case "PROFILE_FAILED":
      return "profile_failed";
    default:
      return "unknown";
  }
}

function isPostgresUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

function failure(
  code: AcceptVisualifyInvitationErrorCode,
  httpStatus: number,
  message?: string
): AcceptVisualifyInvitationFailure {
  console.warn("[acceptVisualifyInvitation] invitation failed", { code, message });
  return { ok: false, code, httpStatus, message };
}

export type AcceptVisualifyInvitationParams = {
  inviteToken: string;
  user: { id: string; email?: string | null };
};

/**
 * Accepts a pending project or portfolio invitation for the authenticated user.
 * Uses the service-role client for membership and invitation writes.
 */
export async function acceptVisualifyInvitation(
  params: AcceptVisualifyInvitationParams
): Promise<AcceptVisualifyInvitationResult> {
  const rawToken = params.inviteToken.trim();
  if (!rawToken) {
    return failure("INVITE_TOKEN_REQUIRED", 400, "invite_token is required");
  }
  if (!isValidInviteToken(rawToken)) {
    return failure("INVALID_INVITATION", 400);
  }

  const user = params.user;
  if (!user?.id) {
    return failure("NOT_AUTHENTICATED", 401);
  }

  const sessionEmail = user.email ? normalizeVisualifyInviteEmail(user.email) : "";
  if (!sessionEmail) {
    return failure(
      "EMAIL_REQUIRED",
      400,
      "Your account has no email; cannot accept this invitation."
    );
  }

  let admin: ReturnType<typeof supabaseAdminClient>;
  try {
    admin = supabaseAdminClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Admin client unavailable.";
    const missingServiceRole =
      msg.includes("SUPABASE_SERVICE_ROLE_KEY") || msg.includes("admin operations");
    return failure(
      "SERVICE_ROLE_MISSING",
      503,
      missingServiceRole
        ? "Invitation acceptance is not configured: add SUPABASE_SERVICE_ROLE_KEY to the server environment."
        : msg
    );
  }

  const { data: row, error: fetchErr } = await admin
    .from("visualify_invitations")
    .select("id, resource_type, resource_id, email, role, expires_at, status, auth_user_id")
    .eq("invite_token", rawToken)
    .maybeSingle();

  if (fetchErr) {
    return failure("INVALID_INVITATION", 500, "Could not load invitation.");
  }

  if (!row) {
    return failure("INVALID_INVITATION", 404);
  }

  if (row.resource_type !== "project" && row.resource_type !== "portfolio") {
    return failure("UNSUPPORTED_INVITATION_TYPE", 400);
  }

  if (row.status === "accepted") {
    if (row.auth_user_id === user.id) {
      console.info("[acceptVisualifyInvitation] invitation already accepted", {
        userId: user.id,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
      });
      if (row.resource_type === "portfolio") {
        return { ok: true, resource_type: "portfolio", portfolio_id: row.resource_id };
      }
      return { ok: true, resource_type: "project", project_id: row.resource_id };
    }
    return failure("INVITATION_ALREADY_USED", 409);
  }

  if (row.status !== "pending") {
    return failure("INVALID_INVITATION", 400);
  }

  if (row.expires_at) {
    const expMs = new Date(row.expires_at).getTime();
    if (!Number.isFinite(expMs) || expMs <= Date.now()) {
      return failure("EXPIRED", 410);
    }
  }

  if (normalizeVisualifyInviteEmail(row.email) !== sessionEmail) {
    return failure(
      "EMAIL_MISMATCH",
      403,
      "This invitation was sent to a different email address."
    );
  }

  const invitedEmail =
    typeof row.email === "string" && row.email.trim() ? row.email : user.email ?? "";
  try {
    await ensureVisualifyProfileForAuthUser(admin, {
      userId: user.id,
      email: invitedEmail,
    });
  } catch (err) {
    console.error("[acceptVisualifyInvitation] ensureVisualifyProfileForAuthUser failed", {
      userId: user.id,
      invitationEmail: invitedEmail,
      message: err instanceof Error ? err.message : String(err),
    });
    return failure("PROFILE_FAILED", 500, "Could not prepare account profile.");
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
    return failure("MEMBERSHIP_INSERT_FAILED", 500, "Could not verify membership.");
  }

  if (!existingMember) {
    const { error: insErr } = await admin.from(membershipTable).insert({
      [membershipResourceColumn]: row.resource_id,
      user_id: user.id,
      role: row.role,
    });

    if (insErr && !isPostgresUniqueViolation(insErr)) {
      console.error("[acceptVisualifyInvitation] membership insert failed", {
        userId: user.id,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        message: insErr.message,
        code: insErr.code,
      });
      return failure("MEMBERSHIP_INSERT_FAILED", 500, "Could not add membership.");
    }

    console.info("[acceptVisualifyInvitation] membership inserted", {
      userId: user.id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      role: row.role,
    });
  }

  if (row.resource_type === "project") {
    const { data: projectRow, error: projectErr } = await admin
      .from("visualify_projects")
      .select("portfolio_id")
      .eq("id", row.resource_id)
      .maybeSingle();

    if (projectErr) {
      return failure("MEMBERSHIP_INSERT_FAILED", 500, "Could not load project for portfolio access.");
    }

    if (!projectRow) {
      return failure("MEMBERSHIP_INSERT_FAILED", 500, "Project not found for invitation.");
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
        return failure("MEMBERSHIP_INSERT_FAILED", 500, "Could not verify portfolio membership.");
      }

      if (!existingPortfolioMember) {
        const { error: pmInsErr } = await admin.from("visualify_portfolio_members").insert({
          portfolio_id: portfolioId,
          user_id: user.id,
          role: "viewer",
        });

        if (pmInsErr && !isPostgresUniqueViolation(pmInsErr)) {
          console.error("[acceptVisualifyInvitation] portfolio membership insert failed", {
            userId: user.id,
            portfolioId,
            message: pmInsErr.message,
            code: pmInsErr.code,
          });
          return failure("MEMBERSHIP_INSERT_FAILED", 500, "Could not add portfolio membership.");
        }

        console.info("[acceptVisualifyInvitation] portfolio membership inserted", {
          userId: user.id,
          portfolioId,
          role: "viewer",
        });
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
    return failure("MEMBERSHIP_INSERT_FAILED", 500, "Could not finalize invitation.");
  }

  if (!updated?.length) {
    const { data: again } = await admin
      .from("visualify_invitations")
      .select("status, auth_user_id, resource_id")
      .eq("id", row.id)
      .maybeSingle();

    if (again?.status === "accepted" && again.auth_user_id === user.id) {
      console.info("[acceptVisualifyInvitation] invitation accepted (race)", {
        userId: user.id,
        resourceType: row.resource_type,
        resourceId: again.resource_id,
      });
      if (row.resource_type === "portfolio") {
        return { ok: true, resource_type: "portfolio", portfolio_id: again.resource_id };
      }
      return { ok: true, resource_type: "project", project_id: again.resource_id };
    }

    return failure("CONFLICT", 409);
  }

  console.info("[acceptVisualifyInvitation] invitation accepted", {
    userId: user.id,
    invitationId: row.id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
  });

  if (row.resource_type === "portfolio") {
    return { ok: true, resource_type: "portfolio", portfolio_id: row.resource_id };
  }
  return { ok: true, resource_type: "project", project_id: row.resource_id };
}
