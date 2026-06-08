import { Card, CardContent } from "@visualify/design-system";
import type { ReportProjectKeyMilestone } from "@/lib/projects/report-project-key-milestones";

type ReportProjectKeyMilestonesCardProps = {
  milestones: ReportProjectKeyMilestone[];
};

export function ReportProjectKeyMilestonesCard({
  milestones,
}: ReportProjectKeyMilestonesCardProps) {
  return (
    <Card className="flex h-full w-full min-w-0 flex-col">
      <CardContent className="flex flex-1 flex-col px-4 py-3">
        <p className="m-0 mb-2 shrink-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Upcoming key milestones
        </p>
        <ul className="m-0 flex list-none flex-col divide-y divide-[var(--ds-border-subtle)] p-0">
          {milestones.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <span className="min-w-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                {row.milestone}
              </span>
              <time
                dateTime={row.forecastDate}
                className="shrink-0 text-[length:var(--ds-text-sm)] tabular-nums text-[var(--ds-text-muted)]"
              >
                {row.forecastDate}
              </time>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
