import { fetchLatestReportingMonthYearKeyForScope } from "@/lib/db/fetchLatestReportingMonthYearKeyForScope";
import { supabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import {
  PORTFOLIO_REPORTING_MONTH_QUERY_PARAM,
  isValidReportingMonthYearKey,
} from "@/lib/reportingMonthSelection";
import { ProjectOverviewContent } from "./ProjectOverviewContent";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";

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

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<ProjectOverviewSearchParams>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const reportingMonthYearFromUrl = reportingMonthYearKeyFromSearchParams(sp);

  const supabase = await supabaseServerClient();

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

  const initialUrlSearch = (await headers()).get("x-url-search") ?? "";

  return (
    <ProjectOverviewContent
      initialData={{
        projectId,
        reportingSnapshot: (lockedReportingRow as SimulationSnapshotRow | null) ?? null,
        initialUrlSearch,
      }}
    />
  );
}
