import { ReportProjectCashflowChartCard } from "@/components/project/report/ReportProjectCashflowChartCard";
import { ReportProjectCostMetricCard } from "@/components/project/report/ReportProjectCostMetricCard";
import {
  formatReportCostAmount,
  formatReportForecastVariancePercent,
  formatReportNormalisedBudgetPerMw,
  getReportForecastVariancePercent,
  getReportSpentToDatePercent,
  type ReportProjectCostData,
} from "@/lib/projects/report-project-cost";

type ReportProjectCostTabContentProps = {
  cost: ReportProjectCostData;
};

export function ReportProjectCostTabContent({ cost }: ReportProjectCostTabContentProps) {
  const { summary, cashflow } = cost;
  const currencySymbol = summary.currencySymbol ?? "$";
  const forecastVariancePercent = getReportForecastVariancePercent(summary);
  const spentToDatePercent = getReportSpentToDatePercent(summary);

  return (
    <div className="flex min-w-0 w-full flex-col gap-3">
      <div className="grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportProjectCostMetricCard
          label="Current budget"
          value={formatReportCostAmount(summary.currentBudget, currencySymbol)}
        />
        <ReportProjectCostMetricCard
          label="Normalised budget"
          value={formatReportCostAmount(summary.normalisedBudget, currencySymbol)}
          helperText={formatReportNormalisedBudgetPerMw(summary)}
        />
        <ReportProjectCostMetricCard
          label="Forecast final account"
          value={formatReportCostAmount(summary.forecastFinalAccount, currencySymbol)}
          helperText={formatReportForecastVariancePercent(forecastVariancePercent)}
        />
        <ReportProjectCostMetricCard
          label="Spent to date"
          value={formatReportCostAmount(summary.spentToDate, currencySymbol)}
          helperText={`${Math.round(spentToDatePercent)}% of budget`}
        />
      </div>
      <ReportProjectCashflowChartCard data={cashflow} summary={summary} />
    </div>
  );
}
