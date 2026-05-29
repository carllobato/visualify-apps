import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getControlAIProductId } from "@/lib/products";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { getControlAIEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";

export type AccessiblePortfolio = {
  id: string;
  name: string;
  created_at: string | null;
};

export type AccessibleProject = {
  id: string;
  name: string;
  created_at: string | null;
};

export type GetAccessiblePortfoliosResult =
  | { ok: true; portfolios: AccessiblePortfolio[] }
  | { ok: false; error: string };

export type GetAccessibleProjectsResult =
  | { ok: true; projects: AccessibleProject[] }
  | { ok: false; error: string };

/** Matches `@visualify/workspace-product-access` active member status handling. */
function isActiveWorkspaceMemberStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.toLowerCase() === "active";
}

function rowToAccessiblePortfolio(p: {
  id: string;
  name: string | null;
  created_at: string | null;
}): AccessiblePortfolio {
  return {
    id: p.id,
    name: p.name ?? "",
    created_at: p.created_at ?? null,
  };
}

function portfolioMatchesWorkspace(
  portfolioWorkspaceId: string | null | undefined,
  workspaceId: string | null | undefined,
): boolean {
  if (!workspaceId) return true;
  return portfolioWorkspaceId === workspaceId;
}

/**
 * Server-only: ControlAI portfolios the user may read (table owner, direct portfolio_members,
 * or active workspace membership on portfolio.workspace_id), restricted to `product_id = controlai`.
 * When `workspaceId` is set, only portfolios in that workspace are returned (same access paths).
 */
export async function getAccessibleControlAIPortfolios(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string | null,
): Promise<GetAccessiblePortfoliosResult> {
  const scopeToWorkspace = workspaceId !== undefined;
  const activeWorkspaceId =
    typeof workspaceId === "string" ? workspaceId.trim() : "";

  if (scopeToWorkspace && !activeWorkspaceId) {
    return { ok: true, portfolios: [] };
  }

  let controlAIProductId: string;
  try {
    controlAIProductId = await getControlAIProductId(supabase);
  } catch {
    return { ok: false, error: "ControlAI product not found" };
  }

  let ownerMemberPortfoliosQuery = supabase
    .from("visualify_portfolios")
    .select("id, name, created_at, owner_user_id, workspace_id")
    .eq("product_id", controlAIProductId);

  if (activeWorkspaceId) {
    ownerMemberPortfoliosQuery = ownerMemberPortfoliosQuery.eq("workspace_id", activeWorkspaceId);
  }

  const [portfoliosResult, membersResult, workspaceMembersResult] = await Promise.all([
    ownerMemberPortfoliosQuery.order("created_at", { ascending: true }),
    supabase.from("visualify_portfolio_members").select("portfolio_id").eq("user_id", userId),
    supabase
      .from("visualify_workspace_members")
      .select("workspace_id, status")
      .eq("user_id", userId),
  ]);

  const { data: portfolios, error } = portfoliosResult;
  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: memberships } = membersResult;

  const { data: workspaceMemberships, error: workspaceMembersError } = workspaceMembersResult;
  if (workspaceMembersError) {
    return { ok: false, error: workspaceMembersError.message };
  }

  const memberPortfolioIds = new Set((memberships ?? []).map((m) => m.portfolio_id));

  const workspaceIds = [
    ...new Set(
      (workspaceMemberships ?? [])
        .filter((m) => isActiveWorkspaceMemberStatus(m.status))
        .map((m) => m.workspace_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    ),
  ];

  const byOwnerOrMember = (portfolios ?? []).filter(
    (p) =>
      (p.owner_user_id === userId || memberPortfolioIds.has(p.id)) &&
      portfolioMatchesWorkspace(p.workspace_id, activeWorkspaceId || undefined),
  );

  let workspacePortfolios: { id: string; name: string | null; created_at: string | null }[] = [];
  const workspaceIdsForPortfolios = activeWorkspaceId
    ? workspaceIds.includes(activeWorkspaceId)
      ? [activeWorkspaceId]
      : []
    : workspaceIds;

  if (workspaceIdsForPortfolios.length > 0) {
    let workspacePortfoliosQuery = supabase
      .from("visualify_portfolios")
      .select("id, name, created_at")
      .eq("product_id", controlAIProductId)
      .in("workspace_id", workspaceIdsForPortfolios);

    if (activeWorkspaceId) {
      workspacePortfoliosQuery = workspacePortfoliosQuery.eq("workspace_id", activeWorkspaceId);
    }

    const { data, error: workspacePortfoliosError } = await workspacePortfoliosQuery.order(
      "created_at",
      { ascending: true },
    );

    if (workspacePortfoliosError) {
      return { ok: false, error: workspacePortfoliosError.message };
    }
    workspacePortfolios = data ?? [];
  }

  const byId = new Map<string, AccessiblePortfolio>();
  for (const p of byOwnerOrMember) {
    byId.set(p.id, rowToAccessiblePortfolio(p));
  }
  for (const p of workspacePortfolios) {
    byId.set(p.id, rowToAccessiblePortfolio(p));
  }

  const list = Array.from(byId.values()).sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });

  return { ok: true, portfolios: list };
}

type ProjectListRow = { id: string; name: string | null; created_at: string | null };

type ProjectListRowWithPortfolio = ProjectListRow & { portfolio_id: string | null };

const PROJECT_LIST_SELECT = "id, name, created_at";
const PROJECT_LIST_SELECT_WITH_PORTFOLIO = "id, name, created_at, portfolio_id";

function rowToAccessibleProject(p: ProjectListRow): AccessibleProject {
  return {
    id: p.id,
    name: p.name ?? "",
    created_at: p.created_at ?? null,
  };
}

function mergeAccessibleProjects(rows: ProjectListRow[]): AccessibleProject[] {
  const byId = new Map<string, AccessibleProject>();
  for (const row of rows) {
    byId.set(row.id, rowToAccessibleProject(row));
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
}

/**
 * Workspace-scoped ControlAI project list: active workspace member + ControlAI entitlement,
 * then service-role read by `workspace_id` with ControlAI portfolio filter when linked.
 */
async function getWorkspaceScopedControlAIProjects(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<GetAccessibleProjectsResult> {
  const entitledWorkspaces = await getControlAIEntitledWorkspaces(supabase, userId);
  if (!entitledWorkspaces.some((workspace) => workspace.id === workspaceId)) {
    return { ok: true, projects: [] };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("visualify_workspace_members")
    .select("status")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (membershipError) {
    return { ok: false, error: membershipError.message };
  }

  if (!membership || !isActiveWorkspaceMemberStatus(membership.status)) {
    return { ok: true, projects: [] };
  }

  let admin;
  try {
    admin = supabaseAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }

  let controlAIProductId: string;
  try {
    controlAIProductId = await getControlAIProductId(supabase);
  } catch {
    return { ok: false, error: "ControlAI product not found" };
  }

  const { data, error } = await admin
    .from("visualify_projects")
    .select(PROJECT_LIST_SELECT_WITH_PORTFOLIO)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const projects = (data ?? []) as ProjectListRowWithPortfolio[];
  const linkedPortfolioIds = [
    ...new Set(
      projects
        .map((project) => project.portfolio_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    ),
  ];

  let controlAIPortfolioIds = new Set<string>();
  if (linkedPortfolioIds.length > 0) {
    const { data: portfolios, error: portfoliosError } = await admin
      .from("visualify_portfolios")
      .select("id")
      .in("id", linkedPortfolioIds)
      .eq("product_id", controlAIProductId);

    if (portfoliosError) {
      return { ok: false, error: portfoliosError.message };
    }

    controlAIPortfolioIds = new Set(
      (portfolios ?? [])
        .map((portfolio) => portfolio.id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    );
  }

  const visibleRows = projects.filter(
    (project) => !project.portfolio_id || controlAIPortfolioIds.has(project.portfolio_id),
  );

  return { ok: true, projects: mergeAccessibleProjects(visibleRows) };
}

/**
 * Server-only: ControlAI projects the user may read.
 * When `workspaceId` is set: all projects in that workspace for entitled, active workspace members
 * (service-role read; portfolio-linked rows limited to ControlAI portfolios).
 * When omitted: legacy owner/portfolio-member RLS path.
 */
export async function getAccessibleControlAIProjects(
  supabase: SupabaseClient,
  userId: string,
  accessiblePortfolioIds: string[],
  workspaceId?: string | null,
): Promise<GetAccessibleProjectsResult> {
  const scopeToWorkspace = workspaceId !== undefined;
  const activeWorkspaceId =
    typeof workspaceId === "string" ? workspaceId.trim() : "";

  if (scopeToWorkspace && !activeWorkspaceId) {
    return { ok: true, projects: [] };
  }

  if (activeWorkspaceId) {
    return getWorkspaceScopedControlAIProjects(supabase, userId, activeWorkspaceId);
  }

  const portfolioIds = [
    ...new Set(
      accessiblePortfolioIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  ];

  if (portfolioIds.length === 0) {
    return { ok: true, projects: [] };
  }

  const { data, error } = await supabase
    .from("visualify_projects")
    .select(PROJECT_LIST_SELECT)
    .in("portfolio_id", portfolioIds)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, projects: mergeAccessibleProjects((data ?? []) as ProjectListRow[]) };
}
