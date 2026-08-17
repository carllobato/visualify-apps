import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregatePortfolioRag,
  loadPortfolioControlScore,
  loadProjectContingencyTable,
  loadProjectTilePayloads,
  loadTopRiskConcentrationRows,
  type PortfolioControlScore,
  type PortfolioProjectCoverageRow,
  type PortfolioProjectCostExposureSlice,
  type PortfolioProjectRiskSeverityRow,
  type PortfolioProjectRiskStatusRow,
  type PortfolioProjectScheduleCoverageRow,
  type PortfolioProjectScheduleExposureSlice,
  type PortfolioReportingFooterRow,
  type PortfolioRiskCategoryCount,
  type PortfolioRiskOwnerCount,
  type PortfolioRiskStatusCount,
  type PortfolioTopRiskRow,
  type ProjectTilePayload,
  type OverviewLoaderProjectWithCreatedAt,
  type RagStatus,
} from "@/lib/dashboard/projectTileServerData";
import {
  computePortfolioOverviewReportingTrends,
  type PortfolioOverviewReportingTrendSet,
} from "@/lib/dashboard/portfolioOverviewReportingTrends";
import {
  workspaceProjectsOmittedFromReportingMonth,
  type WorkspaceUnreportedProject,
} from "@/lib/dashboard/overviewCustomerCopy";
import { addReportingMonthYearKey } from "@/lib/reportingMonthSelection";
import { formatReportMonthLabel } from "@/lib/db/snapshots";
import type { ProjectCurrency } from "@/lib/projectContext";
import { computeCoverageRatioByCurrency, sumContingencyByCurrency } from "@/lib/portfolioContingencyAggregate";
import type { ReportingUnitOption } from "@/lib/portfolio/reportingPreferences";
import {
  contingencyHeldTileCopy,
  coverageRatioRagStatus,
  costExposureTileCopy,
  coverageRatioSemanticClassName,
  coverageRatioTileCopy,
  formatPortfolioCurrency,
  scheduleContingencyHeldDisplayValue,
  scheduleCoverageRatioDisplayValue,
  scheduleCoverageRatioRagStatus,
  scheduleCoverageRatioSemanticClassName,
  scheduleExposureTileCopy,
} from "../../portfolios/[portfolioId]/formatPortfolioCurrency";

export type WorkspaceOverviewPresentation = {
  reportingMonthLabel: string | null;
  projectCount: number;
  /** All readable Workspace Projects (including those omitted from the selected month). */
  workspaceProjectCount: number;
  /** Workspace Projects with no locked snapshot for the selected month — disclosure only. */
  unreportedProjects: WorkspaceUnreportedProject[];
  activeRiskCount: number;
  contingencyPrimaryValue: string;
  costExposurePrimaryValue: string;
  costExposureSubtext: string;
  scheduleExposurePrimaryValue: string;
  scheduleExposureSubtext: string;
  scheduleContingencyHeldPrimaryValue: string;
  scheduleCoverageRatioPrimaryValue: string;
  scheduleCoverageRatioPrimaryRagDot?: RagStatus;
  scheduleCoverageRatioSemanticClassName?: string;
  control: PortfolioControlScore;
  coveragePrimaryValue: string;
  coveragePrimaryRagDot?: RagStatus;
  coverageRatioSemanticClassName?: string;
  portfolioRag: RagStatus | null;
  projectTilePayloads: ProjectTilePayload[];
  portfolioReportingFooter: PortfolioReportingFooterRow | null;
  activeRiskSummaryRows: PortfolioProjectRiskSeverityRow[];
  activeRiskStatusSummaryRows: PortfolioProjectRiskStatusRow[];
  coverageRatioRows: PortfolioProjectCoverageRow[];
  topCostRiskRows: PortfolioTopRiskRow[];
  topScheduleRiskRows: PortfolioTopRiskRow[];
  topCostOpportunityRows: PortfolioTopRiskRow[];
  topScheduleOpportunityRows: PortfolioTopRiskRow[];
  projectCostExposureSlices: PortfolioProjectCostExposureSlice[];
  projectScheduleExposureSlices: PortfolioProjectScheduleExposureSlice[];
  scheduleCoverageRows: PortfolioProjectScheduleCoverageRow[];
  riskCategoryCounts: PortfolioRiskCategoryCount[];
  riskStatusCounts: PortfolioRiskStatusCount[];
  riskOwnerCounts: PortfolioRiskOwnerCount[];
  reportingVsPriorMonthTrends: PortfolioOverviewReportingTrendSet | null;
};

/**
 * Loads Overview KPIs/tiles from an explicit Workspace Project list (Steps 1–2 APIs).
 * Does not query Projects by `portfolio_id`.
 */
export async function loadWorkspaceOverviewPresentation(
  supabase: SupabaseClient,
  projects: OverviewLoaderProjectWithCreatedAt[],
  reportingUnit: ReportingUnitOption,
  reportingMonthYear: string | null
): Promise<WorkspaceOverviewPresentation> {
  const projectIds = projects.map((p) => p.id);
  const workspaceProjectCount = projects.length;

  const { projectTilePayloads, portfolioReportingFooter } = await loadProjectTilePayloads(
    supabase,
    projects,
    { reportingMonthYear }
  );
  const portfolioControlScore = await loadPortfolioControlScore({
    supabase,
    projectIds,
    reportingMonth: reportingMonthYear,
  });
  const dashboardProjectCount = projectTilePayloads.length;
  const unreportedProjects =
    reportingMonthYear != null
      ? workspaceProjectsOmittedFromReportingMonth(
          projects,
          projectTilePayloads.map((tile) => tile.id)
        )
      : [];
  const portfolioRag = aggregatePortfolioRag(projectTilePayloads);

  const reportingMonthScopedIds =
    reportingMonthYear != null ? projectTilePayloads.map((t) => t.id) : null;
  const settingsProjectIds = reportingMonthScopedIds != null ? reportingMonthScopedIds : projectIds;

  let contingencyByCurrency = new Map<ProjectCurrency, number>();
  if (settingsProjectIds.length > 0) {
    const { data: settingsRows } = await supabase
      .from("visualify_project_settings")
      .select("contingency_value_input, financial_unit, currency, financial_inputs_version")
      .in("project_id", settingsProjectIds);
    contingencyByCurrency = sumContingencyByCurrency(settingsRows ?? []);
  }

  const contingencyTableRowsFull = await loadProjectContingencyTable(supabase, projects);
  const contingencyTableRows =
    reportingMonthScopedIds != null
      ? contingencyTableRowsFull.filter((row) => reportingMonthScopedIds.includes(row.projectId))
      : contingencyTableRowsFull;

  const totalScheduleContingencyWorkingDays = contingencyTableRows.reduce(
    (sum, row) => sum + (row.scheduleContingencyWorkingDays ?? 0),
    0
  );
  const reportingMonthKpiCopy =
    reportingMonthYear != null
      ? {
          contingency: {
            heldBaseSubtext: "Contingency held for in-scope projects (selected month)",
            emptyNoProjectsSubtext:
              "No projects with a locked reporting run for the selected month",
          },
          cost: {
            noProjectsSubtext:
              "No projects with a locked reporting run for the selected month",
          },
          schedule: {
            exposureBasisSubtext:
              "Expected schedule exposure across projects with a lock for the selected reporting month",
          },
        }
      : null;

  const contingencyTile = contingencyHeldTileCopy(
    contingencyByCurrency,
    reportingMonthYear != null ? dashboardProjectCount : workspaceProjectCount,
    totalScheduleContingencyWorkingDays,
    reportingUnit,
    reportingMonthKpiCopy?.contingency
  );
  const {
    activeRiskCount,
    activeRiskSummaryRows,
    activeRiskStatusSummaryRows,
    costRows: topCostRiskRows,
    scheduleRows: topScheduleRiskRows,
    costOpportunityRows: topCostOpportunityRows,
    scheduleOpportunityRows: topScheduleOpportunityRows,
    projectCostExposureSlices,
    projectScheduleExposureSlices,
    riskCategoryCounts,
    riskStatusCounts,
    riskOwnerCounts,
    needsAttentionHealthRun,
  } = await loadTopRiskConcentrationRows(
    supabase,
    projects,
    reportingUnit,
    reportingMonthYear != null
      ? {
          reportingMonthYear,
          restrictProjectIds: reportingMonthScopedIds ?? [],
        }
      : undefined
  );

  const exposureByCurrency = new Map<ProjectCurrency, number>();
  for (const slice of projectCostExposureSlices) {
    exposureByCurrency.set(slice.currency, (exposureByCurrency.get(slice.currency) ?? 0) + slice.value / 1_000_000);
  }
  const coverageRatioByCurrency = computeCoverageRatioByCurrency(contingencyByCurrency, exposureByCurrency);
  const scheduleTotalDays = projectScheduleExposureSlices.reduce((sum, s) => sum + s.valueDays, 0);
  const scheduleCoverageRatio =
    scheduleTotalDays > 0 && Number.isFinite(totalScheduleContingencyWorkingDays)
      ? totalScheduleContingencyWorkingDays / scheduleTotalDays
      : null;
  const coverageTile = coverageRatioTileCopy(coverageRatioByCurrency, scheduleCoverageRatio);
  const projectCountForExposureTiles =
    reportingMonthYear != null ? dashboardProjectCount : workspaceProjectCount;
  const costExposureTile = costExposureTileCopy(
    exposureByCurrency,
    projectCountForExposureTiles,
    reportingUnit,
    reportingMonthKpiCopy?.cost
  );
  const scheduleExposureTile = scheduleExposureTileCopy(
    scheduleTotalDays,
    totalScheduleContingencyWorkingDays,
    scheduleCoverageRatio,
    reportingMonthKpiCopy?.schedule
  );
  const reportingMonthLabel =
    reportingMonthYear != null ? formatReportMonthLabel(`${reportingMonthYear}-01`) : null;

  let reportingVsPriorMonthTrends: PortfolioOverviewReportingTrendSet | null = null;
  if (reportingMonthYear != null && projectTilePayloads.length > 0) {
    const priorYm = addReportingMonthYearKey(reportingMonthYear, -1);
    if (priorYm != null) {
      const priorPayloadsResult = await loadProjectTilePayloads(supabase, projects, {
        reportingMonthYear: priorYm,
      });
      if (priorPayloadsResult.projectTilePayloads.length > 0) {
        const priorScopedIds = priorPayloadsResult.projectTilePayloads.map((t) => t.id);
        const priorConcentration = await loadTopRiskConcentrationRows(
          supabase,
          projects,
          reportingUnit,
          {
            reportingMonthYear: priorYm,
            restrictProjectIds: priorScopedIds,
          }
        );
        const priorExposureByCurrency = new Map<ProjectCurrency, number>();
        for (const slice of priorConcentration.projectCostExposureSlices) {
          priorExposureByCurrency.set(
            slice.currency,
            (priorExposureByCurrency.get(slice.currency) ?? 0) + slice.value / 1_000_000
          );
        }
        let priorContingencyByCurrency = new Map<ProjectCurrency, number>();
        if (priorScopedIds.length > 0) {
          const { data: priorSettingsRows } = await supabase
            .from("visualify_project_settings")
            .select("contingency_value_input, financial_unit, currency, financial_inputs_version")
            .in("project_id", priorScopedIds);
          priorContingencyByCurrency = sumContingencyByCurrency(priorSettingsRows ?? []);
        }
        const priorScheduleTotalDays = priorConcentration.projectScheduleExposureSlices.reduce(
          (sum, s) => sum + s.valueDays,
          0
        );
        const priorContingencyTableRows = contingencyTableRowsFull.filter((row) =>
          priorScopedIds.includes(row.projectId)
        );
        const priorTotalScheduleContingencyWorkingDays = priorContingencyTableRows.reduce(
          (sum, row) => sum + (row.scheduleContingencyWorkingDays ?? 0),
          0
        );
        const priorScheduleCoverageRatio =
          priorScheduleTotalDays > 0 && Number.isFinite(priorTotalScheduleContingencyWorkingDays)
            ? priorTotalScheduleContingencyWorkingDays / priorScheduleTotalDays
            : null;
        reportingVsPriorMonthTrends = computePortfolioOverviewReportingTrends(
          {
            projectTilePayloads,
            portfolioReportingFooter,
            activeRiskCount,
            needsAttentionHealthRun,
            exposureByCurrency,
            contingencyByCurrency,
            scheduleExposureTotalDays: scheduleTotalDays,
            scheduleContingencyTotalWorkingDays: totalScheduleContingencyWorkingDays,
            scheduleCoverageRatio,
          },
          {
            projectTilePayloads: priorPayloadsResult.projectTilePayloads,
            portfolioReportingFooter: priorPayloadsResult.portfolioReportingFooter,
            activeRiskCount: priorConcentration.activeRiskCount,
            needsAttentionHealthRun: priorConcentration.needsAttentionHealthRun,
            exposureByCurrency: priorExposureByCurrency,
            contingencyByCurrency: priorContingencyByCurrency,
            scheduleExposureTotalDays: priorScheduleTotalDays,
            scheduleContingencyTotalWorkingDays: priorTotalScheduleContingencyWorkingDays,
            scheduleCoverageRatio: priorScheduleCoverageRatio,
          },
          { formatGapMoneyDelta: (absDollars) => formatPortfolioCurrency(absDollars) }
        );
      }
    }
  }

  const exposureAbsByProjectId = new Map(projectCostExposureSlices.map((s) => [s.projectId, s.value]));
  const coverageRatioRows: PortfolioProjectCoverageRow[] = contingencyTableRows.map((row) => {
    const exposureAmountAbs = exposureAbsByProjectId.get(row.projectId) ?? 0;
    const ratio =
      exposureAmountAbs > 0 && Number.isFinite(row.contingencyAmountAbs)
        ? row.contingencyAmountAbs / exposureAmountAbs
        : null;
    return {
      projectId: row.projectId,
      projectName: row.projectName,
      contingencyAmountAbs: row.contingencyAmountAbs,
      exposureAmountAbs,
      currency: row.currency,
      ratio,
    };
  });

  const scheduleDelayWorkingDaysByProjectId = new Map(
    projectScheduleExposureSlices.map((s) => [s.projectId, s.valueDays])
  );
  const scheduleCoverageRows: PortfolioProjectScheduleCoverageRow[] = contingencyTableRows.map((row) => {
    const expectedDelayWorkingDays = scheduleDelayWorkingDaysByProjectId.get(row.projectId) ?? 0;
    const scheduleContingencyWorkingDays = row.scheduleContingencyWorkingDays;
    const coverageRatio =
      expectedDelayWorkingDays > 0 &&
      scheduleContingencyWorkingDays != null &&
      Number.isFinite(scheduleContingencyWorkingDays)
        ? scheduleContingencyWorkingDays / expectedDelayWorkingDays
        : null;
    return {
      projectId: row.projectId,
      projectName: row.projectName,
      expectedDelayWorkingDays,
      scheduleContingencyWorkingDays,
      coverageRatio,
    };
  });

  return {
    reportingMonthLabel,
    projectCount: dashboardProjectCount,
    workspaceProjectCount,
    unreportedProjects,
    activeRiskCount,
    contingencyPrimaryValue: contingencyTile.primaryValue,
    costExposurePrimaryValue: costExposureTile.primaryValue,
    costExposureSubtext: costExposureTile.subtext,
    scheduleExposurePrimaryValue: scheduleExposureTile.primaryValue,
    scheduleExposureSubtext: scheduleExposureTile.subtext,
    scheduleContingencyHeldPrimaryValue: scheduleContingencyHeldDisplayValue(totalScheduleContingencyWorkingDays),
    scheduleCoverageRatioPrimaryValue: scheduleCoverageRatioDisplayValue(scheduleCoverageRatio),
    scheduleCoverageRatioPrimaryRagDot: scheduleCoverageRatioRagStatus(scheduleCoverageRatio),
    scheduleCoverageRatioSemanticClassName: scheduleCoverageRatioSemanticClassName(scheduleCoverageRatio),
    control: portfolioControlScore,
    coveragePrimaryValue: coverageTile.primaryValue,
    coveragePrimaryRagDot: coverageRatioRagStatus(coverageRatioByCurrency),
    coverageRatioSemanticClassName: coverageRatioSemanticClassName(coverageRatioByCurrency),
    portfolioRag,
    projectTilePayloads,
    portfolioReportingFooter,
    activeRiskSummaryRows,
    activeRiskStatusSummaryRows,
    coverageRatioRows,
    topCostRiskRows,
    topScheduleRiskRows,
    topCostOpportunityRows,
    topScheduleOpportunityRows,
    projectCostExposureSlices,
    projectScheduleExposureSlices,
    scheduleCoverageRows,
    riskCategoryCounts,
    riskStatusCounts,
    riskOwnerCounts,
    reportingVsPriorMonthTrends,
  };
}
