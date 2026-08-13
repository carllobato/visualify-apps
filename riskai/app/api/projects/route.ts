import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getPortfolioMembersViewerContext } from "@/lib/db/portfolioMemberAccess";
import { getCreatableRiskAiWorkspaces } from "@/lib/workspace/creatableWorkspaces";
import {
  assertRequestedWorkspaceMatchesPortfolio,
  resolveCreatableWorkspaceId,
} from "@/lib/workspace/resolveCreatableWorkspaceId";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

/**
 * GET /api/projects — Returns projects the user can access (id, name, created_at) ordered by created_at asc.
 * Used by home redirect to resolve last-active or first project. Rows are filtered by RLS (owner,
 * project_members, portfolio).
 */
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const supabase = await supabaseServerClient();
  const { data: projects, error } = await supabase
    .from("visualify_projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });

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

type ResolveProjectCreateResult =
  | { portfolioId: string | null; workspaceId: string }
  | {
      error:
        | "not_found"
        | "forbidden"
        | "unbound_workspace"
        | "workspace_mismatch"
        | "none"
        | "workspace_required";
    };

/**
 * Authorises optional portfolio + required workspace for project create.
 * Never trusts client workspace/portfolio ids without server checks.
 */
async function resolveProjectCreateTarget(
  userId: string,
  preferredPortfolioId: string | undefined,
  requestedWorkspaceId: string | undefined,
): Promise<ResolveProjectCreateResult> {
  const supabase = await supabaseServerClient();

  if (preferredPortfolioId) {
    const viewer = await getPortfolioMembersViewerContext(supabase, preferredPortfolioId, userId);
    if (!viewer) return { error: "not_found" };
    if (!viewer.canInviteMembers) return { error: "forbidden" };

    const { data: portfolio, error } = await supabase
      .from("visualify_portfolios")
      .select("workspace_id")
      .eq("id", preferredPortfolioId)
      .maybeSingle();

    if (error || !portfolio) return { error: "not_found" };

    const workspaceId =
      typeof portfolio.workspace_id === "string" && portfolio.workspace_id.trim().length > 0
        ? portfolio.workspace_id.trim()
        : null;

    if (!workspaceId) return { error: "unbound_workspace" };

    const match = assertRequestedWorkspaceMatchesPortfolio({
      portfolioWorkspaceId: workspaceId,
      requestedWorkspaceId,
    });
    if ("error" in match) return { error: "workspace_mismatch" };

    return { portfolioId: preferredPortfolioId, workspaceId };
  }

  const creatable = await getCreatableRiskAiWorkspaces(supabase, userId);
  const resolved = resolveCreatableWorkspaceId({
    creatableIds: creatable.map((w) => w.id),
    requestedWorkspaceId,
  });

  if ("error" in resolved) {
    return { error: resolved.error };
  }

  return { portfolioId: null, workspaceId: resolved.workspaceId };
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
