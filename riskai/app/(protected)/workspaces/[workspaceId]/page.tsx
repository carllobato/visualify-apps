import {
  PORTFOLIO_REPORTING_MONTH_QUERY_PARAM,
  isValidReportingMonthYearKey,
} from "@/lib/reportingMonthSelection";
import { fetchLatestReportingMonthYearKeyForScope } from "@/lib/db/fetchLatestReportingMonthYearKeyForScope";
import { supabaseServerClient } from "@/lib/supabase/server";
import { riskaiPath } from "@/lib/routes";
import { userCanCreateProjectInWorkspace } from "@/lib/workspace/creatableWorkspaces";
import { resolveWorkspaceOverviewContext } from "@/lib/workspace/resolveWorkspaceOverviewContext";
import { redirect } from "next/navigation";
import { PortfolioOverviewContent } from "../../portfolios/[portfolioId]/PortfolioOverviewContent";
import { loadWorkspaceOverviewPresentation } from "./loadWorkspaceOverviewData";

type WorkspaceOverviewSearchParams = Record<string, string | string[] | undefined>;

function reportingMonthYearKeyFromSearchParams(
  sp: WorkspaceOverviewSearchParams
): string | null {
  const raw = sp[PORTFOLIO_REPORTING_MONTH_QUERY_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !isValidReportingMonthYearKey(trimmed)) return null;
  return trimmed;
}

export default async function WorkspaceOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<WorkspaceOverviewSearchParams>;
}) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const reportingMonthYearFromUrl = reportingMonthYearKeyFromSearchParams(sp);

  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(riskaiPath("/not-found"));
  }

  const overview = await resolveWorkspaceOverviewContext(workspaceId, user.id);
  if (!overview.ok) {
    redirect(riskaiPath("/not-found"));
  }

  const projectIds = overview.projects.map((project) => project.id);
  const defaultReportingMonthYear = await fetchLatestReportingMonthYearKeyForScope(supabase, {
    projectIds,
  });
  const reportingMonthYear = reportingMonthYearFromUrl ?? defaultReportingMonthYear ?? null;

  const canCreatePortfolioProject = await userCanCreateProjectInWorkspace(
    supabase,
    user.id,
    overview.workspace.id,
  );

  const presentation = await loadWorkspaceOverviewPresentation(
    supabase,
    overview.projects,
    overview.reportingUnit,
    reportingMonthYear
  );

  return (
    <PortfolioOverviewContent
      workspaceId={overview.workspace.id}
      canCreatePortfolioProject={canCreatePortfolioProject}
      reportingUnit={overview.reportingUnit}
      reportingMonthLabel={presentation.reportingMonthLabel}
      projectCount={presentation.projectCount}
      workspaceProjectCount={presentation.workspaceProjectCount}
      unreportedProjects={presentation.unreportedProjects}
      activeRiskCount={presentation.activeRiskCount}
      contingencyPrimaryValue={presentation.contingencyPrimaryValue}
      costExposurePrimaryValue={presentation.costExposurePrimaryValue}
      costExposureSubtext={presentation.costExposureSubtext}
      scheduleExposurePrimaryValue={presentation.scheduleExposurePrimaryValue}
      scheduleExposureSubtext={presentation.scheduleExposureSubtext}
      scheduleContingencyHeldPrimaryValue={presentation.scheduleContingencyHeldPrimaryValue}
      scheduleCoverageRatioPrimaryValue={presentation.scheduleCoverageRatioPrimaryValue}
      scheduleCoverageRatioPrimaryRagDot={presentation.scheduleCoverageRatioPrimaryRagDot}
      scheduleCoverageRatioSemanticClassName={presentation.scheduleCoverageRatioSemanticClassName}
      control={presentation.control}
      portfolioRag={presentation.portfolioRag}
      coveragePrimaryValue={presentation.coveragePrimaryValue}
      coveragePrimaryRagDot={presentation.coveragePrimaryRagDot}
      coverageRatioSemanticClassName={presentation.coverageRatioSemanticClassName}
      projectTilePayloads={presentation.projectTilePayloads}
      portfolioReportingFooter={presentation.portfolioReportingFooter}
      activeRiskSummaryRows={presentation.activeRiskSummaryRows}
      activeRiskStatusSummaryRows={presentation.activeRiskStatusSummaryRows}
      coverageRatioRows={presentation.coverageRatioRows}
      topCostRiskRows={presentation.topCostRiskRows}
      topScheduleRiskRows={presentation.topScheduleRiskRows}
      topCostOpportunityRows={presentation.topCostOpportunityRows}
      topScheduleOpportunityRows={presentation.topScheduleOpportunityRows}
      projectCostExposureSlices={presentation.projectCostExposureSlices}
      projectScheduleExposureSlices={presentation.projectScheduleExposureSlices}
      scheduleCoverageRows={presentation.scheduleCoverageRows}
      riskCategoryCounts={presentation.riskCategoryCounts}
      riskStatusCounts={presentation.riskStatusCounts}
      riskOwnerCounts={presentation.riskOwnerCounts}
      reportingVsPriorMonthTrends={presentation.reportingVsPriorMonthTrends}
      projectsKpiUnscopedSubtext="Under this workspace: only projects with a locked monthly reporting snapshot (saved run). Others are omitted from this view."
    />
  );
}
