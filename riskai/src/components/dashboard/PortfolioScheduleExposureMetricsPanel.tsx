const labelClass =
  "text-[11px] font-medium tracking-[0.04em] text-[var(--ds-text-muted)] m-0 mb-0.5";

export type PortfolioScheduleExposureMetricsPanelProps = {
  scheduleExposurePrimaryValue: string;
  scheduleContingencyHeldPrimaryValue: string;
  scheduleCoverageRatioPrimaryValue: string;
  scheduleCoverageRatioPrimaryValueClassName?: string;
  layout?: "grid" | "stack";
  compact?: boolean;
  className?: string;
};

function MetricBlock({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="min-w-0 text-left">
      <p className={labelClass}>{label}</p>
      <p className={`${valueClassName} truncate`} title={value}>
        {value}
      </p>
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
