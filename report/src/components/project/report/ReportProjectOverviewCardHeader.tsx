import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import { REPORT_OVERVIEW_METRIC_DOT_CLASS } from "@/lib/projects/report-project-overview-link";

type ReportProjectOverviewCardHeaderProps = {
  title: string;
  status?: string;
};

export function ReportProjectOverviewCardHeader({
  title,
  status,
}: ReportProjectOverviewCardHeaderProps) {
  return (
    <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
      <p className="m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
        {title}
      </p>
      {status ? (
        <ReportRagStatusDot status={status} dotClassName={REPORT_OVERVIEW_METRIC_DOT_CLASS} />
      ) : null}
    </div>
  );
}
