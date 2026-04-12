import {
  aggregatePortfolioRag,
  loadPortfolioProjectContingencyTable,
  loadPortfolioProjectTilePayloads,
  loadPortfolioTopRiskConcentrationRows,
  type PortfolioProjectCoverageRow,
  type PortfolioProjectScheduleCoverageRow,
} from "@/lib/dashboard/projectTileServerData";
import { supabaseServerClient } from "@/lib/supabase/server";
import type { ProjectCurrency } from "@/lib/projectContext";
import { computeCoverageRatioByCurrency, sumContingencyByCurrency } from "@/lib/portfolioContingencyAggregate";
import {
  contingencyHeldTileCopy,
  costExposureTileCopy,
  coverageRatioSemanticClassName,
  coverageRatioTileCopy,
  needsAttentionTileCopy,
  scheduleContingencyHeldDisplayValue,
  scheduleCoverageRatioDisplayValue,
  scheduleCoverageRatioSemanticClassName,
  scheduleExposureTileCopy,
} from "./formatPortfolioCurrency";
import { PortfolioOverviewContent } from "./PortfolioOverviewContent";

export default async function PortfolioOverviewPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;
  const supabase = await supabaseServerClient();

  const { count: projectCount } = await supabase
    .from("visualify_projects")
    .select("id", { count: "exact", head: true })
    .eq("portfolio_id", portfolioId);

  const { data: projectRows } = await supabase
    .from("visualify_projects")
    .select("id")
    .eq("portfolio_id", portfolioId);

  const projectIds = (projectRows ?? []).map((p) => p.id as string);

  let contingencyByCurrency = new Map<ProjectCurrency, number>();
  if (projectIds.length > 0) {
    const { data: settingsRows } = await supabase
      .from("visualify_project_settings")
      .select("contingency_value_input, financial_unit, currency")
      .in("project_id", projectIds);
    contingencyByCurrency = sumContingencyByCurrency(settingsRows ?? []);
  }

  const { projectTilePayloads, portfolioReportingFooter } = await loadPortfolioProjectTilePayloads(
    supabase,
    portfolioId
  );
  const portfolioRag = aggregatePortfolioRag(projectTilePayloads);
  const contingencyTableRows = await loadPortfolioProjectContingencyTable(supabase, portfolioId);

  const totalScheduleContingencyWeeks = contingencyTableRows.reduce(
    (sum, row) => sum + (row.scheduleContingencyWeeks ?? 0),
    0
  );
  const contingencyTile = contingencyHeldTileCopy(
    contingencyByCurrency,
    projectCount ?? 0,
    totalScheduleContingencyWeeks
  );
  const {
    activeRiskCount,
    activeRiskSummaryRows,
    activeRiskStatusSummaryRows,
    costRows: topCostRiskRows,
    scheduleRows: topScheduleRiskRows,
    projectCostExposureSlices,
    projectScheduleExposureSlices,
    riskCategoryCounts,
    riskStatusCounts,
    riskOwnerCounts,
    risksRequiringAttentionRows,
  } = await loadPortfolioTopRiskConcentrationRows(supabase, portfolioId);

  // Aggregate per-project cost exposure slices into a per-currency total in millions.
  // slice.value is in absolute dollars (from the forward exposure engine); contingencyByCurrency
  // is in millions — both must be in the same unit before dividing.
  const exposureByCurrency = new Map<ProjectCurrency, number>();
  for (const slice of projectCostExposureSlices) {
    exposureByCurrency.set(slice.currency, (exposureByCurrency.get(slice.currency) ?? 0) + slice.value / 1_000_000);
  }
  const coverageRatioByCurrency = computeCoverageRatioByCurrency(contingencyByCurrency, exposureByCurrency);
  const scheduleTotalDays = projectScheduleExposureSlices.reduce((sum, s) => sum + s.valueDays, 0);
  const scheduleExposureWeeks = scheduleTotalDays > 0 ? scheduleTotalDays / 7 : 0;
  const scheduleCoverageRatio =
    scheduleExposureWeeks > 0 && Number.isFinite(totalScheduleContingencyWeeks)
      ? totalScheduleContingencyWeeks / scheduleExposureWeeks
      : null;
  const coverageTile = coverageRatioTileCopy(coverageRatioByCurrency, scheduleCoverageRatio);
  const costExposureTile = costExposureTileCopy(exposureByCurrency, projectCount ?? 0);
  const scheduleExposureTile = scheduleExposureTileCopy(
    scheduleTotalDays,
    totalScheduleContingencyWeeks,
    scheduleCoverageRatio
  );
  const needsAttentionTile = needsAttentionTileCopy(risksRequiringAttentionRows.length);

  // Per-project coverage table: join contingency rows (all projects) with exposure slices (projects with cost risks).
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

  const scheduleDelayWeeksByProjectId = new Map(
    projectScheduleExposureSlices.map((s) => [s.projectId, s.valueDays / 7])
  );
  const scheduleCoverageRows: PortfolioProjectScheduleCoverageRow[] = contingencyTableRows.map((row) => {
    const expectedDelayWeeks = scheduleDelayWeeksByProjectId.get(row.projectId) ?? 0;
    const sw = row.scheduleContingencyWeeks;
    const coverageRatio =
      expectedDelayWeeks > 0 && sw != null && Number.isFinite(sw) ? sw / expectedDelayWeeks : null;
    return {
      projectId: row.projectId,
      projectName: row.projectName,
      expectedDelayWeeks,
      scheduleContingencyWeeks: sw,
      coverageRatio,
    };
  });

  return (
    <>
      <PortfolioOverviewContent
        portfolioId={portfolioId}
        projectCount={projectCount ?? 0}
        activeRiskCount={activeRiskCount}
        contingencyPrimaryValue={contingencyTile.primaryValue}
        costExposurePrimaryValue={costExposureTile.primaryValue}
        scheduleExposurePrimaryValue={scheduleExposureTile.primaryValue}
        scheduleExposureSubtext={scheduleExposureTile.subtext}
        scheduleContingencyHeldPrimaryValue={scheduleContingencyHeldDisplayValue(totalScheduleContingencyWeeks)}
        scheduleCoverageRatioPrimaryValue={scheduleCoverageRatioDisplayValue(scheduleCoverageRatio)}
        scheduleCoverageRatioSemanticClassName={scheduleCoverageRatioSemanticClassName(scheduleCoverageRatio)}
        needsAttentionPrimaryValue={needsAttentionTile.primaryValue}
        needsAttentionSubtext={needsAttentionTile.subtext}
        needsAttentionPrimaryValueClassName={needsAttentionTile.primaryValueClassName}
        portfolioRag={portfolioRag}
        coveragePrimaryValue={coverageTile.primaryValue}
        coverageRatioSemanticClassName={coverageRatioSemanticClassName(coverageRatioByCurrency)}
        projectTilePayloads={projectTilePayloads}
        portfolioReportingFooter={portfolioReportingFooter}
        activeRiskSummaryRows={activeRiskSummaryRows}
        activeRiskStatusSummaryRows={activeRiskStatusSummaryRows}
        coverageRatioRows={coverageRatioRows}
        topCostRiskRows={topCostRiskRows}
        topScheduleRiskRows={topScheduleRiskRows}
        projectCostExposureSlices={projectCostExposureSlices}
        projectScheduleExposureSlices={projectScheduleExposureSlices}
        scheduleCoverageRows={scheduleCoverageRows}
        riskCategoryCounts={riskCategoryCounts}
        riskStatusCounts={riskStatusCounts}
        riskOwnerCounts={riskOwnerCounts}
        risksRequiringAttentionRows={risksRequiringAttentionRows}
      />
    </>
  );
}
