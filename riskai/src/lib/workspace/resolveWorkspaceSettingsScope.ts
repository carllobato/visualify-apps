import type { SupabaseClient } from "@supabase/supabase-js";
import {
  reportingUnitForPortfolioDashboard,
  type ReportingUnitOption,
} from "@/lib/portfolio/reportingPreferences";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

export type ResolveWorkspaceSettingsScopeResult =
  | { ok: false; error: "invalid" | "forbidden" | "not_found" }
  | {
      ok: true;
      workspaceId: string;
      workspaceName: string;
      workspaceSlug: string;
      reportingUnit: ReportingUnitOption;
    };

function trimId(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Authorises Workspace Settings against entitled Workspaces, then loads identity
 * from `visualify_workspaces`. Reporting unit uses the Workspace value when set,
 * otherwise the unique Portfolio fallback dashboards already use.
 */
export async function resolveWorkspaceSettingsScope(params: {
  supabase: SupabaseClient;
  workspaceId: string;
  entitledWorkspaces: readonly EntitledWorkspace[];
}): Promise<ResolveWorkspaceSettingsScopeResult> {
  const workspaceId = trimId(params.workspaceId);
  if (!workspaceId) {
    return { ok: false, error: "invalid" };
  }

  const entitled = params.entitledWorkspaces.find((row) => trimId(row.id) === workspaceId);
  if (!entitled) {
    return { ok: false, error: "forbidden" };
  }

  const [workspaceResult, portfoliosResult] = await Promise.all([
    params.supabase
      .from("visualify_workspaces")
      .select("id, name, slug, reporting_unit")
      .eq("id", workspaceId)
      .maybeSingle(),
    params.supabase
      .from("visualify_portfolios")
      .select("id, reporting_unit")
      .eq("workspace_id", workspaceId),
  ]);

  const { data, error } = workspaceResult;
  if (error || !data) {
    return { ok: false, error: "not_found" };
  }

  const id = trimId(typeof data.id === "string" ? data.id : "");
  const slug = trimId(typeof data.slug === "string" ? data.slug : "");
  if (!id || !slug) {
    return { ok: false, error: "not_found" };
  }

  const workspaceName =
    typeof data.name === "string" && data.name.trim() ? data.name.trim() : entitled.name;

  const portfolioRows = !portfoliosResult.error ? (portfoliosResult.data ?? []) : [];
  const uniquePortfolioReportingUnit =
    portfolioRows.length === 1 ? portfolioRows[0]?.reporting_unit : undefined;

  return {
    ok: true,
    workspaceId: id,
    workspaceName,
    workspaceSlug: slug,
    reportingUnit: reportingUnitForPortfolioDashboard({
      workspaceReportingUnit: data.reporting_unit,
      portfolioReportingUnit: uniquePortfolioReportingUnit,
    }),
  };
}
