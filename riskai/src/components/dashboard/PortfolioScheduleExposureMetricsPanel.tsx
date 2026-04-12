import type { RagStatus } from "@/lib/dashboard/projectTileServerData";

const labelClass =
  "text-[11px] font-medium tracking-[0.04em] text-[var(--ds-text-muted)] m-0 mb-0.5";

function ragDotClass(status: RagStatus): string {
  switch (status) {
    case "green":
      return "bg-[var(--ds-status-success)]";
    case "amber":
      return "bg-[var(--ds-status-warning)]";
    case "red":
      return "bg-[var(--ds-status-danger)]";
    default:
      return "bg-[var(--ds-status-neutral)]";
  }
}

function ragWord(status: RagStatus): string {
  switch (status) {
    case "green":
      return "Green";
    case "amber":
      return "Amber";
    case "red":
      return "Red";
    default:
      return "";
  }
}

export type PortfolioScheduleExposureMetricsPanelProps = {
  scheduleExposurePrimaryValue: string;
  scheduleContingencyHeldPrimaryValue: string;
  scheduleCoverageRatioPrimaryValue: string;
  scheduleCoverageRatioPrimaryRagDot?: RagStatus;
  scheduleCoverageRatioPrimaryValueClassName?: string;
  layout?: "grid" | "stack";
  compact?: boolean;
  className?: string;
};

function MetricBlock({
  label,
  value,
  valueRagDot,
  valueClassName,
}: {
  label: string;
  value: string;
  valueRagDot?: RagStatus;
  valueClassName: string;
}) {
  return (
    <div className="min-w-0 text-left">
      <p className={labelClass}>{label}</p>
      {valueRagDot != null ? (
        <div className="flex min-w-0 items-center gap-2" title={value}>
          <span
            className="inline-flex items-center shrink-0"
            title={`RAG ${ragWord(valueRagDot)}`}
            aria-label={`RAG ${ragWord(valueRagDot)}`}
          >
            <span
              className={`size-[0.6875rem] shrink-0 rounded-full ${ragDotClass(valueRagDot)}`}
              aria-hidden
            />
          </span>
          <p className={`${valueClassName} min-w-0 truncate`} title={value}>
            {value}
          </p>
        </div>
      ) : (
        <p className={`${valueClassName} truncate`} title={value}>
          {value}
        </p>
      )}
    </div>
  );
}

/**
 * Schedule exposure, contingency held, and coverage ratio (schedule reserve vs expected delay).
 */
export function PortfolioScheduleExposureMetricsPanel({
  scheduleExposurePrimaryValue,
  scheduleContingencyHeldPrimaryValue,
  scheduleCoverageRatioPrimaryValue,
  scheduleCoverageRatioPrimaryRagDot,
  scheduleCoverageRatioPrimaryValueClassName,
  layout = "grid",
  compact = false,
  className = "",
}: PortfolioScheduleExposureMetricsPanelProps) {
  const valueClass = compact
    ? "text-lg font-semibold text-[var(--ds-text-primary)] m-0 tracking-tight tabular-nums leading-tight"
    : "text-xl font-semibold text-[var(--ds-text-primary)] m-0 tracking-tight tabular-nums leading-tight";

  const coverageCombined =
    scheduleCoverageRatioPrimaryValueClassName != null && scheduleCoverageRatioPrimaryValueClassName !== ""
      ? `${valueClass} ${scheduleCoverageRatioPrimaryValueClassName}`
      : valueClass;

  const inner = (
    <>
      <MetricBlock
        label="Schedule Exposure"
        value={scheduleExposurePrimaryValue}
        valueClassName={valueClass}
      />
      <MetricBlock
        label="Contingency Held"
        value={scheduleContingencyHeldPrimaryValue}
        valueClassName={valueClass}
      />
      <MetricBlock
        label="Coverage Ratio"
        value={scheduleCoverageRatioPrimaryValue}
        valueRagDot={scheduleCoverageRatioPrimaryRagDot}
        valueClassName={coverageCombined}
      />
    </>
  );

  if (layout === "stack") {
    return (
      <div className={`flex flex-col gap-3 w-full min-w-0 ${className}`.trim()}>{inner}</div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full min-w-0 ${className}`.trim()}
    >
      {inner}
    </div>
  );
}
