import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { getProjectAccessForUser } from "@/lib/db/projectAccess";
import { assertPortfolioAdminAccess } from "@/lib/portfolios-server";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[projectId] — Project row + `permissions` (owner/editor/viewer/portfolio) for UI gating.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const bundle = await getProjectAccessForUser(projectId, user.id);
  if (!bundle) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...bundle.project,
    permissions: bundle.permissions,
  });
}

/**
 * PATCH /api/projects/[projectId] — Update project name. Body: { name: string }.
 * Allowed for table owner or project_members with role owner/editor (matches RLS).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const bundle = await getProjectAccessForUser(projectId, user.id);
  if (!bundle) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!bundle.permissions.canEditProjectMetadata) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("visualify_projects")
    .update({ name })
    .eq("id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/riskai/projects/${projectId}`);
  revalidatePath(`/riskai/projects/${projectId}/settings`);

  return NextResponse.json({ id: projectId, name });
}

/**
 * DELETE /api/projects/[projectId] — Delete a project and its child rows.
 * Requires owner access on both the project and its portfolio.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const bundle = await getProjectAccessForUser(projectId, user.id);
  if (!bundle) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (bundle.permissions.accessMode !== "owner" || !bundle.portfolioId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const portfolioAccess = await assertPortfolioAdminAccess(bundle.portfolioId, supabase, user.id);
  if ("error" in portfolioAccess) {
    return NextResponse.json(
      {
        error: portfolioAccess.error === "not_found" ? "Portfolio not found" : "Forbidden",
      },
      { status: portfolioAccess.error === "not_found" ? 404 : 403 }
    );
  }
  if (!portfolioAccess.canEditPortfolioDetails) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
          ? "Project deletion is not configured: add SUPABASE_SERVICE_ROLE_KEY to the server environment."
          : "Project deletion is not configured.",
        code: serviceRoleMissing ? "SERVICE_ROLE_MISSING" : "CONFIGURATION_ERROR",
      },
      { status: 503 }
    );
  }

  const deleteSteps = [
    admin
      .from("visualify_invitations")
      .delete()
      .eq("resource_type", "project")
      .eq("resource_id", projectId),
    admin.from("riskai_simulation_snapshots").delete().eq("project_id", projectId),
    admin.from("riskai_risks").delete().eq("project_id", projectId),
    admin.from("riskai_project_owners").delete().eq("project_id", projectId),
    admin.from("visualify_project_members").delete().eq("project_id", projectId),
    admin.from("visualify_project_settings").delete().eq("project_id", projectId),
  ];

  for (const step of deleteSteps) {
    const { error } = await step;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { error: deleteError } = await admin
    .from("visualify_projects")
    .delete()
    .eq("id", projectId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  revalidatePath(`/riskai/portfolios/${bundle.portfolioId}`);
  revalidatePath(`/riskai/portfolios/${bundle.portfolioId}/projects`);

  return NextResponse.json({ ok: true, portfolioId: bundle.portfolioId });
}
