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
import {
  REPORT_OVERVIEW_METRIC_DOT_CLASS,
  REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS,
  REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS,
  REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS,
} from "@/lib/projects/report-project-overview-link";
import { getReportTrendToneClass } from "@/lib/projects/report-project-trend";

type ReportProjectScheduleCardProps = {
  schedule?: ReportProjectScheduleOverview;
  highlighted?: boolean;
  hoverable?: boolean;
  rowHoverable?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const SCHEDULE_ROW_CLASS =
  "flex min-h-10 shrink-0 items-center justify-between gap-4 text-[length:var(--ds-text-sm)]";

export function ReportProjectScheduleCard({
  schedule = REPORT_PROJECT_SCHEDULE_OVERVIEW_PLACEHOLDER,
  highlighted = false,
  hoverable = false,
  rowHoverable = false,
  onNavigate,
  navigateLabel,
}: ReportProjectScheduleCardProps) {
  const varianceDays = getReportScheduleVarianceDays(schedule);
  const movementSinceLastReport = getReportScheduleMovementSinceLastReport(schedule);
  const ragStatus = getReportScheduleRagStatus(schedule);
  const varianceToneClass = getReportScheduleVarianceToneClass(schedule);
  const movementToneClass = getReportTrendToneClass(schedule.trend.sentiment);
  const scheduleRowClassName = [SCHEDULE_ROW_CLASS, rowHoverable ? REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      hoverable={hoverable}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
    >
      <ReportProjectOverviewCardHeader title="Schedule" />
      <div className="flex min-h-0 flex-1 flex-col">
        <dl className="m-0 flex shrink-0 flex-col divide-y divide-[var(--ds-border-subtle)]">
          <div className={scheduleRowClassName}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Target RFS</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportScheduleDate(schedule.baselineRfs)}
            </dd>
          </div>
          <div className={scheduleRowClassName}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Current RFS</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportScheduleDate(schedule.forecastRfs)}
            </dd>
          </div>
          <div className={scheduleRowClassName}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Variance</dt>
            <dd className={REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS}>
              <span className={REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS}>
                <ReportRagStatusDot status={ragStatus} dotClassName={REPORT_OVERVIEW_METRIC_DOT_CLASS} />
              </span>
              <span className={`font-semibold tabular-nums ${varianceToneClass}`}>
                {formatReportScheduleVarianceDays(varianceDays)}
              </span>
            </dd>
          </div>
          <div className={scheduleRowClassName}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Since last report</dt>
            <dd className={REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS}>
              <span className={REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS}>
                <Trend sentiment={schedule.trend.sentiment}>{schedule.trend.text}</Trend>
              </span>
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
