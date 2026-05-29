import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { getAccessibleControlAIPortfolios } from "@/lib/portfolios-server";
import { productConfig } from "@/lib/product-config";
import { CONTROLAI_ROUTES } from "@/lib/controlai-routes";
import { resolveActiveWorkspaceContext } from "@/lib/workspace/resolveActiveWorkspace";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

type ControlAIProjectInsertPayload = {
  name: string;
  owner_user_id: string;
  workspace_id: string;
  portfolio_id?: string | null;
};

async function resolvePortfolioIdForCreate(
  supabase: Awaited<ReturnType<typeof supabaseServerClient>>,
  userId: string,
  activeWorkspaceId: string,
  rawPortfolioId: unknown,
): Promise<{ portfolioId: string | null } | { error: string }> {
  const portfolioId =
    typeof rawPortfolioId === "string" && rawPortfolioId.trim().length > 0
      ? rawPortfolioId.trim()
      : null;

  if (!portfolioId) {
    return { portfolioId: null };
  }

  const accessible = await getAccessibleControlAIPortfolios(supabase, userId, activeWorkspaceId);
  if (!accessible.ok) {
    return { error: "Could not validate portfolio." };
  }

  const allowed = accessible.portfolios.some((p) => p.id === portfolioId);
  if (!allowed) {
    return { error: "Invalid portfolio for this workspace." };
  }

  return { portfolioId };
}

/**
 * POST /api/projects — Create a ControlAI project in the active workspace.
 * Workspace comes from the server cookie resolver only (never from the client body).
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await supabaseServerClient();
  const workspaceContext = await resolveActiveWorkspaceContext(supabase, user.id);
  const activeWorkspaceId = workspaceContext.selectedWorkspaceId?.trim() ?? "";

  if (!activeWorkspaceId) {
    return NextResponse.json(
      {
        error: "Select a workspace before creating a project.",
        redirectTo: CONTROLAI_ROUTES.selectWorkspace,
      },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawName =
    typeof body === "object" && body !== null && "name" in body
      ? (body as { name: unknown }).name
      : undefined;
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  const rawPortfolioId =
    typeof body === "object" && body !== null && "portfolioId" in body
      ? (body as { portfolioId: unknown }).portfolioId
      : undefined;

  const portfolioTarget = await resolvePortfolioIdForCreate(
    supabase,
    user.id,
    activeWorkspaceId,
    rawPortfolioId,
  );
  if ("error" in portfolioTarget) {
    return NextResponse.json({ error: portfolioTarget.error }, { status: 400 });
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
          ? "Project creation is not configured: add SUPABASE_SERVICE_ROLE_KEY to the server environment."
          : "Project creation is not configured.",
      },
      { status: 503 },
    );
  }

  const insertPayload: ControlAIProjectInsertPayload = {
    name,
    owner_user_id: user.id,
    workspace_id: activeWorkspaceId,
    portfolio_id: portfolioTarget.portfolioId,
  };

  const { data, error } = await admin
    .from("visualify_projects")
    .insert(insertPayload)
    .select("id, name, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data }, { status: 201, headers: CACHE_HEADERS });
}
