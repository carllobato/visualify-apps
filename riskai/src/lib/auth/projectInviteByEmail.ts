import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPublicProfile } from "@/lib/profiles/profileDb";
import { supabaseServerClient } from "@/lib/supabase/server";
import type { ProjectMemberRole } from "@/types/projectMembers";

const FALLBACK_PROJECT_NAME = "Project";
const FALLBACK_INVITER_DISPLAY_NAME = "A team member";

async function fetchProjectNameForInvitation(
  admin: SupabaseClient,
  projectId: string
): Promise<string> {
  const { data, error } = await admin.from("projects").select("name").eq("id", projectId).maybeSingle();
  if (error || data == null) return FALLBACK_PROJECT_NAME;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  return name || FALLBACK_PROJECT_NAME;
}

async function fetchInviterDisplayNameForInvitation(
  admin: SupabaseClient,
  invitedByUserId: string
): Promise<string> {
  const profile = await fetchPublicProfile(admin, invitedByUserId);
  const first = profile?.first_name?.trim() ?? "";
  const last = profile?.surname?.trim() ?? "";
  const combined = [first, last].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  return FALLBACK_INVITER_DISPLAY_NAME;
}

/** MVP default: invitation offer window for pending rows. */
const INVITE_EXPIRY_DAYS = 7;

export type InviteToProjectPhase = "invite" | "invitation" | "redirect";

/** Thrown by {@link createVisualifyProjectInvitationAndInvite}; route maps `code` to HTTP responses (no raw internals to client). */
export class InviteToProjectError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVITE_AUTH_FAILED"
      | "INVITE_NO_USER_ID"
      | "INVITATION_DB_FAILED"
      | "REDIRECT_INVALID"
      | "SERVICE_ROLE_UNAVAILABLE",
    public readonly phase: InviteToProjectPhase | "redirect",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "InviteToProjectError";
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

export function normalizeVisualifyInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Creates or reuses a pending `visualify_invitations` row. Outbound email is handled elsewhere (e.g. DB webhook).
 */
export async function createVisualifyProjectInvitationAndInvite(params: {
  projectId: string;
  email: string;
  firstName: string;
  surname: string;
  role: ProjectMemberRole;
  invitedByUserId: string;
}): Promise<void> {
  const { projectId, email, firstName, surname, role, invitedByUserId } = params;
  const emailNormalized = normalizeVisualifyInviteEmail(email);

  const admin = await supabaseServerClient();

  const { data: existingPending, error: existingErr } = await admin
    .from("visualify_invitations")
    .select("id, invite_token")
    .eq("resource_type", "project")
    .eq("resource_id", projectId)
    .eq("email", emailNormalized)
    .eq("status", "pending")
    .maybeSingle();

  if (existingErr) {
    throw new InviteToProjectError(
      existingErr.message,
      "INVITATION_DB_FAILED",
      "invitation",
      existingErr
    );
  }

  if (existingPending?.id) {
    return;
  }

  const [projectName, inviterDisplayName] = await Promise.all([
    fetchProjectNameForInvitation(admin, projectId),
    fetchInviterDisplayNameForInvitation(admin, invitedByUserId),
  ]);

  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: inserted, error: insErr } = await admin
    .from("visualify_invitations")
    .insert({
      resource_type: "project",
      resource_id: projectId,
      email: emailNormalized,
      first_name: firstName,
      surname: surname,
      role,
      invited_by_user_id: invitedByUserId,
      status: "pending",
      expires_at: expiresAt,
      project_name: projectName,
      inviter_display_name: inviterDisplayName,
    })
    .select("id, invite_token")
    .single();

  const invitationId = inserted?.id as string | undefined;
  const inviteToken = inserted?.invite_token as string | undefined;

  if (insErr) {
    if (isPostgresUniqueViolation(insErr)) {
      const { data: raced, error: raceErr } = await admin
        .from("visualify_invitations")
        .select("id, invite_token")
        .eq("resource_type", "project")
        .eq("resource_id", projectId)
        .eq("email", emailNormalized)
        .eq("status", "pending")
        .maybeSingle();

      if (raceErr) {
        throw new InviteToProjectError(
          raceErr.message,
          "INVITATION_DB_FAILED",
          "invitation",
          raceErr
        );
      }
      if (raced?.id) {
        return;
      }
    }

    throw new InviteToProjectError(insErr.message, "INVITATION_DB_FAILED", "invitation", insErr);
  }

  if (!invitationId || !inviteToken) {
    throw new InviteToProjectError(
      "Invitation row was not returned after insert.",
      "INVITATION_DB_FAILED",
      "invitation"
    );
  }
}
