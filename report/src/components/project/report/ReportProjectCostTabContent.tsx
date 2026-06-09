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
  formatReportCostSummaryTotalAmount,
  getReportProjectCostNormalisedForecast,
  getReportProjectCostWbsSummaryTotals,
} from "@/lib/projects/report-project-cost-summary";

type ReportProjectCostTabContentProps = {
  cost: ReportProjectCostData;
};

export function ReportProjectCostTabContent({ cost }: ReportProjectCostTabContentProps) {
  const { summary, costSummary, cashflow } = cost;
  const currencySymbol = summary.currencySymbol ?? "$";
  const wbsTotals = getReportProjectCostWbsSummaryTotals(costSummary);
  const normalisedForecast = getReportProjectCostNormalisedForecast(costSummary);
  const lastReport = summary.lastReport;

  return (
    <div className="flex min-w-0 w-full flex-col gap-3">
      <div className="grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <ReportProjectCostStatusMetricCard
          status={getReportCostRagStatus(summary)}
          trend={summary.trend}
        />
        <ReportProjectCostMetricCard
          label="Approved budget"
          value={formatReportCostSummaryTotalAmount(wbsTotals.approvedBudget, currencySymbol)}
          trend={getReportCostMetricTrend(wbsTotals.approvedBudget, lastReport?.approvedBudget)}
        />
        <ReportProjectCostMetricCard
          label="Current forecast"
          value={formatReportCostSummaryTotalAmount(wbsTotals.currentForecast, currencySymbol)}
          trend={getReportCostMetricTrend(wbsTotals.currentForecast, lastReport?.currentForecast)}
        />
        <ReportProjectCostMetricCard
          label="Normalised Forecast"
          value={formatReportCostSummaryTotalAmount(normalisedForecast, currencySymbol)}
          trend={getReportCostMetricTrend(normalisedForecast, lastReport?.normalisedForecast)}
        />
        <ReportProjectCostMetricCard
          label="Spent to date"
          value={formatReportCostSummaryTotalAmount(summary.spentToDate, currencySymbol)}
          trend={getReportCostMetricTrend(summary.spentToDate, lastReport?.spentToDate)}
        />
      </div>
      <ReportProjectCostSummaryTable summary={costSummary} currencySymbol={currencySymbol} />
      <ReportProjectCashflowChartCard data={cashflow} summary={summary} />
    </div>
  );
}
