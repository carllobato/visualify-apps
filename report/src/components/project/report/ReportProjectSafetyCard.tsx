import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import {
  formatReportSafetyLtifr,
  formatReportSafetyLtifrVariance,
  formatReportSafetyMovementSinceLastReport,
  getReportSafetyLtifrVariance,
  getReportSafetyMovementSinceLastReport,
  getReportSafetyRagStatus,
  getReportSafetyVarianceToneClass,
  REPORT_PROJECT_SAFETY_OVERVIEW_PLACEHOLDER,
  type ReportProjectSafetyOverview,
} from "@/lib/projects/report-project-safety-overview";
import { REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS } from "@/lib/projects/report-project-overview-link";
import { getReportTrendToneClass } from "@/lib/projects/report-project-trend";

type ReportProjectSafetyCardProps = {
  safety?: ReportProjectSafetyOverview;
  highlighted?: boolean;
  rowHoverable?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const SAFETY_ROW_CLASS =
  "flex min-h-10 shrink-0 items-center justify-between gap-4 text-[length:var(--ds-text-sm)]";

export function ReportProjectSafetyCard({
  safety = REPORT_PROJECT_SAFETY_OVERVIEW_PLACEHOLDER,
  highlighted = false,
  rowHoverable = false,
  onNavigate,
  navigateLabel,
}: ReportProjectSafetyCardProps) {
  const ltifrVariance = getReportSafetyLtifrVariance(safety);
  const movementSinceLastReport = getReportSafetyMovementSinceLastReport(safety);
  const ragStatus = getReportSafetyRagStatus(safety);
  const varianceToneClass = getReportSafetyVarianceToneClass(safety);
  const movementToneClass = getReportTrendToneClass(safety.trend.sentiment);
  const safetyRowClassName = [
    SAFETY_ROW_CLASS,
    rowHoverable ? REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS : "",
    rowHoverable && onNavigate ? "pointer-events-auto cursor-pointer" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const safetyRowProps =
    rowHoverable && onNavigate
      ? ({ onClick: onNavigate } as const)
      : undefined;

  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
    >
      <ReportProjectOverviewCardHeader title="Safety" status={ragStatus} />
      <div className="flex min-h-0 flex-1 flex-col">
        <dl className="m-0 flex shrink-0 flex-col divide-y divide-[var(--ds-border-subtle)]">
          <div className={safetyRowClassName} {...safetyRowProps}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Target LTIFR</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportSafetyLtifr(safety.targetLtifr)}
            </dd>
          </div>
          <div className={safetyRowClassName} {...safetyRowProps}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Current LTIFR</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportSafetyLtifr(safety.currentLtifr)}
            </dd>
          </div>
          <div className={safetyRowClassName} {...safetyRowProps}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Variance</dt>
            <dd className={`m-0 font-semibold tabular-nums ${varianceToneClass}`}>
              {formatReportSafetyLtifrVariance(ltifrVariance)}
            </dd>
          </div>
          <div className={safetyRowClassName} {...safetyRowProps}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Since last report</dt>
            <dd className={`m-0 font-semibold tabular-nums ${movementToneClass}`}>
              {formatReportSafetyMovementSinceLastReport(movementSinceLastReport)}
            </dd>
          </div>
        </dl>
        <div className="min-h-0 flex-1" aria-hidden="true" />
      </div>
    </ReportProjectOverviewInteractiveCard>
  );
}
