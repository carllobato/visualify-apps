import "server-only";

import { fetchWorkspaceProductAccessForUser } from "@visualify/workspace-product-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import { productConfig } from "@/lib/product-config";
import {
  WORKSPACE_INVITE_ACCEPTED_QP,
  WORKSPACE_SETUP_PORTFOLIO_QP,
} from "@/lib/onboarding/types";

function isWorkspaceAdminRole(role: string): boolean {
  const r = role.trim().toLowerCase();
  return r === "owner" || r === "admin";
}

/** Dashboard path with post-workspace-invite query flags (preserves existing `invite_accepted`). */
export function buildWorkspaceInviteAcceptedDashboardPath(basePath: string): string {
  return buildWorkspaceInviteAcceptedPath(basePath);
}

export function buildWorkspaceInviteAcceptedPath(
  path: string,
  options?: { openPortfolioSetupForAdmin?: boolean },
): string {
  const u = new URL(path, "http://localhost");
  u.searchParams.set("invite_accepted", "1");
  u.searchParams.set(WORKSPACE_INVITE_ACCEPTED_QP, "1");
  if (options?.openPortfolioSetupForAdmin) {
    u.searchParams.set(WORKSPACE_SETUP_PORTFOLIO_QP, "1");
  }
  return `${u.pathname}${u.search}`;
}

export async function shouldSuggestPortfolioSetupAfterWorkspaceInvite(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const rows = await fetchWorkspaceProductAccessForUser(supabase, userId);
  const productKey = productConfig.PRODUCT_KEY;
  return rows.some(
    (row) => row.productKey === productKey && isWorkspaceAdminRole(row.memberRole),
  );
}
