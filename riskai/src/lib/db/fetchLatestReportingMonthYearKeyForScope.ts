import type { SupabaseClient } from "@supabase/supabase-js";
import { collectDistinctReportingMonthYearKeys } from "@/lib/reportingMonthSelection";

/**
 * Newest `YYYY-MM` among locked reporting snapshots with a non-null `report_month`
 * (same ordering as {@link fetchDistinctLockedReportingMonthKeys} / the dropdown default).
 */
export async function fetchLatestReportingMonthYearKeyForScope(
  supabase: SupabaseClient,
  scope: { projectId: string } | { portfolioId: string }
): Promise<string | null> {
  let projectIds: string[];
  if ("projectId" in scope) {
    const pid = scope.projectId.trim();
    if (!pid) return null;
    projectIds = [pid];
  } else {
    const pfid = scope.portfolioId.trim();
    if (!pfid) return null;
    const { data: projects, error } = await supabase
      .from("visualify_projects")
      .select("id")
      .eq("portfolio_id", pfid);
    if (error || !projects?.length) return null;
    projectIds = projects.map((p) => p.id as string);
  }

  const { data: rows, error } = await supabase
    .from("riskai_simulation_snapshots")
    .select("report_month")
    .eq("locked_for_reporting", true)
    .in("project_id", projectIds)
    .not("report_month", "is", null);

  if (error || !rows?.length) return null;
  const keys = collectDistinctReportingMonthYearKeys(rows);
  return keys[0] ?? null;
}
