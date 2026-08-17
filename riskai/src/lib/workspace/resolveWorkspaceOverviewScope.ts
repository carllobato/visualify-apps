import type { SupabaseClient } from "@supabase/supabase-js";
import { filterActiveProjects, filterArchivedProjects } from "@/lib/db/activeProjectList";
import {
  reportingUnitForPortfolioDashboard,
  type ReportingUnitOption,
} from "@/lib/portfolio/reportingPreferences";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

export type WorkspaceOverviewProject = {
  id: string;
  name: string;
  created_at: string | null;
  portfolio_id: string | null;
};

export type UniqueWorkspacePortfolio = {
  id: string;
  reporting_unit: string | null;
};

export type ResolveWorkspaceOverviewScopeResult =
  | { ok: false; error: "invalid" | "forbidden" }
  | {
      ok: true;
      workspace: EntitledWorkspace;
      projects: WorkspaceOverviewProject[];
      /**
       * Unique internal Portfolio, used only for Create Project compatibility.
       * Null when none exist, or when more than one exists (no multi-Portfolio selection).
       */
      uniquePortfolio: UniqueWorkspacePortfolio | null;
      /** True when 2+ Portfolio rows belong to this Workspace; metadata is not selected. */
      multiplePortfolios: boolean;
      /**
       * Workspace Settings unit when set; otherwise the unique Portfolio fallback
       * Settings and Portfolio Overview already use.
       */
      reportingUnit: ReportingUnitOption;
    };

function trimId(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Authorises a Workspace Overview URL against Sprint 1 entitled Workspaces, then loads
 * Projects by `visualify_projects.workspace_id` (including `portfolio_id IS NULL`).
 * Does not use `portfolio_id` to choose which Projects appear.
 */
export async function resolveWorkspaceOverviewScope(params: {
  supabase: SupabaseClient;
  workspaceId: string;
  entitledWorkspaces: readonly EntitledWorkspace[];
}): Promise<ResolveWorkspaceOverviewScopeResult> {
  const workspaceId = trimId(params.workspaceId);
  if (!workspaceId) {
    return { ok: false, error: "invalid" };
  }

  const workspace = params.entitledWorkspaces.find((row) => trimId(row.id) === workspaceId);
  if (!workspace) {
    return { ok: false, error: "forbidden" };
  }

  const [projectsResult, portfoliosResult, workspaceRowResult] = await Promise.all([
    filterActiveProjects(
      params.supabase
        .from("visualify_projects")
        .select("id, name, created_at, portfolio_id")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
    ),
    params.supabase
      .from("visualify_portfolios")
      .select("id, reporting_unit")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    params.supabase
      .from("visualify_workspaces")
      .select("reporting_unit")
      .eq("id", workspaceId)
      .maybeSingle(),
  ]);

  const projects: WorkspaceOverviewProject[] = [];
  if (!projectsResult.error) {
    for (const row of projectsResult.data ?? []) {
      const id = trimId(typeof row.id === "string" ? row.id : "");
      if (!id) continue;
      projects.push({
        id,
        name: typeof row.name === "string" ? row.name : "",
        created_at: typeof row.created_at === "string" ? row.created_at : null,
        portfolio_id: typeof row.portfolio_id === "string" && row.portfolio_id.trim() ? row.portfolio_id.trim() : null,
      });
    }
  }

  const portfolioRows = !portfoliosResult.error ? (portfoliosResult.data ?? []) : [];
  const multiplePortfolios = portfolioRows.length > 1;
  const uniqueRow = portfolioRows.length === 1 ? portfolioRows[0] : null;
  const uniquePortfolio =
    uniqueRow && typeof uniqueRow.id === "string" && uniqueRow.id.trim()
      ? {
          id: uniqueRow.id.trim(),
          reporting_unit: typeof uniqueRow.reporting_unit === "string" ? uniqueRow.reporting_unit : null,
        }
      : null;

  return {
    ok: true,
    workspace,
    projects,
    uniquePortfolio,
    multiplePortfolios,
    reportingUnit: reportingUnitForPortfolioDashboard({
      workspaceReportingUnit: workspaceRowResult.error
        ? undefined
        : workspaceRowResult.data?.reporting_unit,
      portfolioReportingUnit: uniquePortfolio?.reporting_unit,
    }),
  };
}

export type WorkspaceArchivedProject = {
  id: string;
  name: string;
  archived_at: string;
};

/**
 * Archived Projects for a Workspace. Used only on `/workspaces/[id]/projects` Restore UI.
 * Does not feed Overview KPIs or active tiles.
 *
 * Matches archive auth: `visualify_projects.workspace_id`, or a null project workspace_id
 * with a linked Portfolio in this Workspace (legacy portfolio-linked rows).
 */
export async function loadWorkspaceArchivedProjects(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceArchivedProject[]> {
  const id = trimId(workspaceId);
  if (!id) return [];

  const portfoliosResult = await supabase
    .from("visualify_portfolios")
    .select("id")
    .eq("workspace_id", id);
  const portfolioIds: string[] = [];
  if (!portfoliosResult.error) {
    for (const row of portfoliosResult.data ?? []) {
      const portfolioId = trimId(typeof row.id === "string" ? row.id : "");
      if (portfolioId) portfolioIds.push(portfolioId);
    }
  }

  const [byWorkspaceResult, byLegacyPortfolioResult] = await Promise.all([
    filterArchivedProjects(
      supabase
        .from("visualify_projects")
        .select("id, name, archived_at")
        .eq("workspace_id", id)
        .order("archived_at", { ascending: false }),
    ),
    portfolioIds.length > 0
      ? filterArchivedProjects(
          supabase
            .from("visualify_projects")
            .select("id, name, archived_at")
            .is("workspace_id", null)
            .in("portfolio_id", portfolioIds)
            .order("archived_at", { ascending: false }),
        )
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);

  const merged = new Map<string, WorkspaceArchivedProject>();
  for (const result of [byWorkspaceResult, byLegacyPortfolioResult]) {
    if (result.error) continue;
    for (const row of result.data ?? []) {
      const projectId = trimId(typeof row.id === "string" ? row.id : "");
      if (!projectId || merged.has(projectId)) continue;
      const archivedAt = typeof row.archived_at === "string" ? row.archived_at : "";
      if (!archivedAt) continue;
      merged.set(projectId, {
        id: projectId,
        name: typeof row.name === "string" ? row.name : "",
        archived_at: archivedAt,
      });
    }
  }

  return [...merged.values()].sort((a, b) => b.archived_at.localeCompare(a.archived_at));
}
