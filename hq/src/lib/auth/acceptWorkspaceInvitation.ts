import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeWorkspaceInviteEmail } from "@/lib/workspace-invitations";
import { isWorkspaceInviteRole } from "@/types/workspace-invitations";
import { supabaseAdminClient } from "@/lib/supabase/admin";

/** Matches `visualify_invitations.invite_token` (hex text, e.g. SHA-256) and legacy UUID tokens. */
export function isValidInviteToken(value: string): boolean {
  const t = value.trim();
  if (/^[0-9a-f]{64}$/i.test(t)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
}

export type AcceptWorkspaceInvitationErrorCode =
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

export type AcceptWorkspaceInvitationSuccess = {
  ok: true;
  workspace_id: string;
};

export type AcceptWorkspaceInvitationFailure = {
  ok: false;
  code: AcceptWorkspaceInvitationErrorCode;
  message?: string;
  httpStatus: number;
};

export type AcceptWorkspaceInvitationResult =
  | AcceptWorkspaceInvitationSuccess
  | AcceptWorkspaceInvitationFailure;

/** Query value for `?invite_error=` on the login/invite routes. */
export function inviteErrorQueryValue(code: AcceptWorkspaceInvitationErrorCode): string {
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

function postgresErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: string }).message);
  }
  return "";
}

function isPostgresUndefinedColumn(err: unknown, columnName?: string): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  const code = (err as { code: string }).code;
  if (code !== "42703" && code !== "PGRST204") return false;
  if (!columnName) return true;
  return postgresErrorMessage(err).toLowerCase().includes(columnName.toLowerCase());
}

function failure(
  code: AcceptWorkspaceInvitationErrorCode,
  httpStatus: number,
  message?: string
): AcceptWorkspaceInvitationFailure {
  console.warn("[acceptWorkspaceInvitation] invitation failed", { code, message });
  return { ok: false, code, httpStatus, message };
}

function parseWorkspaceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureVisualifyProfileForAuthUser(
  admin: SupabaseClient,
  params: { userId: string; email: string }
): Promise<void> {
  const emailNormalized = normalizeWorkspaceInviteEmail(params.email);

  const { data: existing, error: selErr } = await admin
    .from("visualify_profiles")
    .select("id")
    .eq("id", params.userId)
    .maybeSingle();

  if (selErr) {
    throw selErr;
  }
  if (existing?.id) {
    return;
  }

  const { error: insErr } = await admin.from("visualify_profiles").insert({
    id: params.userId,
    email: emailNormalized.length > 0 ? emailNormalized : null,
  });

  if (insErr && !isPostgresUniqueViolation(insErr)) {
    throw insErr;
  }
}

async function findWorkspaceMembershipRow(
  admin: SupabaseClient,
  workspaceId: string,
  userId: string
) {
  return admin
    .from("visualify_workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
}

/**
 * Idempotent workspace membership for workspace invitations.
 * Sets status to active when the column exists; omits status if the column is absent.
 */
async function ensureWorkspaceMemberRow(
  admin: SupabaseClient,
  params: {
    workspaceId: string;
    userId: string;
    role: string;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { workspaceId, userId, role } = params;

  const { data: existing, error: lookupErr } = await findWorkspaceMembershipRow(
    admin,
    workspaceId,
    userId
  );

  if (lookupErr) {
    if (
      isPostgresUndefinedColumn(lookupErr, "workspace_id") ||
      isPostgresUndefinedColumn(lookupErr, "user_id") ||
      isPostgresUndefinedColumn(lookupErr, "role")
    ) {
      return { ok: false, message: "Workspace membership table is missing a required column." };
    }
    console.error("[acceptWorkspaceInvitation] workspace membership lookup failed", {
      userId,
      workspaceId,
      message: lookupErr.message,
    });
    return { ok: false, message: "Could not verify workspace membership." };
  }

  if (existing?.id) {
    console.info("[acceptWorkspaceInvitation] workspace membership already existed", {
      userId,
      workspaceId,
      membershipId: existing.id,
    });
    return { ok: true };
  }

  const basePayload = {
    workspace_id: workspaceId,
    user_id: userId,
    role,
  };

  async function insertWorkspaceMember(includeStatus: boolean) {
    const payload = includeStatus ? { ...basePayload, status: "active" as const } : basePayload;
    return admin.from("visualify_workspace_members").insert(payload);
  }

  let insErr = (await insertWorkspaceMember(true)).error;

  if (insErr && isPostgresUndefinedColumn(insErr, "status")) {
    insErr = (await insertWorkspaceMember(false)).error;
  }

  if (insErr) {
    if (
      isPostgresUndefinedColumn(insErr, "workspace_id") ||
      isPostgresUndefinedColumn(insErr, "user_id") ||
      isPostgresUndefinedColumn(insErr, "role")
    ) {
      return { ok: false, message: "Workspace membership table is missing a required column." };
    }

    if (isPostgresUniqueViolation(insErr)) {
      const { data: raced, error: raceLookupErr } = await findWorkspaceMembershipRow(
        admin,
        workspaceId,
        userId
      );

      if (raceLookupErr) {
        console.error("[acceptWorkspaceInvitation] workspace membership verification failed", {
          userId,
          workspaceId,
          message: raceLookupErr.message,
        });
        return { ok: false, message: "Could not verify workspace membership after conflict." };
      }

      if (raced?.id) {
        console.info(
          "[acceptWorkspaceInvitation] workspace membership verified after unique violation",
          { userId, workspaceId, membershipId: raced.id }
        );
        return { ok: true };
      }

      return { ok: false, message: "Workspace membership row missing after unique violation." };
    }

    console.error("[acceptWorkspaceInvitation] workspace membership insert failed", {
      userId,
      workspaceId,
      message: insErr.message,
      code: insErr.code,
    });
    return { ok: false, message: "Could not add workspace membership." };
  }

  const { data: verified, error: verifyErr } = await findWorkspaceMembershipRow(
    admin,
    workspaceId,
    userId
  );

  if (verifyErr || !verified?.id) {
    console.error("[acceptWorkspaceInvitation] workspace membership verification failed", {
      userId,
      workspaceId,
      message: verifyErr?.message ?? "Row not found after insert.",
    });
    return { ok: false, message: "Workspace membership row missing after insert." };
  }

  console.info("[acceptWorkspaceInvitation] workspace membership inserted", {
    userId,
    workspaceId,
    membershipId: verified.id,
    role,
  });
  return { ok: true };
}

async function ensureWorkspaceMembership(
  admin: SupabaseClient,
  row: { resource_id: unknown; role: unknown },
  userId: string
): Promise<
  | { ok: true; workspaceId: string }
  | { ok: false; code: "INVALID_INVITATION" | "MEMBERSHIP_INSERT_FAILED"; message?: string }
> {
  const workspaceId = parseWorkspaceId(row.resource_id);
  if (!workspaceId) {
    return { ok: false, code: "INVALID_INVITATION", message: "Invitation has no workspace id." };
  }

  const role = typeof row.role === "string" && row.role.trim() ? row.role.trim() : "";
  if (!role || !isWorkspaceInviteRole(role)) {
    return { ok: false, code: "INVALID_INVITATION", message: "Invitation has an invalid role." };
  }

  const ensured = await ensureWorkspaceMemberRow(admin, {
    workspaceId,
    userId,
    role,
  });
  if (!ensured.ok) {
    return { ok: false, code: "MEMBERSHIP_INSERT_FAILED", message: ensured.message };
  }
  return { ok: true, workspaceId };
}

export type AcceptWorkspaceInvitationParams = {
  inviteToken: string;
  user: { id: string; email?: string | null };
};

/**
 * Accepts a pending workspace invitation for the authenticated user.
 * Uses the service-role client for membership and invitation writes.
 */
export async function acceptWorkspaceInvitation(
  params: AcceptWorkspaceInvitationParams
): Promise<AcceptWorkspaceInvitationResult> {
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

  const sessionEmail = user.email ? normalizeWorkspaceInviteEmail(user.email) : "";
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

  if (row.resource_type !== "workspace") {
    return failure("UNSUPPORTED_INVITATION_TYPE", 400);
  }

  if (row.status === "accepted") {
    if (row.auth_user_id === user.id) {
      const membership = await ensureWorkspaceMembership(admin, row, user.id);
      if (!membership.ok) {
        if (membership.code === "INVALID_INVITATION") {
          return failure("INVALID_INVITATION", 400, membership.message);
        }
        return failure("MEMBERSHIP_INSERT_FAILED", 500, membership.message);
      }
      console.info("[acceptWorkspaceInvitation] invitation already accepted; membership ensured", {
        userId: user.id,
        workspaceId: membership.workspaceId,
      });
      return { ok: true, workspace_id: membership.workspaceId };
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

  if (normalizeWorkspaceInviteEmail(row.email) !== sessionEmail) {
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
    console.error("[acceptWorkspaceInvitation] ensureVisualifyProfileForAuthUser failed", {
      userId: user.id,
      invitationEmail: invitedEmail,
      message: err instanceof Error ? err.message : String(err),
    });
    return failure("PROFILE_FAILED", 500, "Could not prepare account profile.");
  }

  const membership = await ensureWorkspaceMembership(admin, row, user.id);
  if (!membership.ok) {
    if (membership.code === "INVALID_INVITATION") {
      return failure("INVALID_INVITATION", 400, membership.message);
    }
    return failure("MEMBERSHIP_INSERT_FAILED", 500, membership.message);
  }

  const nowIso = new Date().toISOString();
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
      .select("status, auth_user_id, resource_id, role")
      .eq("id", row.id)
      .maybeSingle();

    if (again?.status === "accepted" && again.auth_user_id === user.id) {
      const racedMembership = await ensureWorkspaceMembership(admin, again, user.id);
      if (!racedMembership.ok) {
        if (racedMembership.code === "INVALID_INVITATION") {
          return failure("INVALID_INVITATION", 400, racedMembership.message);
        }
        return failure("MEMBERSHIP_INSERT_FAILED", 500, racedMembership.message);
      }
      console.info("[acceptWorkspaceInvitation] invitation accepted (race); membership ensured", {
        userId: user.id,
        workspaceId: racedMembership.workspaceId,
      });
      return { ok: true, workspace_id: racedMembership.workspaceId };
    }

    return failure("CONFLICT", 409);
  }

  console.info("[acceptWorkspaceInvitation] invitation accepted", {
    userId: user.id,
    invitationId: row.id,
    workspaceId: membership.workspaceId,
  });

  return { ok: true, workspace_id: membership.workspaceId };
}
