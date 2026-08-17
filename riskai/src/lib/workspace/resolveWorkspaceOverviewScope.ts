import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_REPORTING_UNIT,
  asReportingUnit,
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
       * Internal Portfolio used only for Overview metadata such as `reporting_unit`.
       * Null when none exist, or when more than one exists (no multi-Portfolio selection).
       */
      uniquePortfolio: UniqueWorkspacePortfolio | null;
      /** True when 2+ Portfolio rows belong to this Workspace; metadata is not selected. */
      multiplePortfolios: boolean;
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

  const [projectsResult, portfoliosResult] = await Promise.all([
    params.supabase
      .from("visualify_projects")
      .select("id, name, created_at, portfolio_id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    params.supabase
      .from("visualify_portfolios")
      .select("id, reporting_unit")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
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
    reportingUnit: uniquePortfolio ? asReportingUnit(uniquePortfolio.reporting_unit) : DEFAULT_REPORTING_UNIT,
  };
}
