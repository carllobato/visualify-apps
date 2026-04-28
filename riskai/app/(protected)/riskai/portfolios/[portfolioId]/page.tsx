import {
  aggregatePortfolioRag,
  loadPortfolioControlScore,
  loadPortfolioProjectContingencyTable,
  loadPortfolioProjectTilePayloads,
  loadPortfolioTopRiskConcentrationRows,
  type PortfolioProjectCoverageRow,
  type PortfolioProjectScheduleCoverageRow,
} from "@/lib/dashboard/projectTileServerData";
import {
  PORTFOLIO_REPORTING_MONTH_QUERY_PARAM,
  addReportingMonthYearKey,
  isValidReportingMonthYearKey,
} from "@/lib/reportingMonthSelection";
import {
  computePortfolioOverviewReportingTrends,
  type PortfolioOverviewReportingTrendSet,
} from "@/lib/dashboard/portfolioOverviewReportingTrends";
import { fetchLatestReportingMonthYearKeyForScope } from "@/lib/db/fetchLatestReportingMonthYearKeyForScope";
import { formatReportMonthLabel } from "@/lib/db/snapshots";
import { supabaseServerClient } from "@/lib/supabase/server";
import type { ProjectCurrency } from "@/lib/projectContext";
import { computeCoverageRatioByCurrency, sumContingencyByCurrency } from "@/lib/portfolioContingencyAggregate";
import { asReportingUnit } from "@/lib/portfolio/reportingPreferences";
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
} from "./formatPortfolioCurrency";
import { PortfolioOverviewContent } from "./PortfolioOverviewContent";

type PortfolioOverviewSearchParams = Record<string, string | string[] | undefined>;

function reportingMonthYearKeyFromSearchParams(
  sp: PortfolioOverviewSearchParams
): string | null {
  const raw = sp[PORTFOLIO_REPORTING_MONTH_QUERY_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !isValidReportingMonthYearKey(trimmed)) return null;
  return trimmed;
}

export default async function PortfolioOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ portfolioId: string }>;
  searchParams: Promise<PortfolioOverviewSearchParams>;
}) {
  const { portfolioId } = await params;
  const sp = await searchParams;
  const reportingMonthYearFromUrl = reportingMonthYearKeyFromSearchParams(sp);

  const supabase = await supabaseServerClient();

  const defaultReportingMonthYear = await fetchLatestReportingMonthYearKeyForScope(supabase, {
    portfolioId,
  });
  const reportingMonthYear =
    reportingMonthYearFromUrl ?? defaultReportingMonthYear ?? null;

  const { data: portfolioRow } = await supabase
    .from("visualify_portfolios")
    .select("reporting_unit")
    .eq("id", portfolioId)
    .maybeSingle();
  const reportingUnit = asReportingUnit(portfolioRow?.reporting_unit);

  const { count: portfolioProjectCount } = await supabase
    .from("visualify_projects")
    .select("id", { count: "exact", head: true })
    .eq("portfolio_id", portfolioId);

  const { data: projectRows } = await supabase
    .from("visualify_projects")
    .select("id")
    .eq("portfolio_id", portfolioId);

  const projectIds = (projectRows ?? []).map((p) => p.id as string);

  const { projectTilePayloads, portfolioReportingFooter } = await loadPortfolioProjectTilePayloads(
    supabase,
    portfolioId,
    { reportingMonthYear }
  );
  const portfolioControlScore = await loadPortfolioControlScore({
    supabase,
    projectIds,
    reportingMonth: reportingMonthYear,
  });
  /** Shown on the Projects KPI — matches tiles (excludes projects with no locked reporting snapshot). */
  const dashboardProjectCount = projectTilePayloads.length;
  const portfolioRag = aggregatePortfolioRag(projectTilePayloads);

  const reportingMonthScopedIds =
    reportingMonthYear != null ? projectTilePayloads.map((t) => t.id) : null;
  /** When a month is selected, only those projects’ settings (may be empty). Else full portfolio. */
  const settingsProjectIds = reportingMonthScopedIds != null ? reportingMonthScopedIds : projectIds;

  let contingencyByCurrency = new Map<ProjectCurrency, number>();
  if (settingsProjectIds.length > 0) {
    const { data: settingsRows } = await supabase
      .from("visualify_project_settings")
      .select("contingency_value_input, financial_unit, currency, financial_inputs_version")
      .in("project_id", settingsProjectIds);
    contingencyByCurrency = sumContingencyByCurrency(settingsRows ?? []);
  }

  const contingencyTableRowsFull = await loadPortfolioProjectContingencyTable(supabase, portfolioId);
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
    reportingMonthYear != null ? dashboardProjectCount : portfolioProjectCount ?? 0,
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
  } = await loadPortfolioTopRiskConcentrationRows(
    supabase,
    portfolioId,
    reportingUnit,
    reportingMonthYear != null
      ? {
          reportingMonthYear,
          restrictProjectIds: reportingMonthScopedIds ?? [],
        }
      : undefined
  );

  // Aggregate per-project cost exposure slices into a per-currency total in millions.
  // slice.value is in absolute dollars (from the forward exposure engine); contingencyByCurrency
  // is in millions — both must be in the same unit before dividing.
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
    reportingMonthYear != null ? dashboardProjectCount : portfolioProjectCount ?? 0;
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
      const priorPayloadsResult = await loadPortfolioProjectTilePayloads(supabase, portfolioId, {
        reportingMonthYear: priorYm,
      });
      if (priorPayloadsResult.projectTilePayloads.length > 0) {
        const priorScopedIds = priorPayloadsResult.projectTilePayloads.map((t) => t.id);
        const priorConcentration = await loadPortfolioTopRiskConcentrationRows(
          supabase,
          portfolioId,
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

  // Per-project coverage table: join scoped contingency rows with exposure slices (projects with cost risks).
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

  return (
    <>
      <PortfolioOverviewContent
        portfolioId={portfolioId}
        reportingUnit={reportingUnit}
        reportingMonthLabel={reportingMonthLabel}
        projectCount={dashboardProjectCount}
        activeRiskCount={activeRiskCount}
        contingencyPrimaryValue={contingencyTile.primaryValue}
        costExposurePrimaryValue={costExposureTile.primaryValue}
        costExposureSubtext={costExposureTile.subtext}
        scheduleExposurePrimaryValue={scheduleExposureTile.primaryValue}
        scheduleExposureSubtext={scheduleExposureTile.subtext}
        scheduleContingencyHeldPrimaryValue={scheduleContingencyHeldDisplayValue(totalScheduleContingencyWorkingDays)}
        scheduleCoverageRatioPrimaryValue={scheduleCoverageRatioDisplayValue(scheduleCoverageRatio)}
        scheduleCoverageRatioPrimaryRagDot={scheduleCoverageRatioRagStatus(scheduleCoverageRatio)}
        scheduleCoverageRatioSemanticClassName={scheduleCoverageRatioSemanticClassName(scheduleCoverageRatio)}
        control={portfolioControlScore}
        portfolioRag={portfolioRag}
        coveragePrimaryValue={coverageTile.primaryValue}
        coveragePrimaryRagDot={coverageRatioRagStatus(coverageRatioByCurrency)}
        coverageRatioSemanticClassName={coverageRatioSemanticClassName(coverageRatioByCurrency)}
        projectTilePayloads={projectTilePayloads}
        portfolioReportingFooter={portfolioReportingFooter}
        activeRiskSummaryRows={activeRiskSummaryRows}
        activeRiskStatusSummaryRows={activeRiskStatusSummaryRows}
        coverageRatioRows={coverageRatioRows}
        topCostRiskRows={topCostRiskRows}
        topScheduleRiskRows={topScheduleRiskRows}
        topCostOpportunityRows={topCostOpportunityRows}
        topScheduleOpportunityRows={topScheduleOpportunityRows}
        projectCostExposureSlices={projectCostExposureSlices}
        projectScheduleExposureSlices={projectScheduleExposureSlices}
        scheduleCoverageRows={scheduleCoverageRows}
        riskCategoryCounts={riskCategoryCounts}
        riskStatusCounts={riskStatusCounts}
        riskOwnerCounts={riskOwnerCounts}
        reportingVsPriorMonthTrends={reportingVsPriorMonthTrends}
      />
    </>
  );
}
