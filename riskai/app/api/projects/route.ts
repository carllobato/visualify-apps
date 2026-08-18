import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import {
  buildProjectCreateInsert,
  resolveAuthorizedProjectCreateTarget,
  type ResolveProjectCreateTargetResult,
} from "@/lib/project/resolveWorkspaceNativeProjectCreateTarget";
import { filterActiveProjects } from "@/lib/db/activeProjectList";
import { getCreatableRiskAiWorkspaces } from "@/lib/workspace/creatableWorkspaces";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

/**
 * GET /api/projects — Returns active projects the user can access (id, name, created_at)
 * ordered by created_at asc. Archived Projects (`archived_at IS NOT NULL`) are excluded.
 */
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const supabase = await supabaseServerClient();
  const { data: projects, error } = await filterActiveProjects(
    supabase
      .from("visualify_projects")
      .select("id, name, created_at")
      .order("created_at", { ascending: true }),
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: projects ?? [] }, {
    headers: CACHE_HEADERS,
  });
}

type CreateProjectBody = {
  name?: unknown;
  workspaceId?: unknown;
};

/**
 * Authorises Project create from the target Workspace only
 * (`getCreatableRiskAiWorkspaces` = Owner/Admin). Never trusts client ids.
 * `owner_user_id` is set from the session, not the body.
 */
async function resolveProjectCreateTarget(
  userId: string,
  requestedWorkspaceId: string | undefined,
): Promise<ResolveProjectCreateTargetResult> {
  const supabase = await supabaseServerClient();
  const creatable = await getCreatableRiskAiWorkspaces(supabase, userId);
  return resolveAuthorizedProjectCreateTarget({
    creatableIds: creatable.map((workspace) => workspace.id),
    requestedWorkspaceId,
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  let body: CreateProjectBody;
  try {
    body = (await request.json()) as CreateProjectBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  const requestedWorkspaceId =
    typeof body.workspaceId === "string" && body.workspaceId.trim().length > 0
      ? body.workspaceId.trim()
      : undefined;

  const target = await resolveProjectCreateTarget(user.id, requestedWorkspaceId);
  if ("error" in target) {
    if (target.error === "forbidden") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    if (target.error === "none") {
      return NextResponse.json(
        {
          error: "You do not have permission to create a project in any RiskAI workspace.",
          code: "no_creatable_workspace",
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      {
        error: "Select a workspace before creating a project.",
        code: "workspace_required",
      },
      { status: 400 },
    );
  }

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_projects")
    .insert(
      buildProjectCreateInsert({
        ownerUserId: user.id,
        name,
        workspaceId: target.workspaceId,
      }),
    )
    .select("id, name, workspace_id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Project already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data }, { status: 201, headers: CACHE_HEADERS });
}
