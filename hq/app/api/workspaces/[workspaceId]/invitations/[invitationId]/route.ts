import { type NextRequest, NextResponse } from "next/server";
import { authenticateRouteSupabase } from "@/lib/auth/requireUser";
import { cancelPendingWorkspaceInvitation } from "@/lib/workspace-invitations";
import { fetchManageableWorkspaceById } from "@/lib/workspace-settings-data";
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
 * DELETE /api/workspaces/:workspaceId/invitations/:invitationId — cancel a pending invitation.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string; invitationId: string }> },
) {
  const { supabase: sb, applySupabaseAuthCookies } = createRouteRequestSupabase(request);
  const user = await authenticateRouteSupabase(sb);
  if (!user) {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, invitationId } = await context.params;
  if (!workspaceId?.trim() || !invitationId?.trim()) {
    return jsonWithRouteSupabaseCookies(
      applySupabaseAuthCookies,
      { error: "Workspace ID and invitation ID required" },
      { status: 400 },
    );
  }

  const manageable = await fetchManageableWorkspaceById(user.id, workspaceId.trim(), sb);
  if (!manageable) {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Forbidden" }, { status: 403 });
  }

  const result = await cancelPendingWorkspaceInvitation({
    workspaceId: manageable.id,
    invitationId: invitationId.trim(),
  });

  if (!result.ok) {
    if (result.code === "SERVICE_ROLE_UNAVAILABLE") {
      return jsonWithRouteSupabaseCookies(
        applySupabaseAuthCookies,
        {
          error: "INVITES_NOT_CONFIGURED",
          message: "Invitations are not configured on the server (missing service role).",
        },
        { status: 503 },
      );
    }
    if (result.code === "NOT_FOUND") {
      return jsonWithRouteSupabaseCookies(
        applySupabaseAuthCookies,
        { error: "Invitation not found or not pending" },
        { status: 404 },
      );
    }
    return jsonWithRouteSupabaseCookies(
      applySupabaseAuthCookies,
      { error: "Could not cancel invitation" },
      { status: 500 },
    );
  }

  return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, {
    ok: true,
    message: "Invitation cancelled",
  });
}
