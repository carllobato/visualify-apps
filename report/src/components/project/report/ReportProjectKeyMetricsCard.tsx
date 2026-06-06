import { Card, CardContent } from "@visualify/design-system";
import {
  toReportProjectKeyMetricRows,
  type ReportProjectKeyMetrics,
} from "@/lib/projects/report-project-key-metrics";

type ReportProjectKeyMetricsCardProps = {
  metrics: ReportProjectKeyMetrics;
};

export function ReportProjectKeyMetricsCard({ metrics }: ReportProjectKeyMetricsCardProps) {
  const rows = toReportProjectKeyMetricRows(metrics);

  return (
    <Card className="flex h-full w-full shrink-0 flex-col sm:w-auto sm:min-w-[17rem] sm:max-w-xs">
      <CardContent className="flex flex-1 flex-col px-4 py-3">
        <p className="m-0 mb-2 shrink-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Key metrics
        </p>
        <dl className="m-0 flex min-h-0 flex-1 flex-col divide-y divide-[var(--ds-border-subtle)]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex min-h-0 flex-1 items-center justify-between gap-4 text-[length:var(--ds-text-sm)]"
            >
              <dt className="m-0 text-[var(--ds-text-secondary)]">{row.label}</dt>
              <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
