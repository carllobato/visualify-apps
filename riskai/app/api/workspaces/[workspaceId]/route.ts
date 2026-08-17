import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseServerClient } from "@/lib/supabase/server";
import { getRiskAiEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import {
  canEditWorkspaceSettings,
  parseWorkspaceSettingsPatchBody,
} from "@/lib/workspace/workspaceSettingsUpdate";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/workspaces/[workspaceId] — Update Workspace name and reporting unit.
 * Active Workspace owner/admin only. Writes via service role after an independent
 * membership/capability check (same pattern HQ uses for `visualify_workspaces`).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { workspaceId: rawWorkspaceId } = await context.params;
  const workspaceId = typeof rawWorkspaceId === "string" ? rawWorkspaceId.trim() : "";
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const entitled = await getRiskAiEntitledWorkspaces(supabase, user.id);
  if (!entitled.some((workspace) => workspace.id === workspaceId)) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const role = await fetchWorkspaceMemberRole(supabase, workspaceId, user.id);
  if (!canEditWorkspaceSettings(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseWorkspaceSettingsPatchBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let admin;
  try {
    admin = supabaseAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const serviceRoleMissing = message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      {
        error: serviceRoleMissing
          ? "Workspace update is not configured: add SUPABASE_SERVICE_ROLE_KEY to the server environment."
          : "Workspace update is not configured.",
        code: serviceRoleMissing ? "SERVICE_ROLE_MISSING" : "CONFIGURATION_ERROR",
      },
      { status: 503 }
    );
  }

  const { data, error } = await admin
    .from("visualify_workspaces")
    .update(parsed.updates)
    .eq("id", workspaceId)
    .select("id, name, slug, reporting_unit")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    slug: data.slug,
    reporting_unit: data.reporting_unit,
  });
}
