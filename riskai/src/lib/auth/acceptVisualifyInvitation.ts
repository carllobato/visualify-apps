import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
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
  | { ok: true; resource_type: "project"; project_id: string }
  | { ok: true; resource_type: "workspace"; workspace_id: string };

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

type InvitationMembershipRow = {
  resource_type: string;
  resource_id: unknown;
  role: unknown;
};

type EnsureMembershipResult =
  | { ok: true; resourceId: string }
  | { ok: false; code: "INVALID_INVITATION" | "MEMBERSHIP_INSERT_FAILED"; message?: string };

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
  code: AcceptVisualifyInvitationErrorCode,
  httpStatus: number,
  message?: string
): AcceptVisualifyInvitationFailure {
  console.warn("[acceptVisualifyInvitation] invitation failed", { code, message });
  return { ok: false, code, httpStatus, message };
}

function parseResourceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function invitationRole(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function successForInvitation(
  resourceType: string,
  resourceId: string
): AcceptVisualifyInvitationSuccess {
  if (resourceType === "portfolio") {
    return { ok: true, resource_type: "portfolio", portfolio_id: resourceId };
  }
  if (resourceType === "workspace") {
    return { ok: true, resource_type: "workspace", workspace_id: resourceId };
  }
  return { ok: true, resource_type: "project", project_id: resourceId };
}

async function findMembershipRow(
  admin: SupabaseClient,
  table: "visualify_project_members" | "visualify_portfolio_members",
  resourceColumn: "project_id" | "portfolio_id",
  resourceId: string,
  userId: string
) {
  return admin
    .from(table)
    .select("id")
    .eq(resourceColumn, resourceId)
    .eq("user_id", userId)
    .maybeSingle();
}

/**
 * Idempotent: ensures a membership row exists for the invited user and resource.
 * Returns INVALID_INVITATION when resource_id is missing (caller must not mark accepted).
 */
async function ensureMemberRow(
  admin: SupabaseClient,
  params: {
    table: "visualify_project_members" | "visualify_portfolio_members";
    resourceColumn: "project_id" | "portfolio_id";
    resourceId: string;
    userId: string;
    role: string;
    resourceType: string;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { table, resourceColumn, resourceId, userId, role, resourceType } = params;

  const { data: existing, error: lookupErr } = await findMembershipRow(
    admin,
    table,
    resourceColumn,
    resourceId,
    userId
  );

  if (lookupErr) {
    console.error("[acceptVisualifyInvitation] membership lookup failed", {
      userId,
      resourceType,
      resourceId,
      table,
      message: lookupErr.message,
    });
    return { ok: false, message: "Could not verify membership." };
  }

  if (existing?.id) {
    console.info("[acceptVisualifyInvitation] membership already existed", {
      userId,
      resourceType,
      resourceId,
      table,
      membershipId: existing.id,
    });
    return { ok: true };
  }

  const { error: insErr } = await admin.from(table).insert({
    [resourceColumn]: resourceId,
    user_id: userId,
    role,
  });

  if (insErr) {
    if (isPostgresUniqueViolation(insErr)) {
      const { data: raced, error: raceLookupErr } = await findMembershipRow(
        admin,
        table,
        resourceColumn,
        resourceId,
        userId
      );

      if (raceLookupErr) {
        console.error("[acceptVisualifyInvitation] membership verification failed", {
          userId,
          resourceType,
          resourceId,
          table,
          message: raceLookupErr.message,
        });
        return { ok: false, message: "Could not verify membership after conflict." };
      }

      if (raced?.id) {
        console.info("[acceptVisualifyInvitation] membership verified after unique violation", {
          userId,
          resourceType,
          resourceId,
          table,
          membershipId: raced.id,
        });
        return { ok: true };
      }

      console.error("[acceptVisualifyInvitation] membership verification failed", {
        userId,
        resourceType,
        resourceId,
        table,
        message: insErr.message,
        code: insErr.code,
      });
      return { ok: false, message: "Membership row missing after unique violation." };
    }

    console.error("[acceptVisualifyInvitation] membership insert failed", {
      userId,
      resourceType,
      resourceId,
      table,
      message: insErr.message,
      code: insErr.code,
    });
    return { ok: false, message: "Could not add membership." };
  }

  const { data: verified, error: verifyErr } = await findMembershipRow(
    admin,
    table,
    resourceColumn,
    resourceId,
    userId
  );

  if (verifyErr || !verified?.id) {
    console.error("[acceptVisualifyInvitation] membership verification failed", {
      userId,
      resourceType,
      resourceId,
      table,
      message: verifyErr?.message ?? "Row not found after insert.",
    });
    return { ok: false, message: "Membership row missing after insert." };
  }

  console.info("[acceptVisualifyInvitation] membership inserted", {
    userId,
    resourceType,
    resourceId,
    table,
    membershipId: verified.id,
    role,
  });
  return { ok: true };
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
    console.error("[acceptVisualifyInvitation] workspace membership lookup failed", {
      userId,
      workspaceId,
      message: lookupErr.message,
    });
    return { ok: false, message: "Could not verify workspace membership." };
  }

  if (existing?.id) {
    console.info("[acceptVisualifyInvitation] workspace membership already existed", {
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
        console.error("[acceptVisualifyInvitation] workspace membership verification failed", {
          userId,
          workspaceId,
          message: raceLookupErr.message,
        });
        return { ok: false, message: "Could not verify workspace membership after conflict." };
      }

      if (raced?.id) {
        console.info(
          "[acceptVisualifyInvitation] workspace membership verified after unique violation",
          { userId, workspaceId, membershipId: raced.id }
        );
        return { ok: true };
      }

      return { ok: false, message: "Workspace membership row missing after unique violation." };
    }

    console.error("[acceptVisualifyInvitation] workspace membership insert failed", {
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
    console.error("[acceptVisualifyInvitation] workspace membership verification failed", {
      userId,
      workspaceId,
      message: verifyErr?.message ?? "Row not found after insert.",
    });
    return { ok: false, message: "Workspace membership row missing after insert." };
  }

  console.info("[acceptVisualifyInvitation] workspace membership inserted", {
    userId,
    workspaceId,
    membershipId: verified.id,
    role,
  });
  return { ok: true };
}

async function ensureMembershipForInvitation(
  row: InvitationMembershipRow,
  user: { id: string },
  admin: SupabaseClient
): Promise<EnsureMembershipResult> {
  const resourceId = parseResourceId(row.resource_id);
  if (!resourceId) {
    console.warn("[acceptVisualifyInvitation] invitation missing resource_id", {
      userId: user.id,
      resourceType: row.resource_type,
    });
    return { ok: false, code: "INVALID_INVITATION", message: "Invitation has no resource id." };
  }

  const role = invitationRole(row.role);
  if (!role) {
    return { ok: false, code: "INVALID_INVITATION", message: "Invitation has no role." };
  }

  if (row.resource_type === "portfolio") {
    const ensured = await ensureMemberRow(admin, {
      table: "visualify_portfolio_members",
      resourceColumn: "portfolio_id",
      resourceId,
      userId: user.id,
      role,
      resourceType: row.resource_type,
    });
    if (!ensured.ok) {
      return { ok: false, code: "MEMBERSHIP_INSERT_FAILED", message: ensured.message };
    }
    return { ok: true, resourceId };
  }

  if (row.resource_type === "project") {
    const ensuredProject = await ensureMemberRow(admin, {
      table: "visualify_project_members",
      resourceColumn: "project_id",
      resourceId,
      userId: user.id,
      role,
      resourceType: row.resource_type,
    });
    if (!ensuredProject.ok) {
      return { ok: false, code: "MEMBERSHIP_INSERT_FAILED", message: ensuredProject.message };
    }

    const { data: projectRow, error: projectErr } = await admin
      .from("visualify_projects")
      .select("portfolio_id")
      .eq("id", resourceId)
      .maybeSingle();

    if (projectErr) {
      return {
        ok: false,
        code: "MEMBERSHIP_INSERT_FAILED",
        message: "Could not load project for portfolio access.",
      };
    }

    if (!projectRow) {
      return {
        ok: false,
        code: "MEMBERSHIP_INSERT_FAILED",
        message: "Project not found for invitation.",
      };
    }

    const portfolioId =
      typeof projectRow.portfolio_id === "string" ? projectRow.portfolio_id.trim() : "";
    if (portfolioId) {
      const ensuredPortfolio = await ensureMemberRow(admin, {
        table: "visualify_portfolio_members",
        resourceColumn: "portfolio_id",
        resourceId: portfolioId,
        userId: user.id,
        role: "viewer",
        resourceType: "portfolio",
      });
      if (!ensuredPortfolio.ok) {
        return { ok: false, code: "MEMBERSHIP_INSERT_FAILED", message: ensuredPortfolio.message };
      }
    }

    return { ok: true, resourceId };
  }

  if (row.resource_type === "workspace") {
    const ensuredWorkspace = await ensureWorkspaceMemberRow(admin, {
      workspaceId: resourceId,
      userId: user.id,
      role,
    });
    if (!ensuredWorkspace.ok) {
      return { ok: false, code: "MEMBERSHIP_INSERT_FAILED", message: ensuredWorkspace.message };
    }
    return { ok: true, resourceId };
  }

  return { ok: false, code: "INVALID_INVITATION", message: "Unsupported invitation resource type." };
}

function membershipFailure(
  result: Extract<EnsureMembershipResult, { ok: false }>
): AcceptVisualifyInvitationFailure {
  if (result.code === "INVALID_INVITATION") {
    return failure("INVALID_INVITATION", 400, result.message);
  }
  return failure("MEMBERSHIP_INSERT_FAILED", 500, result.message);
}

export type AcceptVisualifyInvitationParams = {
  inviteToken: string;
  user: { id: string; email?: string | null };
};

/**
 * Accepts a pending project, portfolio, or workspace invitation for the authenticated user.
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

  if (
    row.resource_type !== "project" &&
    row.resource_type !== "portfolio" &&
    row.resource_type !== "workspace"
  ) {
    return failure("UNSUPPORTED_INVITATION_TYPE", 400);
  }

  if (row.status === "accepted") {
    if (row.auth_user_id === user.id) {
      const membership = await ensureMembershipForInvitation(row, user, admin);
      if (!membership.ok) {
        return membershipFailure(membership);
      }
      console.info("[acceptVisualifyInvitation] invitation already accepted; membership ensured", {
        userId: user.id,
        resourceType: row.resource_type,
        resourceId: membership.resourceId,
      });
      return successForInvitation(row.resource_type, membership.resourceId);
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

  const membership = await ensureMembershipForInvitation(row, user, admin);
  if (!membership.ok) {
    return membershipFailure(membership);
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
      .select("status, auth_user_id, resource_id, resource_type, role")
      .eq("id", row.id)
      .maybeSingle();

    if (again?.status === "accepted" && again.auth_user_id === user.id) {
      const healRow: InvitationMembershipRow = {
        resource_type: again.resource_type ?? row.resource_type,
        resource_id: again.resource_id ?? row.resource_id,
        role: again.role ?? row.role,
      };
      const racedMembership = await ensureMembershipForInvitation(healRow, user, admin);
      if (!racedMembership.ok) {
        return membershipFailure(racedMembership);
      }
      console.info("[acceptVisualifyInvitation] invitation accepted (race); membership ensured", {
        userId: user.id,
        resourceType: healRow.resource_type,
        resourceId: racedMembership.resourceId,
      });
      return successForInvitation(healRow.resource_type, racedMembership.resourceId);
    }

    return failure("CONFLICT", 409);
  }

  console.info("[acceptVisualifyInvitation] invitation accepted", {
    userId: user.id,
    invitationId: row.id,
    resourceType: row.resource_type,
    resourceId: membership.resourceId,
  });

  return successForInvitation(row.resource_type, membership.resourceId);
}
