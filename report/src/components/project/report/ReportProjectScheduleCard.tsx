import { Trend } from "@visualify/design-system";
import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import {
  formatReportScheduleDate,
  formatReportScheduleVarianceDays,
  getReportScheduleMovementSinceLastReport,
  getReportScheduleRagStatus,
  getReportScheduleVarianceDays,
  getReportScheduleVarianceToneClass,
  REPORT_PROJECT_SCHEDULE_OVERVIEW_PLACEHOLDER,
  type ReportProjectScheduleOverview,
} from "@/lib/projects/report-project-schedule";
import { getReportTrendToneClass } from "@/lib/projects/report-project-trend";

type ReportProjectScheduleCardProps = {
  schedule?: ReportProjectScheduleOverview;
  highlighted?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const SCHEDULE_ROW_CLASS =
  "flex min-h-10 shrink-0 items-center justify-between gap-4 text-[length:var(--ds-text-sm)]";

export function ReportProjectScheduleCard({
  schedule = REPORT_PROJECT_SCHEDULE_OVERVIEW_PLACEHOLDER,
  highlighted = false,
  onNavigate,
  navigateLabel,
}: ReportProjectScheduleCardProps) {
  const varianceDays = getReportScheduleVarianceDays(schedule);
  const movementSinceLastReport = getReportScheduleMovementSinceLastReport(schedule);
  const ragStatus = getReportScheduleRagStatus(schedule);
  const varianceToneClass = getReportScheduleVarianceToneClass(schedule);
  const movementToneClass = getReportTrendToneClass(schedule.trend.sentiment);

  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
    >
      <ReportProjectOverviewCardHeader title="Schedule" />
      <div className="flex min-h-0 flex-1 flex-col">
        <dl className="m-0 flex shrink-0 flex-col divide-y divide-[var(--ds-border-subtle)]">
          <div className={SCHEDULE_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Target RFS</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportScheduleDate(schedule.baselineRfs)}
            </dd>
          </div>
          <div className={SCHEDULE_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Current RFS</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportScheduleDate(schedule.forecastRfs)}
            </dd>
          </div>
          <div className={SCHEDULE_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Variance</dt>
            <dd className="m-0 inline-flex items-center gap-2">
              <ReportRagStatusDot status={ragStatus} />
              <span className={`font-semibold tabular-nums ${varianceToneClass}`}>
                {formatReportScheduleVarianceDays(varianceDays)}
              </span>
            </dd>
          </div>
          <div className={SCHEDULE_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Since last report</dt>
            <dd className="m-0 inline-flex min-w-0 items-center justify-end gap-1.5">
              <Trend sentiment={schedule.trend.sentiment}>{schedule.trend.text}</Trend>
              <span className={`font-semibold tabular-nums ${movementToneClass}`}>
                {formatReportScheduleVarianceDays(movementSinceLastReport)}
              </span>
            </dd>
          </div>
        </dl>
        <div className="min-h-0 flex-1" aria-hidden="true" />
      </div>
    </ReportProjectOverviewInteractiveCard>
  );
}
