import { fetchLatestReportingMonthYearKeyForScope } from "@/lib/db/fetchLatestReportingMonthYearKeyForScope";
import { supabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  PORTFOLIO_REPORTING_MONTH_QUERY_PARAM,
  UNPUBLISHED_REPORTING_MONTH_PARAM_VALUE,
  isUnpublishedReportingMonthParamValue,
  isValidReportingMonthYearKey,
} from "@/lib/reportingMonthSelection";
import { riskaiPath } from "@/lib/routes";
import { ProjectOverviewContent } from "./ProjectOverviewContent";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";
import type { SupabaseClient } from "@supabase/supabase-js";

type ProjectOverviewSearchParams = Record<string, string | string[] | undefined>;

function reportingMonthYearKeyFromSearchParams(
  sp: ProjectOverviewSearchParams
): string | null {
  const raw = sp[PORTFOLIO_REPORTING_MONTH_QUERY_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !isValidReportingMonthYearKey(trimmed)) return null;
  return trimmed;
}

function rawReportingMonthParamFromSearchParams(
  sp: ProjectOverviewSearchParams
): string | null {
  const raw = sp[PORTFOLIO_REPORTING_MONTH_QUERY_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function projectOverviewUrlWithReportingMonth(
  projectId: string,
  sp: ProjectOverviewSearchParams,
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
  return `${riskaiPath(`/projects/${projectId}`)}?${next.toString()}`;
}

/**
 * When the overview URL has no explicit `reportingMonth`, default to unpublished if there is no locked
 * snapshot yet but an unlocked one exists, or if an unlocked snapshot is newer than the latest locked
 * (same rules as unpublished mode snapshot selection).
 */
async function shouldDefaultProjectOverviewToUnpublished(
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
      "[ProjectOverview] default unpublished: latest locked reporting snapshot query failed",
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
      console.error("[ProjectOverview] default unpublished: unlocked snapshot check failed", anyUnlockedError);
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
    console.error("[ProjectOverview] default unpublished: newer unlocked snapshot query failed", newerUnlockedError);
    return false;
  }

  return newerUnlocked != null;
}

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<ProjectOverviewSearchParams>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const supabase = await supabaseServerClient();
  const initialUrlSearch = (await headers()).get("x-url-search") ?? "";

  const reportingMonthYearFromUrl = reportingMonthYearKeyFromSearchParams(sp);
  const rawReportingParam = rawReportingMonthParamFromSearchParams(sp);
  const unpublishedFromUrl =
    rawReportingParam != null && isUnpublishedReportingMonthParamValue(rawReportingParam);
  const hasExplicitValidReportingMonth =
    reportingMonthYearFromUrl != null || unpublishedFromUrl;

  if (!hasExplicitValidReportingMonth) {
    const defaultUnpublished = await shouldDefaultProjectOverviewToUnpublished(supabase, projectId);
    if (defaultUnpublished) {
      redirect(
        projectOverviewUrlWithReportingMonth(projectId, sp, UNPUBLISHED_REPORTING_MONTH_PARAM_VALUE)
      );
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
      console.error("[ProjectOverview] latest locked reporting snapshot query failed", latestLockedError);
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
        console.error("[ProjectOverview] unpublished fallback snapshot query failed", fallbackUnlockedError);
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
          console.error("[ProjectOverview] newer unpublished snapshot query failed", newerUnlockedError);
        }
        reportingSnapshot = (newerUnlocked as SimulationSnapshotRow | null) ?? null;
      }
    }

    return (
      <ProjectOverviewContent
        initialData={{
          projectId,
          reportingSnapshot,
          lockedReportingBaselineSnapshot,
          unpublishedMode: true,
          initialUrlSearch,
        }}
      />
    );
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
    console.error("[ProjectOverview] locked reporting snapshot query failed", lockedReportingError);
  }

  return (
    <ProjectOverviewContent
      initialData={{
        projectId,
        reportingSnapshot: (lockedReportingRow as SimulationSnapshotRow | null) ?? null,
        lockedReportingBaselineSnapshot: null,
        unpublishedMode: false,
        initialUrlSearch,
      }}
    />
  );
}
