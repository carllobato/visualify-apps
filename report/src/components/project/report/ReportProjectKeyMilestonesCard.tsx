import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import type { ReportProjectKeyMilestone } from "@/lib/projects/report-project-key-milestones";
import { REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS } from "@/lib/projects/report-project-overview-link";

const MILESTONE_ROW_CLASS = [
  "grid min-h-10 shrink-0 grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1.4fr)_max-content_max-content] sm:items-center sm:gap-4",
  "text-[length:var(--ds-text-sm)]",
  REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS,
].join(" ");

type ReportProjectKeyMilestonesCardProps = {
  milestones: ReportProjectKeyMilestone[];
};

export function ReportProjectKeyMilestonesCard({
  milestones,
}: ReportProjectKeyMilestonesCardProps) {
  return (
    <ReportProjectOverviewInteractiveCard hoverable>
      <ReportProjectOverviewCardHeader title="Key milestones" />
      <div className="flex min-h-0 flex-1 flex-col">
        <ul className="m-0 flex shrink-0 list-none flex-col divide-y divide-[var(--ds-border-subtle)] p-0">
          {milestones.map((row) => (
            <li key={row.id} className={MILESTONE_ROW_CLASS}>
              <span className="m-0 min-w-0 text-[var(--ds-text-secondary)]">
                {row.milestone}
              </span>
              <time
                dateTime={row.forecastDate}
                className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)] sm:text-right"
              >
                {row.forecastDate}
              </time>
              <span className="text-[var(--ds-text-secondary)] sm:text-right">{row.status}</span>
            </li>
          ))}
        </ul>
        <div className="min-h-0 flex-1" aria-hidden="true" />
      </div>
    </ReportProjectOverviewInteractiveCard>
  );
}
