import { Trend } from "@visualify/design-system";
import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
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
import { getReportTrendToneClass } from "@/lib/projects/report-project-trend";

type ReportProjectSafetyCardProps = {
  safety?: ReportProjectSafetyOverview;
  highlighted?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const SAFETY_ROW_CLASS =
  "flex min-h-10 shrink-0 items-center justify-between gap-4 text-[length:var(--ds-text-sm)]";

export function ReportProjectSafetyCard({
  safety = REPORT_PROJECT_SAFETY_OVERVIEW_PLACEHOLDER,
  highlighted = false,
  onNavigate,
  navigateLabel,
}: ReportProjectSafetyCardProps) {
  const ltifrVariance = getReportSafetyLtifrVariance(safety);
  const movementSinceLastReport = getReportSafetyMovementSinceLastReport(safety);
  const ragStatus = getReportSafetyRagStatus(safety);
  const varianceToneClass = getReportSafetyVarianceToneClass(safety);
  const movementToneClass = getReportTrendToneClass(safety.trend.sentiment);

  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
    >
      <ReportProjectOverviewCardHeader title="Safety" />
      <div className="flex min-h-0 flex-1 flex-col">
        <dl className="m-0 flex shrink-0 flex-col divide-y divide-[var(--ds-border-subtle)]">
          <div className={SAFETY_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Target LTIFR</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportSafetyLtifr(safety.targetLtifr)}
            </dd>
          </div>
          <div className={SAFETY_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Current LTIFR</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportSafetyLtifr(safety.currentLtifr)}
            </dd>
          </div>
          <div className={SAFETY_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Variance</dt>
            <dd className="m-0 inline-flex items-center gap-2">
              <ReportRagStatusDot status={ragStatus} />
              <span className={`font-semibold tabular-nums ${varianceToneClass}`}>
                {formatReportSafetyLtifrVariance(ltifrVariance)}
              </span>
            </dd>
          </div>
          <div className={SAFETY_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Since last report</dt>
            <dd className="m-0 inline-flex min-w-0 items-center justify-end gap-1.5">
              <Trend sentiment={safety.trend.sentiment}>{safety.trend.text}</Trend>
              <span className={`font-semibold tabular-nums ${movementToneClass}`}>
                {formatReportSafetyMovementSinceLastReport(movementSinceLastReport)}
              </span>
            </dd>
          </div>
        </dl>
        <div className="min-h-0 flex-1" aria-hidden="true" />
      </div>
    </ReportProjectOverviewInteractiveCard>
  );
}
