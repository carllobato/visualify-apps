import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPublicProfile } from "@/lib/profiles/profileDb";
import { supabaseServerClient } from "@/lib/supabase/server";
import type { PortfolioMemberRole } from "@/types/portfolioMembers";

const FALLBACK_PORTFOLIO_NAME = "Portfolio";
const FALLBACK_INVITER_DISPLAY_NAME = "A team member";
const INVITE_EXPIRY_DAYS = 7;

async function fetchPortfolioNameForInvitation(
  admin: SupabaseClient,
  portfolioId: string
): Promise<string> {
  const { data, error } = await admin
    .from("portfolios")
    .select("name")
    .eq("id", portfolioId)
    .maybeSingle();
  if (error || data == null) return FALLBACK_PORTFOLIO_NAME;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  return name || FALLBACK_PORTFOLIO_NAME;
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

export class InviteToPortfolioError extends Error {
  constructor(
    message: string,
    public readonly code: "INVITATION_DB_FAILED" | "SERVICE_ROLE_UNAVAILABLE",
    public readonly phase: "invitation",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "InviteToPortfolioError";
  }
}

export function normalizePortfolioInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isPostgresUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

export async function createVisualifyPortfolioInvitationAndInvite(params: {
  portfolioId: string;
  email: string;
  firstName: string;
  surname: string;
  role: PortfolioMemberRole;
  invitedByUserId: string;
}): Promise<void> {
  const { portfolioId, email, firstName, surname, role, invitedByUserId } = params;
  const emailNormalized = normalizePortfolioInviteEmail(email);

  const admin = await supabaseServerClient();

  const { data: existingPending, error: existingErr } = await admin
    .from("visualify_invitations")
    .select("id")
    .eq("resource_type", "portfolio")
    .eq("resource_id", portfolioId)
    .eq("email", emailNormalized)
    .eq("status", "pending")
    .maybeSingle();

  if (existingErr) {
    throw new InviteToPortfolioError(
      existingErr.message,
      "INVITATION_DB_FAILED",
      "invitation",
      existingErr
    );
  }

  if (existingPending?.id) {
    return;
  }

  const [portfolioName, inviterDisplayName] = await Promise.all([
    fetchPortfolioNameForInvitation(admin, portfolioId),
    fetchInviterDisplayNameForInvitation(admin, invitedByUserId),
  ]);

  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: inserted, error: insErr } = await admin
    .from("visualify_invitations")
    .insert({
      resource_type: "portfolio",
      resource_id: portfolioId,
      email: emailNormalized,
      first_name: firstName,
      surname,
      role,
      invited_by_user_id: invitedByUserId,
      status: "pending",
      expires_at: expiresAt,
      project_name: portfolioName,
      inviter_display_name: inviterDisplayName,
    })
    .select("id")
    .single();

  const invitationId = inserted?.id as string | undefined;

  if (insErr) {
    if (isPostgresUniqueViolation(insErr)) {
      const { data: raced, error: raceErr } = await admin
        .from("visualify_invitations")
        .select("id")
        .eq("resource_type", "portfolio")
        .eq("resource_id", portfolioId)
        .eq("email", emailNormalized)
        .eq("status", "pending")
        .maybeSingle();

      if (raceErr) {
        throw new InviteToPortfolioError(
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

    throw new InviteToPortfolioError(insErr.message, "INVITATION_DB_FAILED", "invitation", insErr);
  }

  if (!invitationId) {
    throw new InviteToPortfolioError(
      "Invitation row was not returned after insert.",
      "INVITATION_DB_FAILED",
      "invitation"
    );
  }
}
