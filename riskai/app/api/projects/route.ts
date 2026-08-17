import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import {
  resolveAuthorizedProjectCreateTarget,
  type OptionalCreatePortfolio,
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
  portfolioId?: unknown;
  workspaceId?: unknown;
};

/**
 * Authorises Project create from the target Workspace only
 * (`getCreatableRiskAiWorkspaces` = Owner/Admin). Portfolio is an optional
 * association after that check. Never trusts client ids or portfolio
 * `canInviteMembers`. `owner_user_id` is set from the session, not the body.
 */
async function resolveProjectCreateTarget(
  userId: string,
  preferredPortfolioId: string | undefined,
  requestedWorkspaceId: string | undefined,
): Promise<ResolveProjectCreateTargetResult> {
  const supabase = await supabaseServerClient();

  let optionalPortfolio: OptionalCreatePortfolio = { status: "omitted" };
  if (preferredPortfolioId) {
    const { data: portfolio, error } = await supabase
      .from("visualify_portfolios")
      .select("workspace_id")
      .eq("id", preferredPortfolioId)
      .maybeSingle();
    if (error || !portfolio) {
      optionalPortfolio = { status: "missing" };
    } else {
      optionalPortfolio = {
        status: "found",
        id: preferredPortfolioId,
        workspaceId:
          typeof portfolio.workspace_id === "string" ? portfolio.workspace_id : null,
      };
    }
  }

  const creatable = await getCreatableRiskAiWorkspaces(supabase, userId);
  return resolveAuthorizedProjectCreateTarget({
    creatableIds: creatable.map((workspace) => workspace.id),
    requestedWorkspaceId,
    optionalPortfolio,
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

  const portfolioId =
    typeof body.portfolioId === "string" && body.portfolioId.trim().length > 0
      ? body.portfolioId.trim()
      : undefined;

  const requestedWorkspaceId =
    typeof body.workspaceId === "string" && body.workspaceId.trim().length > 0
      ? body.workspaceId.trim()
      : undefined;

  const target = await resolveProjectCreateTarget(user.id, portfolioId, requestedWorkspaceId);
  if ("error" in target) {
    if (target.error === "forbidden") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    if (target.error === "unbound_workspace") {
      return NextResponse.json(
        { error: "This portfolio is not linked to a workspace." },
        { status: 400 },
      );
    }
    if (target.error === "workspace_mismatch") {
      return NextResponse.json(
        { error: "Selected portfolio does not belong to that workspace." },
        { status: 400 },
      );
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
    if (target.error === "workspace_required") {
      return NextResponse.json(
        {
          error: "Select a workspace before creating a project.",
          code: "workspace_required",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_projects")
    .insert({
      owner_user_id: user.id,
      name,
      workspace_id: target.workspaceId,
      portfolio_id: target.portfolioId,
    })
    .select("id, name, portfolio_id, workspace_id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Project already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data }, { status: 201, headers: CACHE_HEADERS });
}
