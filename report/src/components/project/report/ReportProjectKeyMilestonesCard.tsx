import { Fragment } from "react";
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
          Upcoming Key Milestones
        </p>
        <div
          className="grid min-h-0 flex-1 grid-cols-[max-content_minmax(0,1fr)] gap-x-4 text-[length:var(--ds-text-sm)]"
          style={{
            gridTemplateRows: `repeat(${milestones.length}, minmax(0, 1fr))`,
          }}
        >
          {milestones.map((row, index) => {
            const rowDivider =
              index > 0 ? "border-t border-[var(--ds-border-subtle)] pt-1.5" : "";
            const rowPadding = "pb-1.5";

            return (
              <Fragment key={row.id}>
                <span
                  className={`whitespace-nowrap pr-4 font-medium text-[var(--ds-text-primary)] ${rowDivider} ${rowPadding}`}
                >
                  {row.milestone}
                </span>
                <span
                  className={`min-w-0 text-right text-[var(--ds-text-secondary)] ${rowDivider} ${rowPadding}`}
                >
                  {row.forecastDate}
                </span>
              </Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
