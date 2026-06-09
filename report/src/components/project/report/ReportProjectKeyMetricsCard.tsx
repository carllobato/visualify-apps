import type { ReactNode } from "react";
import { ReportProjectCostMetricCard } from "@/components/project/report/ReportProjectCostMetricCard";
import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import {
  toReportProjectKeyMetricRows,
  type ReportProjectKeyMetrics,
} from "@/lib/projects/report-project-key-metrics";

type ReportProjectKeyMetricsCardProps = {
  metrics: ReportProjectKeyMetrics;
  presentation?: "rows" | "kpi";
  highlighted?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const KEY_METRICS_DATA_POINT_CLASS =
  "flex min-h-0 min-w-0 flex-col justify-center gap-0.5";

const KEY_METRICS_DATA_POINT_LABEL_CLASS =
  "m-0 text-[length:var(--ds-text-xs)] font-medium leading-snug text-[var(--ds-text-muted)]";

const KEY_METRICS_DATA_POINT_VALUE_CLASS =
  "m-0 text-[length:var(--ds-text-lg)] font-semibold tabular-nums leading-tight text-[var(--ds-text-primary)] sm:text-[length:var(--ds-text-xl)]";

function KeyMetricDataPoint({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={KEY_METRICS_DATA_POINT_CLASS}>
      <dt className={KEY_METRICS_DATA_POINT_LABEL_CLASS}>{label}</dt>
      <dd className={KEY_METRICS_DATA_POINT_VALUE_CLASS}>{value}</dd>
    </div>
  );
}

function ReportProjectKeyMetricsKpiGrid({ metrics }: { metrics: ReportProjectKeyMetrics }) {
  const rows = toReportProjectKeyMetricRows(metrics);

  return (
    <div className="flex min-w-0 w-full flex-col gap-3">
      <p className="m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
        Project overview
      </p>
      <div className="grid min-w-0 w-full grid-cols-2 gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <ReportProjectCostMetricCard key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

function ReportProjectKeyMetricsRows({
  metrics,
  highlighted,
  onNavigate,
  navigateLabel,
}: ReportProjectKeyMetricsCardProps) {
  const rows = toReportProjectKeyMetricRows(metrics);

  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
      cardClassName="overflow-visible"
      contentClassName="flex flex-1 flex-col overflow-visible px-3 py-3 sm:px-4"
    >
      <ReportProjectOverviewCardHeader title="Project overview" />
      <div className="flex min-h-0 flex-1 flex-col pt-1">
        <dl className="m-0 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3 sm:gap-4">
          {rows.map((row) => (
            <KeyMetricDataPoint key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>
      </div>
    </ReportProjectOverviewInteractiveCard>
  );
}

export function ReportProjectKeyMetricsCard({
  metrics,
  presentation = "rows",
  highlighted = false,
  onNavigate,
  navigateLabel,
}: ReportProjectKeyMetricsCardProps) {
  if (presentation === "kpi") {
    return <ReportProjectKeyMetricsKpiGrid metrics={metrics} />;
  }

  return (
    <ReportProjectKeyMetricsRows
      metrics={metrics}
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
    />
  );
}
