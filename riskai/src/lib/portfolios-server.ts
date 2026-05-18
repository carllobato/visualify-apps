import {
  portfolioMemberRoleAllowsSettingsPageAccess,
  resolvePortfolioMemberCapabilityFlags,
  type PortfolioMemberCapabilityFlags,
} from "@/lib/db/portfolioMemberAccess";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import { resolveWorkspacePortfolioCapabilities } from "@/lib/workspace/workspaceRoleCapabilities";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AccessiblePortfolio = {
  id: string;
  name: string;
  created_at: string | null;
};

/** Full portfolio row for admin (includes owner_user_id, description, product). */
export type PortfolioForAdmin = {
  id: string;
  name: string;
  description: string | null;
  owner_user_id: string;
  product_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  reporting_currency: string | null;
  reporting_unit: string | null;
};

export type PortfolioMemberRow = {
  id: string;
  portfolio_id: string;
  user_id: string;
  role: string;
  created_at: string | null;
};

export type AssertPortfolioAdminOk = {
  portfolio: PortfolioForAdmin;
} & PortfolioMemberCapabilityFlags;
export type AssertPortfolioAdminDenied =
  | { error: "unauthorized" }
  | { error: "forbidden" }
  | { error: "not_found" };
export type AssertPortfolioAdminResult =
  | AssertPortfolioAdminOk
  | AssertPortfolioAdminDenied;

/**
 * Server-only. Verifies the user may open portfolio settings: table owner, portfolio_members with
 * owner / editor / viewer, or workspace owner/admin on the portfolio's workspace (member/viewer denied).
 */
export async function assertPortfolioAdminAccess(
  portfolioId: string,
  supabase: SupabaseClient,
  userId: string
): Promise<AssertPortfolioAdminResult> {
  const { data: portfolio, error: portfolioError } = await supabase
    .from("visualify_portfolios")
    .select(
      "id, name, description, owner_user_id, product_id, created_at, updated_at, reporting_currency, reporting_unit, workspace_id"
    )
    .eq("id", portfolioId)
    .single();

  if (portfolioError || !portfolio) {
    return { error: "not_found" };
  }

  const shaped: PortfolioForAdmin = {
    id: portfolio.id,
    name: portfolio.name,
    description: portfolio.description ?? null,
    owner_user_id: portfolio.owner_user_id,
    product_id: portfolio.product_id ?? null,
    created_at: portfolio.created_at ?? null,
    updated_at: portfolio.updated_at ?? null,
    reporting_currency:
      typeof portfolio.reporting_currency === "string" ? portfolio.reporting_currency : null,
    reporting_unit: typeof portfolio.reporting_unit === "string" ? portfolio.reporting_unit : null,
  };

  const isTableOwner = portfolio.owner_user_id === userId;

  const { data: membership } = await supabase
    .from("visualify_portfolio_members")
    .select("role")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", userId)
    .maybeSingle();

  const rowRole = membership?.role as string | undefined;

  if (isTableOwner) {
    const caps = resolvePortfolioMemberCapabilityFlags(true, rowRole);
    return { portfolio: shaped, ...caps };
  }

  if (!membership || !portfolioMemberRoleAllowsSettingsPageAccess(rowRole)) {
    const workspaceId =
      typeof portfolio.workspace_id === "string" && portfolio.workspace_id.trim().length > 0
        ? portfolio.workspace_id.trim()
        : null;

    if (workspaceId) {
      const workspaceRole = await fetchWorkspaceMemberRole(supabase, workspaceId, userId);
      if (workspaceRole) {
        const workspaceCaps = resolveWorkspacePortfolioCapabilities(workspaceRole);
        if (workspaceCaps.canAccessPortfolioSettings) {
          const caps: PortfolioMemberCapabilityFlags = {
            canEditPortfolioDetails: workspaceCaps.canEditPortfolioDetails,
            canInviteMembers: workspaceCaps.canInviteMembers,
            canChangeMemberRoles: workspaceCaps.canChangeMemberRoles,
            canRemoveMembers: workspaceCaps.canRemoveMembers,
          };
          return { portfolio: shaped, ...caps };
        }
      }
    }

    return { error: "forbidden" };
  }

  const caps = resolvePortfolioMemberCapabilityFlags(false, rowRole);
  return { portfolio: shaped, ...caps };
}

export type GetAccessiblePortfoliosResult =
  | { ok: true; portfolios: AccessiblePortfolio[] }
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

/**
 * Server-only: returns portfolios the user may read (table owner, direct portfolio_members,
 * or active visualify_workspace_members on portfolio.workspace_id).
 * Same access logic as GET /api/portfolios — use this from API and server components
 * so behaviour never drifts.
 */
export async function getAccessiblePortfolios(
  supabase: SupabaseClient,
  userId: string
): Promise<GetAccessiblePortfoliosResult> {
  const [portfoliosResult, membersResult, workspaceMembersResult] = await Promise.all([
    supabase
      .from("visualify_portfolios")
      .select("id, name, created_at, owner_user_id")
      .order("created_at", { ascending: true }),
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

  const memberPortfolioIds = new Set(
    (memberships ?? []).map((m) => m.portfolio_id)
  );

  const workspaceIds = [
    ...new Set(
      (workspaceMemberships ?? [])
        .filter((m) => isActiveWorkspaceMemberStatus(m.status))
        .map((m) => m.workspace_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    ),
  ];

  const byOwnerOrMember = (portfolios ?? []).filter(
    (p) => p.owner_user_id === userId || memberPortfolioIds.has(p.id)
  );

  let workspacePortfolios: { id: string; name: string | null; created_at: string | null }[] = [];
  if (workspaceIds.length > 0) {
    const { data, error: workspacePortfoliosError } = await supabase
      .from("visualify_portfolios")
      .select("id, name, created_at")
      .in("workspace_id", workspaceIds)
      .order("created_at", { ascending: true });

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

export type AccessibleProject = {
  id: string;
  name: string;
  created_at: string | null;
};

export type GetAccessibleProjectsResult =
  | { ok: true; projects: AccessibleProject[] }
  | { ok: false; error: string };

type ProjectListRow = { id: string; name: string | null; created_at: string | null };

const PROJECT_LIST_SELECT = "id, name, created_at";

/**
 * Server-only: projects the user may read — table owner, direct project_members, projects under
 * readable portfolios (`accessiblePortfolioIds`), or projects in workspaces where the user has
 * active visualify_workspace_members.
 */
export async function getAccessibleProjects(
  supabase: SupabaseClient,
  userId: string,
  accessiblePortfolioIds: string[]
): Promise<GetAccessibleProjectsResult> {
  const portfolioIds = [
    ...new Set(
      accessiblePortfolioIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  ];

  const [ownedResult, membersIndexResult, workspaceMembersResult] = await Promise.all([
    supabase
      .from("visualify_projects")
      .select(PROJECT_LIST_SELECT)
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true }),
    supabase.from("visualify_project_members").select("project_id").eq("user_id", userId),
    supabase
      .from("visualify_workspace_members")
      .select("workspace_id, status")
      .eq("user_id", userId),
  ]);

  const { data: ownedProjects, error: ownedError } = ownedResult;
  const { data: memberRows, error: memberError } = membersIndexResult;

  if (ownedError) {
    return { ok: false, error: ownedError.message };
  }

  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  const { data: workspaceMemberships, error: workspaceMembersError } = workspaceMembersResult;
  if (workspaceMembersError) {
    return { ok: false, error: workspaceMembersError.message };
  }

  const memberProjectIds = [
    ...new Set((memberRows ?? []).map((r) => r.project_id as string)),
  ];

  const workspaceIds = [
    ...new Set(
      (workspaceMemberships ?? [])
        .filter((m) => isActiveWorkspaceMemberStatus(m.status))
        .map((m) => m.workspace_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    ),
  ];

  const emptyProjectList = Promise.resolve({
    data: [] as ProjectListRow[],
    error: null,
  });

  const [memberProjectsResult, portfolioProjectsResult, workspaceProjectsResult] =
    await Promise.all([
      memberProjectIds.length > 0
        ? supabase
            .from("visualify_projects")
            .select(PROJECT_LIST_SELECT)
            .in("id", memberProjectIds)
            .order("created_at", { ascending: true })
        : emptyProjectList,
      portfolioIds.length > 0
        ? supabase
            .from("visualify_projects")
            .select(PROJECT_LIST_SELECT)
            .in("portfolio_id", portfolioIds)
            .order("created_at", { ascending: true })
        : emptyProjectList,
      workspaceIds.length > 0
        ? supabase
            .from("visualify_projects")
            .select(PROJECT_LIST_SELECT)
            .in("workspace_id", workspaceIds)
            .order("created_at", { ascending: true })
        : emptyProjectList,
    ]);

  if (memberProjectsResult.error) {
    return { ok: false, error: memberProjectsResult.error.message };
  }
  if (portfolioProjectsResult.error) {
    return { ok: false, error: portfolioProjectsResult.error.message };
  }
  if (workspaceProjectsResult.error) {
    return { ok: false, error: workspaceProjectsResult.error.message };
  }

  const rowToAccessible = (p: ProjectListRow): AccessibleProject => ({
    id: p.id,
    name: p.name ?? "",
    created_at: p.created_at ?? null,
  });

  /** First non-empty (after trim) display name; safe for null/undefined/non-string DB values. */
  const preferredName = (raw: unknown): string | null => {
    if (raw == null) return null;
    const str = typeof raw === "string" ? raw : String(raw);
    return str.trim() ? str : null;
  };

  const mergeRows = (a: AccessibleProject, b: AccessibleProject): AccessibleProject => ({
    id: a.id,
    name: preferredName(a.name) ?? preferredName(b.name) ?? "",
    created_at: a.created_at ?? b.created_at,
  });

  const byId = new Map<string, AccessibleProject>();
  const addProjectRow = (p: ProjectListRow) => {
    const next = rowToAccessible(p);
    const prev = byId.get(p.id);
    byId.set(p.id, prev ? mergeRows(prev, next) : next);
  };

  for (const p of ownedProjects ?? []) {
    addProjectRow(p);
  }
  for (const p of memberProjectsResult.data ?? []) {
    addProjectRow(p);
  }
  for (const p of portfolioProjectsResult.data ?? []) {
    addProjectRow(p);
  }
  for (const p of workspaceProjectsResult.data ?? []) {
    addProjectRow(p);
  }

  const merged = Array.from(byId.values()).sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });

  return { ok: true, projects: merged };
}
