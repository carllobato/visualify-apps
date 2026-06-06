import type { ReactNode } from "react";
import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import {
  toReportProjectKeyMetricRows,
  type ReportProjectKeyMetrics,
} from "@/lib/projects/report-project-key-metrics";

type ReportProjectKeyMetricsCardProps = {
  metrics: ReportProjectKeyMetrics;
  highlighted?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const KEY_METRICS_ROW_CLASS =
  "flex min-h-10 shrink-0 items-center justify-between gap-4 text-[length:var(--ds-text-sm)]";

const KEY_METRICS_CALLOUT_CLASS =
  "pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-64 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-3 py-2 text-left text-[length:var(--ds-text-xs)] font-normal normal-case tracking-normal text-[var(--ds-text-secondary)] shadow-[var(--ds-shadow-sm)] group-hover:block group-focus-within:block";

type KeyMetricCallout = {
  title: string;
  body: string;
};

function KeyMetricRow({
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
        KEY_METRICS_ROW_CLASS,
        callout ? "group relative cursor-help pointer-events-auto" : "",
      ].join(" ")}
      tabIndex={callout ? 0 : undefined}
      title={calloutText}
      aria-describedby={callout ? calloutId : undefined}
    >
      <span className="text-[var(--ds-text-secondary)]">{label}</span>
      {value}
      {callout && calloutId ? (
        <div id={calloutId} role="tooltip" className={KEY_METRICS_CALLOUT_CLASS}>
          <p className="m-0 font-semibold text-[var(--ds-text-primary)]">{callout.title}</p>
          <p className="m-0 mt-1 leading-snug">{callout.body}</p>
        </div>
      ) : null}
    </div>
  );
}

export function ReportProjectKeyMetricsCard({
  metrics,
  highlighted = false,
  onNavigate,
  navigateLabel,
}: ReportProjectKeyMetricsCardProps) {
  const rows = toReportProjectKeyMetricRows(metrics);
  const spacerRowCount = Math.max(0, 5 - rows.length);

  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
      cardClassName="overflow-visible"
      contentClassName="flex flex-1 flex-col overflow-visible px-4 py-3"
    >
      <ReportProjectOverviewCardHeader title="Project overview" />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-col divide-y divide-[var(--ds-border-subtle)]">
          {rows.map((row) => (
            <KeyMetricRow
              key={row.label}
              label={row.label}
              value={
                <span className="font-semibold tabular-nums text-[var(--ds-text-primary)]">
                  {row.value}
                </span>
              }
              callout={row.callout}
              calloutId={
                row.callout ? `project-metrics-${row.label.toLowerCase().replace(/\s+/g, "-")}-callout` : undefined
              }
            />
          ))}
          {Array.from({ length: spacerRowCount }, (_, index) => (
            <div key={`spacer-${index}`} className="min-h-10 shrink-0" aria-hidden="true" />
          ))}
        </div>
        <div className="min-h-0 flex-1" aria-hidden="true" />
      </div>
    </ReportProjectOverviewInteractiveCard>
  );
}
