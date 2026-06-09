"use client";

import { useState } from "react";
import { ReportProjectCashflowChartCard } from "@/components/project/report/ReportProjectCashflowChartCard";
import { ReportProjectCostMetricCard } from "@/components/project/report/ReportProjectCostMetricCard";
import { ReportProjectCostStatusMetricCard } from "@/components/project/report/ReportProjectCostStatusMetricCard";
import { ReportProjectCostSummaryTable } from "@/components/project/report/ReportProjectCostSummaryTable";
import {
  getReportCostMetricTrend,
  getReportCostRagStatus,
  type ReportProjectCostData,
} from "@/lib/projects/report-project-cost";
import {
  getReportCostMetricHighlightsCashflow,
  getReportCostMetricSummaryColumn,
  getReportCostMetricSummaryRowFilter,
  type ReportCostMetricLinkId,
} from "@/lib/projects/report-project-cost-links";
import type { ReportOverviewModuleLinkId } from "@/lib/projects/report-project-overview-link";
import {
  formatReportCostSummaryTotalAmount,
  getReportProjectCostNormalisedForecast,
  getReportProjectCostWbsSummaryTotals,
} from "@/lib/projects/report-project-cost-summary";

type ReportProjectCostTabContentProps = {
  cost: ReportProjectCostData;
  focusedModule?: ReportOverviewModuleLinkId | null;
};

export function ReportProjectCostTabContent({
  cost,
  focusedModule = null,
}: ReportProjectCostTabContentProps) {
  const [hoveredMetric, setHoveredMetric] = useState<ReportCostMetricLinkId | null>(null);
  const { summary, costSummary, cashflow } = cost;
  const currencySymbol = summary.currencySymbol ?? "$";
  const wbsTotals = getReportProjectCostWbsSummaryTotals(costSummary);
  const normalisedForecast = getReportProjectCostNormalisedForecast(costSummary);
  const lastReport = summary.lastReport;
  const highlightedColumn = hoveredMetric
    ? getReportCostMetricSummaryColumn(hoveredMetric)
    : undefined;
  const highlightedRowFilter = hoveredMetric
    ? getReportCostMetricSummaryRowFilter(hoveredMetric)
    : undefined;
  const highlightedCashflow = hoveredMetric
    ? getReportCostMetricHighlightsCashflow(hoveredMetric)
    : false;

  return (
    <div className="flex min-w-0 w-full flex-col gap-3">
      <div className="grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <ReportProjectCostStatusMetricCard
          status={getReportCostRagStatus(summary)}
          trend={summary.trend}
          highlighted={focusedModule === "cost"}
        />
        <ReportProjectCostMetricCard
          label="Approved budget"
          value={formatReportCostSummaryTotalAmount(wbsTotals.approvedBudget, currencySymbol)}
          trend={getReportCostMetricTrend(wbsTotals.approvedBudget, lastReport?.approvedBudget)}
          metricLinkId="approved-budget"
          onMetricHover={setHoveredMetric}
          onMetricLeave={() => setHoveredMetric(null)}
        />
        <ReportProjectCostMetricCard
          label="Current forecast"
          value={formatReportCostSummaryTotalAmount(wbsTotals.currentForecast, currencySymbol)}
          trend={getReportCostMetricTrend(wbsTotals.currentForecast, lastReport?.currentForecast)}
          metricLinkId="current-forecast"
          onMetricHover={setHoveredMetric}
          onMetricLeave={() => setHoveredMetric(null)}
        />
        <ReportProjectCostMetricCard
          label="Normalised Forecast"
          value={formatReportCostSummaryTotalAmount(normalisedForecast, currencySymbol)}
          trend={getReportCostMetricTrend(normalisedForecast, lastReport?.normalisedForecast)}
          metricLinkId="normalised-forecast"
          onMetricHover={setHoveredMetric}
          onMetricLeave={() => setHoveredMetric(null)}
        />
        <ReportProjectCostMetricCard
          label="Spent to date"
          value={formatReportCostSummaryTotalAmount(summary.spentToDate, currencySymbol)}
          trend={getReportCostMetricTrend(summary.spentToDate, lastReport?.spentToDate)}
          metricLinkId="spent-to-date"
          onMetricHover={setHoveredMetric}
          onMetricLeave={() => setHoveredMetric(null)}
        />
      </div>
      <ReportProjectCostSummaryTable
        summary={costSummary}
        currencySymbol={currencySymbol}
        highlightedColumn={highlightedColumn}
        highlightedRowFilter={highlightedRowFilter}
      />
      <ReportProjectCashflowChartCard
        data={cashflow}
        summary={summary}
        highlighted={highlightedCashflow}
      />
    </div>
  );
}
