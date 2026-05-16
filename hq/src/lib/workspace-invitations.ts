import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceInviteRole, WorkspacePendingInvitationRow } from "@/types/workspace-invitations";
import { supabaseAdminClient } from "@/lib/supabase/admin";

/** Mirrors RiskAI `INVITE_EXPIRY_DAYS` in `riskai/src/lib/auth/projectInviteByEmail.ts`. */
const INVITE_EXPIRY_DAYS = 7;

/** Same normalization as RiskAI `normalizeVisualifyInviteEmail`. */
export function normalizeWorkspaceInviteEmail(email: string): string {
  return email.trim().toLowerCase();
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

function isPostgresUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

async function fetchWorkspaceNameForInvitation(
  admin: SupabaseClient,
  workspaceId: string
): Promise<string> {
  const { data, error } = await admin
    .from("visualify_workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error || data == null) return "Workspace";
  const name = typeof data.name === "string" ? data.name.trim() : "";
  return name || "Workspace";
}

async function fetchInviterDisplayName(admin: SupabaseClient, invitedByUserId: string): Promise<string> {
  const { data, error } = await admin
    .from("visualify_profiles")
    .select("first_name, surname")
    .eq("id", invitedByUserId)
    .maybeSingle();
  if (error || data == null) return "A team member";
  const first = typeof data.first_name === "string" ? data.first_name.trim() : "";
  const last = typeof data.surname === "string" ? data.surname.trim() : "";
  const combined = [first, last].filter(Boolean).join(" ").trim();
  return combined || "A team member";
}

export async function fetchPendingWorkspaceInvitations(
  workspaceId: string
): Promise<WorkspacePendingInvitationRow[]> {
  let admin: SupabaseClient;
  try {
    admin = supabaseAdminClient();
  } catch {
    return [];
  }

  const { data, error } = await admin
    .from("visualify_invitations")
    .select("id, email, role, status, created_at")
    .eq("resource_type", "workspace")
    .eq("resource_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchPendingWorkspaceInvitations:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    email: String(row.email ?? "").trim(),
    role: String(row.role ?? "").trim(),
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
    status: String(row.status ?? "").trim(),
  }));
}

export type CreateWorkspaceInvitationResult =
  | { ok: true; alreadyPending: boolean }
  | { ok: false; code: "INVALID_INPUT" | "SERVICE_ROLE_UNAVAILABLE" | "DB_ERROR" };

/**
 * Inserts a pending `visualify_invitations` row for a workspace (no email send; no membership).
 * Caller must verify the inviter may administer the workspace.
 */
export async function createPendingWorkspaceInvitation(params: {
  actingUserId: string;
  workspaceId: string;
  email: string;
  role: WorkspaceInviteRole;
}): Promise<CreateWorkspaceInvitationResult> {
  let admin: SupabaseClient;
  try {
    admin = supabaseAdminClient();
  } catch {
    return { ok: false, code: "SERVICE_ROLE_UNAVAILABLE" };
  }

  const emailNormalized = normalizeWorkspaceInviteEmail(params.email);
  if (!emailNormalized || !emailNormalized.includes("@")) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const { data: existingPending, error: existingErr } = await admin
    .from("visualify_invitations")
    .select("id")
    .eq("resource_type", "workspace")
    .eq("resource_id", params.workspaceId)
    .eq("email", emailNormalized)
    .eq("status", "pending")
    .maybeSingle();

  if (existingErr) {
    console.error("createPendingWorkspaceInvitation lookup:", existingErr.message);
    return { ok: false, code: "DB_ERROR" };
  }
  if (existingPending?.id) {
    return { ok: true, alreadyPending: true };
  }

  const { firstName, surname } = splitInviteNameFromEmail(emailNormalized);
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [workspaceLabel, inviterDisplayName] = await Promise.all([
    fetchWorkspaceNameForInvitation(admin, params.workspaceId),
    fetchInviterDisplayName(admin, params.actingUserId),
  ]);

  const { error: insErr } = await admin.from("visualify_invitations").insert({
    resource_type: "workspace",
    resource_id: params.workspaceId,
    email: emailNormalized,
    first_name: firstName,
    surname,
    role: params.role,
    invited_by_user_id: params.actingUserId,
    status: "pending",
    expires_at: expiresAt,
    project_name: workspaceLabel,
    inviter_display_name: inviterDisplayName,
  });

  if (insErr) {
    if (isPostgresUniqueViolation(insErr)) {
      const { data: raced } = await admin
        .from("visualify_invitations")
        .select("id")
        .eq("resource_type", "workspace")
        .eq("resource_id", params.workspaceId)
        .eq("email", emailNormalized)
        .eq("status", "pending")
        .maybeSingle();
      if (raced?.id) {
        return { ok: true, alreadyPending: true };
      }
    }
    console.error("createPendingWorkspaceInvitation insert:", insErr.message);
    return { ok: false, code: "DB_ERROR" };
  }

  return { ok: true, alreadyPending: false };
}

export type CancelWorkspaceInvitationResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "SERVICE_ROLE_UNAVAILABLE" | "DB_ERROR" };

/**
 * Marks a pending workspace invitation as cancelled. Caller must verify the actor may administer the workspace.
 */
export async function cancelPendingWorkspaceInvitation(params: {
  workspaceId: string;
  invitationId: string;
}): Promise<CancelWorkspaceInvitationResult> {
  let admin: SupabaseClient;
  try {
    admin = supabaseAdminClient();
  } catch {
    return { ok: false, code: "SERVICE_ROLE_UNAVAILABLE" };
  }

  const invitationId = params.invitationId.trim();
  if (!invitationId) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("visualify_invitations")
    .update({ status: "cancelled", cancelled_at: now })
    .eq("id", invitationId)
    .eq("resource_type", "workspace")
    .eq("resource_id", params.workspaceId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("cancelPendingWorkspaceInvitation:", error.message);
    return { ok: false, code: "DB_ERROR" };
  }
  if (!data?.id) {
    return { ok: false, code: "NOT_FOUND" };
  }

  return { ok: true };
}
