import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { collectDistinctReportingMonthYearKeys, isValidReportingMonthYearKey } from "@/lib/reportingMonthSelection";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";

type SnapshotRowNonNull = Exclude<SimulationSnapshotRow, null>;

/** One locked reporting snapshot per calendar month (latest `locked_at` when multiple). */
export type LockedReportingMonthOption = {
  monthKey: string;
  row: SnapshotRowNonNull;
};

/**
 * Locked reporting snapshots for a project, deduped by `report_month` month (YYYY-MM).
 * For each month, keeps the row with the most recent `locked_at`.
 */
export async function fetchLockedReportingSnapshotsByMonthForProject(
  projectId?: string
): Promise<LockedReportingMonthOption[]> {
  const pid = projectId?.trim();
  if (!pid) return [];

  const supabase = supabaseBrowserClient();
  const { data: rows, error } = await supabase
    .from("riskai_simulation_snapshots")
    .select("*")
    .eq("project_id", pid)
    .eq("locked_for_reporting", true)
    .not("report_month", "is", null)
    .order("locked_at", { ascending: false, nullsFirst: false });

  if (error || !rows?.length) return [];

  const byMonth = new Map<string, SnapshotRowNonNull>();
  for (const row of rows) {
    if (row == null || typeof row !== "object") continue;
    const rm = (row as SnapshotRowNonNull).report_month;
    if (!rm || typeof rm !== "string") continue;
    const ym = rm.slice(0, 7);
    if (!isValidReportingMonthYearKey(ym)) continue;
    if (!byMonth.has(ym)) byMonth.set(ym, row as SnapshotRowNonNull);
  }

  return [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, row]) => ({ monthKey, row }));
}

export type DistinctLockedReportingMonthsResult = {
  /** Distinct `YYYY-MM` keys, newest first. */
  monthYearKeys: string[];
  /**
   * Locked reporting rows exist for the scope but none have a usable `report_month`
   * (legacy data). Distinct keys are empty in that case.
   */
  legacyLockedWithoutReportMonth: boolean;
};

/**
 * Distinct `YYYY-MM` keys from `report_month` on snapshots locked for reporting.
 * Newest months first (lexicographic sort works for ISO year-month).
 */
export async function fetchDistinctLockedReportingMonthKeys(scope: {
  projectId?: string;
  portfolioId?: string;
}): Promise<DistinctLockedReportingMonthsResult> {
  const pid = scope.projectId?.trim();
  const pfid = scope.portfolioId?.trim();
  if (!pid && !pfid) {
    return { monthYearKeys: [], legacyLockedWithoutReportMonth: false };
  }

  const supabase = supabaseBrowserClient();

  let projectIds: string[] = [];
  if (pid) {
    projectIds = [pid];
  } else if (pfid) {
    const { data: projects, error: projErr } = await supabase
      .from("visualify_projects")
      .select("id")
      .eq("portfolio_id", pfid);
    if (projErr || !projects?.length) {
      return { monthYearKeys: [], legacyLockedWithoutReportMonth: false };
    }
    projectIds = projects.map((p) => p.id as string);
  }

  const { data: rows, error } = await supabase
    .from("riskai_simulation_snapshots")
    .select("report_month")
    .eq("locked_for_reporting", true)
    .in("project_id", projectIds);

  if (error || !rows?.length) {
    return { monthYearKeys: [], legacyLockedWithoutReportMonth: false };
  }

  const monthYearKeys = collectDistinctReportingMonthYearKeys(rows as { report_month?: string | null }[]);
  return {
    monthYearKeys,
    legacyLockedWithoutReportMonth: monthYearKeys.length === 0,
  };
}
