import { type NextRequest, NextResponse } from "next/server";
import { archiveWorkspaceForAdmin } from "@/lib/archive-workspace";
import { authenticateRouteSupabase } from "@/lib/auth/requireUser";
import {
  clearVisualifyActiveWorkspaceIdCookieIfMatches,
  fetchManageableWorkspaceById,
} from "@/lib/workspace-settings-data";
import { awaitSupabaseCookieSync } from "@/lib/supabase/await-supabase-cookie-sync";
import { createRouteRequestSupabase } from "@/lib/supabase/route-handler-client";

export const dynamic = "force-dynamic";

async function jsonWithRouteSupabaseCookies(
  applySupabaseAuthCookies: (response: NextResponse) => void,
  body: unknown,
  init?: ResponseInit,
): Promise<NextResponse> {
  await awaitSupabaseCookieSync();
  const res = NextResponse.json(body, init);
  applySupabaseAuthCookies(res);
  return res;
}

/**
 * POST /api/workspaces/:workspaceId/archive — soft-delete workspace (`status = cancelled`).
 * Requires owner or admin on an active workspace. Does not delete related rows.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { supabase: sb, applySupabaseAuthCookies } = createRouteRequestSupabase(request);
  const user = await authenticateRouteSupabase(sb);
  if (!user) {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  if (!workspaceId?.trim()) {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Workspace ID required" }, { status: 400 });
  }

  const trimmedId = workspaceId.trim();
  const manageable = await fetchManageableWorkspaceById(user.id, trimmedId, sb);
  if (!manageable) {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Forbidden" }, { status: 403 });
  }

  const result = await archiveWorkspaceForAdmin({
    actingUserId: user.id,
    workspaceId: manageable.id,
    supabaseClient: sb,
  });

  if (!result.ok) {
    if (result.code === "SERVICE_ROLE_UNAVAILABLE") {
      return jsonWithRouteSupabaseCookies(
        applySupabaseAuthCookies,
        {
          error: "ARCHIVE_NOT_CONFIGURED",
          message: "Workspace archive is not configured on the server (missing service role).",
        },
        { status: 503 },
      );
    }
    if (result.code === "FORBIDDEN") {
      return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Forbidden" }, { status: 403 });
    }
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Could not archive workspace" }, { status: 500 });
  }

  await clearVisualifyActiveWorkspaceIdCookieIfMatches(manageable.id);

  return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { ok: true, redirect: "/dashboard" });
}
