import { Card, CardContent, Trend } from "@visualify/design-system";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import { getReportOverviewCardClassName } from "@/lib/projects/report-project-overview-link";
import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

const COST_METRIC_LABEL_CLASS =
  "m-0 shrink-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]";

function costStatusHighlightClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "green") {
    return "bg-[var(--ds-status-success-subtle-bg)]";
  }
  if (normalized === "amber" || normalized === "yellow") {
    return "bg-[var(--ds-status-warning-subtle-bg)]";
  }
  if (normalized === "red") {
    return "bg-[var(--ds-status-danger-subtle-bg)]";
  }
  return "bg-[var(--ds-status-neutral-subtle-bg)]";
}

type ReportProjectCostStatusMetricCardProps = {
  status: string;
  trend?: ReportProjectTrend;
};

export function ReportProjectCostStatusMetricCard({
  status,
  trend,
}: ReportProjectCostStatusMetricCardProps) {
  const trendText = trend?.text.trim() ?? "";

  return (
    <Card
      className={getReportOverviewCardClassName(
        false,
        `h-full w-full min-w-0 ${costStatusHighlightClass(status)}`,
        true,
      )}
    >
      <CardContent className="flex h-full flex-1 flex-col px-3 py-3 sm:px-5 sm:py-4">
        <span className={COST_METRIC_LABEL_CLASS}>Cost Status</span>
        <div className="flex min-h-14 flex-1 items-center justify-center gap-2 pt-2 pb-2 text-2xl">
          <ReportRagStatusDot status={status} showPhrase />
          {trend && trendText ? (
            <Trend sentiment={trend.sentiment} className="shrink-0 opacity-70">
              {trendText}
            </Trend>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
