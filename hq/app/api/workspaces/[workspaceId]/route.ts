import { type NextRequest, NextResponse } from "next/server";
import { authenticateRouteSupabase } from "@/lib/auth/requireUser";
import { updateWorkspaceDetailsForAdmin } from "@/lib/update-workspace-details";
import { fetchManageableWorkspaceById } from "@/lib/workspace-settings-data";
import { parseOptionalWorkspaceWebsiteUrl } from "@/lib/workspace-website-url";
import { awaitSupabaseCookieSync } from "@/lib/supabase/await-supabase-cookie-sync";
import { createRouteRequestSupabase } from "@/lib/supabase/route-handler-client";
import { isWorkspaceCreateType } from "@/types/workspace-create";

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
 * PATCH /api/workspaces/:workspaceId — update workspace setup fields (name, type, website).
 * Requires owner or admin on an active workspace. Does not change slug.
 */
export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const workspaceTypeRaw = typeof o.workspace_type === "string" ? o.workspace_type.trim() : "";

  if (!name) {
    return jsonWithRouteSupabaseCookies(
      applySupabaseAuthCookies,
      { error: "Workspace name is required" },
      { status: 400 },
    );
  }
  if (!isWorkspaceCreateType(workspaceTypeRaw)) {
    return jsonWithRouteSupabaseCookies(
      applySupabaseAuthCookies,
      { error: "Invalid workspace type" },
      { status: 400 },
    );
  }

  if (o.website_url !== undefined && o.website_url !== null && typeof o.website_url !== "string") {
    return jsonWithRouteSupabaseCookies(
      applySupabaseAuthCookies,
      { error: "Invalid website URL" },
      { status: 400 },
    );
  }

  const websiteRaw = typeof o.website_url === "string" ? o.website_url : "";
  const websiteParsed = parseOptionalWorkspaceWebsiteUrl(websiteRaw);
  if (!websiteParsed.ok) {
    return jsonWithRouteSupabaseCookies(
      applySupabaseAuthCookies,
      { error: "Invalid website URL", message: "Invalid website URL" },
      { status: 400 },
    );
  }

  const result = await updateWorkspaceDetailsForAdmin({
    actingUserId: user.id,
    workspaceId: manageable.id,
    name,
    workspaceType: workspaceTypeRaw,
    websiteUrl: websiteParsed.url,
    supabaseClient: sb,
  });

  if (!result.ok) {
    if (result.code === "SERVICE_ROLE_UNAVAILABLE") {
      return jsonWithRouteSupabaseCookies(
        applySupabaseAuthCookies,
        {
          error: "WORKSPACE_UPDATE_NOT_CONFIGURED",
          message: "Workspace updates are not configured on the server (missing service role).",
        },
        { status: 503 },
      );
    }
    if (result.code === "FORBIDDEN") {
      return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { error: "Forbidden" }, { status: 403 });
    }
    if (result.code === "INVALID_INPUT") {
      return jsonWithRouteSupabaseCookies(
        applySupabaseAuthCookies,
        { error: "Invalid workspace name or website URL" },
        { status: 400 },
      );
    }
    return jsonWithRouteSupabaseCookies(
      applySupabaseAuthCookies,
      { error: "Could not update workspace" },
      { status: 500 },
    );
  }

  return jsonWithRouteSupabaseCookies(applySupabaseAuthCookies, { ok: true });
}
