import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { getProjectAccessForUser } from "@/lib/db/projectAccess";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import {
  authorizeProjectArchive,
  parseProjectPatchBody,
  PROJECT_HARD_DELETE_DISABLED,
  projectLifecycleArchivedAtUpdate,
  projectLifecycleRevalidatePaths,
  resolveAuthoritativeProjectWorkspaceId,
} from "@/lib/project/projectArchiveLifecycle";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[projectId] — Project row + `permissions` for UI gating.
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
    workspaceId: bundle.workspaceId,
  });
}

function revalidateProjectLifecyclePaths(
  projectId: string,
  workspaceId: string | null,
) {
  for (const path of projectLifecycleRevalidatePaths({ projectId, workspaceId })) {
    revalidatePath(path);
  }
}

/**
 * PATCH /api/projects/[projectId]
 * - `{ name }` — project metadata (existing authenticated update)
 * - `{ archived: true | false }` — Workspace Owner/Admin lifecycle; service-role write of `archived_at` only
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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseProjectPatchBody(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.kind === "lifecycle") {
    const workspaceId = resolveAuthoritativeProjectWorkspaceId({
      projectWorkspaceId: bundle.workspaceId,
    });
    if (!workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await supabaseServerClient();
    const workspaceRole = await fetchWorkspaceMemberRole(supabase, workspaceId, user.id);
    if (!authorizeProjectArchive({ workspaceRole })) {
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
            ? "Project archive is not configured: add SUPABASE_SERVICE_ROLE_KEY to the server environment."
            : "Project archive is not configured.",
          code: serviceRoleMissing ? "SERVICE_ROLE_MISSING" : "CONFIGURATION_ERROR",
        },
        { status: 503 },
      );
    }

    const update = projectLifecycleArchivedAtUpdate(parsed.archived, new Date().toISOString());
    const { data, error } = await admin
      .from("visualify_projects")
      .update(update)
      .eq("id", projectId)
      .select("id, archived_at, workspace_id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    revalidateProjectLifecyclePaths(projectId, workspaceId);

    return NextResponse.json({
      id: data.id,
      archived_at: data.archived_at ?? null,
      workspaceId,
    });
  }

  if (!bundle.permissions.canEditProjectMetadata) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("visualify_projects")
    .update({ name: parsed.name })
    .eq("id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);

  return NextResponse.json({ id: projectId, name: parsed.name });
}

/**
 * DELETE /api/projects/[projectId] — disabled. Projects must be archived, never hard-deleted.
 */
export async function DELETE() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  return NextResponse.json(PROJECT_HARD_DELETE_DISABLED.body, {
    status: PROJECT_HARD_DELETE_DISABLED.status,
  });
}
