import { type NextRequest, NextResponse } from "next/server";
import { authenticateRouteSupabase } from "@/lib/auth/requireUser";
import {
  createPendingWorkspaceInvitation,
  fetchPendingWorkspaceInvitations,
  normalizeWorkspaceInviteEmail,
} from "@/lib/workspace-invitations";
import type { WorkspaceInviteRole } from "@/types/workspace-invitations";
import { fetchManageableWorkspaceById } from "@/lib/workspace-settings-data";
import { awaitSupabaseCookieSync } from "@/lib/supabase/await-supabase-cookie-sync";
import { createRouteRequestSupabase } from "@/lib/supabase/route-handler-client";

export const dynamic = "force-dynamic";

function isWorkspaceInviteRole(v: unknown): v is WorkspaceInviteRole {
  return v === "admin" || v === "member";
}

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

export async function GET(
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

  const manageable = await fetchManageableWorkspaceById(user.id, workspaceId.trim(), sb);
  if (!manageable) {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Forbidden" }, { status: 403 });
  }

  const invitations = await fetchPendingWorkspaceInvitations(manageable.id);
  return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { invitations });
}

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

  const manageable = await fetchManageableWorkspaceById(user.id, workspaceId.trim(), sb);
  if (!manageable) {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; role?: unknown };
  } catch {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Email is required" }, { status: 400 });
  }
  if (!isWorkspaceInviteRole(body.role)) {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Invalid role" }, { status: 400 });
  }

  const result = await createPendingWorkspaceInvitation({
    actingUserId: user.id,
    workspaceId: manageable.id,
    email: normalizeWorkspaceInviteEmail(email),
    role: body.role,
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
    if (result.code === "INVALID_INPUT") {
      return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Invalid email address" }, { status: 400 });
    }
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Could not create invitation" }, { status: 500 });
  }

  return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, {
    ok: true,
    already_pending: result.alreadyPending,
    message: result.alreadyPending
      ? "An invitation is already pending for this email."
      : "Invitation created",
  });
}
