const labelClass =
  "text-[11px] font-medium tracking-[0.04em] text-[var(--ds-text-muted)] m-0 mb-0.5";

export type PortfolioCostCoverageMetricsPanelProps = {
  costExposurePrimaryValue: string;
  contingencyPrimaryValue: string;
  coveragePrimaryValue: string;
  coveragePrimaryValueClassName?: string;
  /** `grid`: three columns (KPI tile). `stack`: vertical list (e.g. beside chart). */
  layout?: "grid" | "stack";
  /** Slightly smaller figures for narrow sidebars. */
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
 * Shared readout for cost exposure, contingency held, and coverage ratio.
 */
export function PortfolioCostCoverageMetricsPanel({
  costExposurePrimaryValue,
  contingencyPrimaryValue,
  coveragePrimaryValue,
  coveragePrimaryValueClassName,
  layout = "grid",
  compact = false,
  className = "",
}: PortfolioCostCoverageMetricsPanelProps) {
  const valueClass = compact
    ? "text-lg font-semibold text-[var(--ds-text-primary)] m-0 tracking-tight tabular-nums leading-tight"
    : "text-xl font-semibold text-[var(--ds-text-primary)] m-0 tracking-tight tabular-nums leading-tight";

  const coverageCombined =
    coveragePrimaryValueClassName != null && coveragePrimaryValueClassName !== ""
      ? `${valueClass} ${coveragePrimaryValueClassName}`
      : valueClass;

  const inner = (
    <>
      <MetricBlock
        label="Cost Exposure"
        value={costExposurePrimaryValue}
        valueClassName={valueClass}
      />
      <MetricBlock label="Contingency Held" value={contingencyPrimaryValue} valueClassName={valueClass} />
      <MetricBlock label="Coverage Ratio" value={coveragePrimaryValue} valueClassName={coverageCombined} />
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
