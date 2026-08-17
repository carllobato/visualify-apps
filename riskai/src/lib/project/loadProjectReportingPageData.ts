import { fetchLatestReportingMonthYearKeyForScope } from "@/lib/db/fetchLatestReportingMonthYearKeyForScope";
import {
  PORTFOLIO_REPORTING_MONTH_QUERY_PARAM,
  UNPUBLISHED_REPORTING_MONTH_PARAM_VALUE,
  isUnpublishedReportingMonthParamValue,
  isValidReportingMonthYearKey,
} from "@/lib/reportingMonthSelection";
import { riskaiPath } from "@/lib/routes";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectReportingSearchParams = Record<string, string | string[] | undefined>;

export type ProjectReportingPageInitialData = {
  projectId: string;
  /** Primary overview row: locked snapshot for the selected month, or latest unlocked snapshot in unpublished mode. */
  reportingSnapshot: SimulationSnapshotRow | null;
  /** Latest locked reporting snapshot for stale/position comparison when `unpublishedMode` is true; otherwise null. */
  lockedReportingBaselineSnapshot: SimulationSnapshotRow | null;
  unpublishedMode: boolean;
  /** From `x-url-search` (middleware) for reporting month control without Suspense. */
  initialUrlSearch: string;
};

export type LoadProjectReportingPageResult =
  | { kind: "redirect"; url: string }
  | { kind: "data"; initialData: ProjectReportingPageInitialData };

export function reportingMonthYearKeyFromSearchParams(
  sp: ProjectReportingSearchParams
): string | null {
  const raw = sp[PORTFOLIO_REPORTING_MONTH_QUERY_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !isValidReportingMonthYearKey(trimmed)) return null;
  return trimmed;
}

export function rawReportingMonthParamFromSearchParams(
  sp: ProjectReportingSearchParams
): string | null {
  const raw = sp[PORTFOLIO_REPORTING_MONTH_QUERY_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function projectReportingPageUrlWithReportingMonth(
  pagePath: string,
  sp: ProjectReportingSearchParams,
  reportingMonthValue: string
): string {
  const next = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) continue;
    if (key === PORTFOLIO_REPORTING_MONTH_QUERY_PARAM) continue;
    if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === "string") next.append(key, v);
      }
    } else if (typeof val === "string") {
      next.set(key, val);
    }
  }
  next.set(PORTFOLIO_REPORTING_MONTH_QUERY_PARAM, reportingMonthValue);
  return `${riskaiPath(pagePath)}?${next.toString()}`;
}

/**
 * When the reporting URL has no explicit `reportingMonth`, default to unpublished if there is no locked
 * snapshot yet but an unlocked one exists, or if an unlocked snapshot is newer than the latest locked
 * (same rules as unpublished mode snapshot selection).
 */
async function shouldDefaultProjectReportingToUnpublished(
  supabase: SupabaseClient,
  projectId: string
): Promise<boolean> {
  const { data: latestLocked, error: latestLockedError } = await supabase
    .from("riskai_simulation_snapshots")
    .select("created_at, locked_at")
    .eq("project_id", projectId)
    .eq("locked_for_reporting", true)
    .order("locked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestLockedError) {
    console.error(
      "[ProjectReporting] default unpublished: latest locked reporting snapshot query failed",
      latestLockedError
    );
    return false;
  }

  if (!latestLocked) {
    const { data: anyUnlocked, error: anyUnlockedError } = await supabase
      .from("riskai_simulation_snapshots")
      .select("id")
      .eq("project_id", projectId)
      .or("locked_for_reporting.is.null,locked_for_reporting.eq.false")
      .limit(1)
      .maybeSingle();

    if (anyUnlockedError) {
      console.error("[ProjectReporting] default unpublished: unlocked snapshot check failed", anyUnlockedError);
      return false;
    }
    return anyUnlocked != null;
  }

  const cutoff =
    typeof latestLocked.created_at === "string" && latestLocked.created_at.trim() !== ""
      ? latestLocked.created_at
      : typeof latestLocked.locked_at === "string" && latestLocked.locked_at.trim() !== ""
        ? latestLocked.locked_at
        : null;

  if (cutoff == null) {
    return false;
  }

  const { data: newerUnlocked, error: newerUnlockedError } = await supabase
    .from("riskai_simulation_snapshots")
    .select("id")
    .eq("project_id", projectId)
    .or("locked_for_reporting.is.null,locked_for_reporting.eq.false")
    .gt("created_at", cutoff)
    .limit(1)
    .maybeSingle();

  if (newerUnlockedError) {
    console.error("[ProjectReporting] default unpublished: newer unlocked snapshot query failed", newerUnlockedError);
    return false;
  }

  return newerUnlocked != null;
}

export async function loadProjectReportingPageData(params: {
  supabase: SupabaseClient;
  projectId: string;
  searchParams: ProjectReportingSearchParams;
  pagePath: string;
  initialUrlSearch: string;
}): Promise<LoadProjectReportingPageResult> {
  const { supabase, projectId, searchParams: sp, pagePath, initialUrlSearch } = params;

  const reportingMonthYearFromUrl = reportingMonthYearKeyFromSearchParams(sp);
  const rawReportingParam = rawReportingMonthParamFromSearchParams(sp);
  const unpublishedFromUrl =
    rawReportingParam != null && isUnpublishedReportingMonthParamValue(rawReportingParam);
  const hasExplicitValidReportingMonth =
    reportingMonthYearFromUrl != null || unpublishedFromUrl;

  if (!hasExplicitValidReportingMonth) {
    const defaultUnpublished = await shouldDefaultProjectReportingToUnpublished(supabase, projectId);
    if (defaultUnpublished) {
      return {
        kind: "redirect",
        url: projectReportingPageUrlWithReportingMonth(
          pagePath,
          sp,
          UNPUBLISHED_REPORTING_MONTH_PARAM_VALUE
        ),
      };
    }
  }

  if (unpublishedFromUrl) {
    const { data: latestLocked, error: latestLockedError } = await supabase
      .from("riskai_simulation_snapshots")
      .select("*")
      .eq("project_id", projectId)
      .eq("locked_for_reporting", true)
      .order("locked_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestLockedError) {
      console.error("[ProjectReporting] latest locked reporting snapshot query failed", latestLockedError);
    }

    let reportingSnapshot: SimulationSnapshotRow | null = null;
    let lockedReportingBaselineSnapshot: SimulationSnapshotRow | null = null;

    if (!latestLocked) {
      const { data: fallbackUnlocked, error: fallbackUnlockedError } = await supabase
        .from("riskai_simulation_snapshots")
        .select("*")
        .eq("project_id", projectId)
        .or("locked_for_reporting.is.null,locked_for_reporting.eq.false")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackUnlockedError) {
        console.error("[ProjectReporting] unpublished fallback snapshot query failed", fallbackUnlockedError);
      }
      reportingSnapshot = (fallbackUnlocked as SimulationSnapshotRow | null) ?? null;
    } else {
      lockedReportingBaselineSnapshot = latestLocked as SimulationSnapshotRow;
      const cutoff =
        typeof latestLocked.created_at === "string" && latestLocked.created_at.trim() !== ""
          ? latestLocked.created_at
          : typeof latestLocked.locked_at === "string" && latestLocked.locked_at.trim() !== ""
            ? latestLocked.locked_at
            : null;

      if (cutoff != null) {
        const { data: newerUnlocked, error: newerUnlockedError } = await supabase
          .from("riskai_simulation_snapshots")
          .select("*")
          .eq("project_id", projectId)
          .or("locked_for_reporting.is.null,locked_for_reporting.eq.false")
          .gt("created_at", cutoff)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (newerUnlockedError) {
          console.error("[ProjectReporting] newer unpublished snapshot query failed", newerUnlockedError);
        }
        reportingSnapshot = (newerUnlocked as SimulationSnapshotRow | null) ?? null;
      }
    }

    return {
      kind: "data",
      initialData: {
        projectId,
        reportingSnapshot,
        lockedReportingBaselineSnapshot,
        unpublishedMode: true,
        initialUrlSearch,
      },
    };
  }

  const defaultReportingMonthYear = await fetchLatestReportingMonthYearKeyForScope(supabase, {
    projectId,
  });
  const effectiveReportingMonthYear =
    reportingMonthYearFromUrl ?? defaultReportingMonthYear ?? null;

  let query = supabase
    .from("riskai_simulation_snapshots")
    .select("*")
    .eq("project_id", projectId)
    .eq("locked_for_reporting", true);

  if (effectiveReportingMonthYear != null) {
    query = query.eq("report_month", `${effectiveReportingMonthYear}-01`);
  }

  const { data: lockedReportingRow, error: lockedReportingError } = await query
    .order("locked_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (lockedReportingError) {
    console.error("[ProjectReporting] locked reporting snapshot query failed", lockedReportingError);
  }

  return {
    kind: "data",
    initialData: {
      projectId,
      reportingSnapshot: (lockedReportingRow as SimulationSnapshotRow | null) ?? null,
      lockedReportingBaselineSnapshot: null,
      unpublishedMode: false,
      initialUrlSearch,
    },
  };
}
