import "server-only";

import { supabaseAdminClient } from "@/lib/supabase/admin";

export class InviteToPortfolioError extends Error {
  constructor(
    message: string,
    public readonly code: "INVITE_AUTH_FAILED" | "SERVICE_ROLE_UNAVAILABLE",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "InviteToPortfolioError";
  }
}

export function normalizePortfolioInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function invitePortfolioUserByEmail(params: {
  email: string;
  firstName: string;
  surname: string;
}): Promise<void> {
  const admin = (() => {
    try {
      return supabaseAdminClient();
    } catch (e) {
      throw new InviteToPortfolioError(
        e instanceof Error ? e.message : "Admin client unavailable.",
        "SERVICE_ROLE_UNAVAILABLE",
        e
      );
    }
  })();

  const email = normalizePortfolioInviteEmail(params.email);
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      first_name: params.firstName,
      surname: params.surname,
    },
  });

  if (error) {
    throw new InviteToPortfolioError(error.message, "INVITE_AUTH_FAILED", error);
  }
}
