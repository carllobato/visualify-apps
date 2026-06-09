import { Card, CardContent, MultiLineChartPrimitive } from "@visualify/design-system";
import { REPORT_PROJECT_COST_SECTION_TITLE_CLASS } from "@/components/project/report/report-project-cost-section-title";
import { getReportOverviewCardClassName } from "@/lib/projects/report-project-overview-link";
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
  highlighted?: boolean;
};

export function ReportProjectCashflowChartCard({
  data,
  summary,
  highlighted = false,
}: ReportProjectCashflowChartCardProps) {
  const currencySymbol = summary?.currencySymbol ?? "$";
  const todayIndex = getReportCashflowTodayIndex(data);
  const hasCashflowData = data.some((series) => series.data.length > 0);

  return (
    <Card className={getReportOverviewCardClassName(highlighted, "h-full w-full min-w-0", true)}>
      <CardContent className="flex h-full min-h-0 flex-col p-0">
        <p className={REPORT_PROJECT_COST_SECTION_TITLE_CLASS}>Cashflow</p>
        <div className="flex min-h-0 flex-1 flex-col">
          {hasCashflowData ? (
            <MultiLineChartPrimitive
              series={data}
              status="neutral"
              domainMax={REPORT_PROJECT_CASHFLOW_AXIS_MAX}
              yAxisStep={50_000_000}
              formatYLabel={(value) => formatReportCashflowAxisLabel(value, currencySymbol)}
              showAllXLabels
              todayIndex={todayIndex >= 0 ? todayIndex : undefined}
              forecastDasharray="4 4"
              embedded
              embeddedContentClassName="pb-3 pl-0 pr-0"
            />
          ) : (
            <p className="m-0 px-4 py-6 text-center text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
              No cashflow data for this reporting period.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
