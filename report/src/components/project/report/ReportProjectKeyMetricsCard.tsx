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
  "flex min-w-0 flex-col gap-0.5";

const KEY_METRICS_DATA_POINT_LABEL_CLASS =
  "m-0 text-[length:var(--ds-text-xs)] font-medium leading-snug text-[var(--ds-text-muted)]";

const KEY_METRICS_DATA_POINT_VALUE_CLASS =
  "m-0 text-[length:var(--ds-text-lg)] font-semibold tabular-nums leading-tight text-[var(--ds-text-primary)] sm:text-[length:var(--ds-text-xl)]";

const KEY_METRICS_CALLOUT_CLASS =
  "pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-3 py-2 text-left text-[length:var(--ds-text-xs)] font-normal normal-case tracking-normal text-[var(--ds-text-secondary)] shadow-[var(--ds-shadow-sm)] group-hover:block group-focus-within:block";

type KeyMetricCallout = {
  title: string;
  body: string;
};

function KeyMetricDataPoint({
  label,
  value,
  callout,
  calloutId,
}: {
  label: string;
  value: ReactNode;
  callout?: KeyMetricCallout;
  calloutId?: string;
}) {
  const calloutText = callout ? `${callout.title}\n\n${callout.body}` : undefined;

  return (
    <div
      className={[
        KEY_METRICS_DATA_POINT_CLASS,
        callout ? "group relative cursor-help pointer-events-auto" : "",
      ].join(" ")}
      tabIndex={callout ? 0 : undefined}
      title={calloutText}
      aria-describedby={callout ? calloutId : undefined}
    >
      <dt className={KEY_METRICS_DATA_POINT_LABEL_CLASS}>{label}</dt>
      <dd className={KEY_METRICS_DATA_POINT_VALUE_CLASS}>{value}</dd>
      {callout && calloutId ? (
        <div id={calloutId} role="tooltip" className={KEY_METRICS_CALLOUT_CLASS}>
          <p className="m-0 font-semibold text-[var(--ds-text-primary)]">{callout.title}</p>
          <p className="m-0 mt-1 leading-snug">{callout.body}</p>
        </div>
      ) : null}
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
      <div className="grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {rows.map((row) => (
          <ReportProjectCostMetricCard
            key={row.label}
            label={row.label}
            value={row.value}
            helperText={row.callout?.body}
          />
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
        <dl className="m-0 grid min-w-0 shrink-0 grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4">
          {rows.map((row) => (
            <KeyMetricDataPoint
              key={row.label}
              label={row.label}
              value={row.value}
              callout={row.callout}
              calloutId={
                row.callout ? `project-metrics-${row.label.toLowerCase().replace(/\s+/g, "-")}-callout` : undefined
              }
            />
          ))}
        </dl>
        <div className="min-h-0 flex-1" aria-hidden="true" />
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
