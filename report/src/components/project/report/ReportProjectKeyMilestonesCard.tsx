import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import type { ReportProjectKeyMilestone } from "@/lib/projects/report-project-key-milestones";
import { REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS } from "@/lib/projects/report-project-overview-link";

type ReportProjectKeyMilestonesCardProps = {
  milestones: ReportProjectKeyMilestone[];
};

export function ReportProjectKeyMilestonesCard({
  milestones,
}: ReportProjectKeyMilestonesCardProps) {
  return (
    <ReportProjectOverviewInteractiveCard hoverable>
      <p className="m-0 mb-2 shrink-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
        Key milestones
      </p>
      <ul className="m-0 flex list-none flex-col divide-y divide-[var(--ds-border-subtle)] p-0">
        {milestones.map((row) => (
          <li
            key={row.id}
            className={[
              "grid min-w-0 grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1.4fr)_max-content_max-content] sm:items-baseline sm:gap-4",
              REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS,
            ].join(" ")}
          >
            <span className="min-w-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
              {row.milestone}
            </span>
            <time
              dateTime={row.forecastDate}
              className="text-[length:var(--ds-text-sm)] tabular-nums text-[var(--ds-text-muted)] sm:text-right"
            >
              {row.forecastDate}
            </time>
            <span className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] sm:text-right">
              {row.status}
            </span>
          </li>
        ))}
      </ul>
    </ReportProjectOverviewInteractiveCard>
  );
}
