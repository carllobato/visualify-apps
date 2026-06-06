import { Card, CardContent, MultiLineChartPrimitive } from "@visualify/design-system";
import {
  formatReportCashflowAxisLabel,
  getReportCashflowTodayIndex,
  REPORT_PROJECT_CASHFLOW_AXIS_MAX,
  type ReportProjectCashflowSeries,
  type ReportProjectCostSummary,
} from "@/lib/projects/report-project-cost";

type ReportProjectCashflowChartCardProps = {
  data: ReportProjectCashflowSeries[];
  summary?: Pick<ReportProjectCostSummary, "currencySymbol">;
};

export function ReportProjectCashflowChartCard({
  data,
  summary,
}: ReportProjectCashflowChartCardProps) {
  const currencySymbol = summary?.currencySymbol ?? "$";
  const todayIndex = getReportCashflowTodayIndex(data);

  return (
    <Card className="h-full w-full min-w-0">
      <CardContent className="flex h-full min-h-0 flex-col p-0">
        <MultiLineChartPrimitive
          title="Cashflow chart"
          series={data}
          status="neutral"
          domainMax={REPORT_PROJECT_CASHFLOW_AXIS_MAX}
          yAxisStep={50_000_000}
          formatYLabel={(value) => formatReportCashflowAxisLabel(value, currencySymbol)}
          showAllXLabels
          todayIndex={todayIndex >= 0 ? todayIndex : undefined}
          forecastDasharray="4 4"
          embedded
        />
      </CardContent>
    </Card>
  );
}
