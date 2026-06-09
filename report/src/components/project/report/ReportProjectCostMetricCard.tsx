import { Card, CardContent, Trend } from "@visualify/design-system";
import { getReportOverviewCardClassName } from "@/lib/projects/report-project-overview-link";
import type { ReportCostMetricLinkId } from "@/lib/projects/report-project-cost-links";
import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

const COST_METRIC_LABEL_CLASS =
  "m-0 shrink-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]";

const COST_METRIC_VALUE_ROW_CLASS =
  "flex min-h-14 flex-1 items-center justify-center gap-2 pt-2 pb-2 text-2xl";

type ReportProjectCostMetricCardProps = {
  label: string;
  value: string;
  helperText?: string;
  trend?: ReportProjectTrend;
  metricLinkId?: ReportCostMetricLinkId;
  onMetricHover?: (linkId: ReportCostMetricLinkId) => void;
  onMetricLeave?: () => void;
};

export function ReportProjectCostMetricCard({
  label,
  value,
  helperText,
  trend,
  metricLinkId,
  onMetricHover,
  onMetricLeave,
}: ReportProjectCostMetricCardProps) {
  const trendText = trend?.text.trim() ?? "";

  return (
    <Card
      className={getReportOverviewCardClassName(false, "h-full w-full min-w-0", true)}
      onMouseEnter={metricLinkId ? () => onMetricHover?.(metricLinkId) : undefined}
      onMouseLeave={metricLinkId ? () => onMetricLeave?.() : undefined}
    >
      <CardContent className="flex h-full flex-1 flex-col px-3 py-3 sm:px-5 sm:py-4">
        <p className={COST_METRIC_LABEL_CLASS}>{label}</p>
        <div className={COST_METRIC_VALUE_ROW_CLASS}>
          <p className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">{value}</p>
          {trend ? (
            <Trend sentiment={trend.sentiment} className="shrink-0 opacity-70">
              {trendText || undefined}
            </Trend>
          ) : null}
        </div>
        {helperText ? (
          <p className="m-0 shrink-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            {helperText}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
