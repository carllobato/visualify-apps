"use client";

import { Card, CardContent } from "@visualify/design-system";
import type { ReactNode } from "react";
import { ReportProjectCostMetricCard } from "@/components/project/report/ReportProjectCostMetricCard";
import {
  toReportProjectKeyMetricRows,
  type ReportProjectKeyMetrics,
} from "@/lib/projects/report-project-key-metrics";
import {
  REPORT_OVERVIEW_HIGHLIGHT_OUTLINE_CLASS,
  REPORT_OVERVIEW_MOBILE_FLATTEN_CARD_CLASS,
  REPORT_OVERVIEW_TILE_HOVER_ELEVATION_CLASS,
} from "@/lib/projects/report-project-overview-link";

type ReportProjectKeyMetricsCardProps = {
  metrics: ReportProjectKeyMetrics;
  presentation?: "rows" | "kpi";
  highlighted?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const KEY_METRIC_GRID_CLASS =
  "grid min-h-0 w-full max-w-full flex-1 min-w-0 grid-cols-2 grid-rows-2 gap-1.5 p-1.5 sm:gap-2 sm:p-2";

const KEY_METRIC_CELL_CLASS =
  "relative flex min-h-0 min-w-0 flex-col rounded-[var(--ds-radius-md)] px-2 py-2 sm:px-2.5 sm:py-2";

const KEY_METRIC_INTERACTIVE_INSET_CLASS =
  "absolute inset-0 z-0 rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 focus-visible:outline-none";

const KEY_METRIC_CELL_LABEL_CLASS =
  "shrink-0 text-[length:var(--ds-text-xs)] font-medium leading-snug text-[var(--ds-text-muted)]";

const KEY_METRIC_CELL_VALUE_CLASS =
  "font-semibold tabular-nums text-center text-[length:var(--ds-text-base)] leading-tight text-[var(--ds-text-primary)] sm:text-[length:var(--ds-text-lg)]";

function KeyMetricInteractiveButton({
  label,
  onNavigate,
  navigateLabel,
}: {
  label: string;
  onNavigate: () => void;
  navigateLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      aria-label={navigateLabel ?? `View ${label}`}
      className={[KEY_METRIC_INTERACTIVE_INSET_CLASS, "cursor-pointer"].join(" ")}
    />
  );
}

function KeyMetricCell({
  label,
  value,
  onNavigate,
  navigateLabel,
}: {
  label: string;
  value: ReactNode;
  onNavigate?: () => void;
  navigateLabel?: string;
}) {
  const cellClassName = [
    KEY_METRIC_CELL_CLASS,
    onNavigate ? REPORT_OVERVIEW_TILE_HOVER_ELEVATION_CLASS : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cellClassName}>
      {onNavigate ? (
        <KeyMetricInteractiveButton
          label={label}
          onNavigate={onNavigate}
          navigateLabel={navigateLabel}
        />
      ) : null}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col pointer-events-none">
        <span className={KEY_METRIC_CELL_LABEL_CLASS}>{label}</span>
        <div className="flex min-h-9 flex-1 items-center justify-center pt-1 pb-0.5 sm:min-h-10">
          <span className={KEY_METRIC_CELL_VALUE_CLASS}>{value}</span>
        </div>
      </div>
    </div>
  );
}

function KeyMetricsGrid({
  rows,
  onNavigate,
  navigateLabel,
}: {
  rows: ReturnType<typeof toReportProjectKeyMetricRows>;
  onNavigate?: () => void;
  navigateLabel?: string;
}) {
  return (
    <div className={KEY_METRIC_GRID_CLASS}>
      {rows.map((row) => (
        <KeyMetricCell
          key={row.label}
          label={row.label}
          value={row.value}
          onNavigate={onNavigate}
          navigateLabel={navigateLabel}
        />
      ))}
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
      <div className="grid min-w-0 w-full grid-cols-2 gap-3">
        {rows.map((row) => (
          <ReportProjectCostMetricCard key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

function ReportProjectKeyMetricsRows({
  metrics,
  highlighted = false,
  onNavigate,
  navigateLabel,
}: ReportProjectKeyMetricsCardProps) {
  const rows = toReportProjectKeyMetricRows(metrics);

  return (
    <Card
      className={[
        "flex h-full w-full min-w-0 flex-col overflow-hidden",
        REPORT_OVERVIEW_MOBILE_FLATTEN_CARD_CLASS,
        highlighted ? `overflow-visible ${REPORT_OVERVIEW_HIGHLIGHT_OUTLINE_CLASS}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <CardContent className="flex min-w-0 flex-1 flex-col overflow-hidden px-0 py-3 sm:p-0">
        <KeyMetricsGrid rows={rows} onNavigate={onNavigate} navigateLabel={navigateLabel} />
      </CardContent>
    </Card>
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
