import { Fragment } from "react";
import { Card, CardContent } from "@visualify/design-system";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import type { ReportProjectModuleStatusItem } from "@/lib/projects/report-project-module-status";

type ReportProjectModuleStatusCardProps = {
  items: ReportProjectModuleStatusItem[];
};

export function ReportProjectModuleStatusCard({ items }: ReportProjectModuleStatusCardProps) {
  return (
    <Card className="h-full w-full min-w-0">
      <CardContent className="px-4 py-3">
        <p className="m-0 mb-2 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Status
        </p>
        <div className="grid min-w-0 grid-cols-[0.6875rem_max-content_minmax(0,1fr)] gap-x-4 text-[length:var(--ds-text-sm)]">
          {items.map((row, index) => {
            const rowDivider =
              index > 0 ? "border-t border-[var(--ds-border-subtle)] pt-1.5" : "";
            const rowPadding = "pb-1.5";

            return (
              <Fragment key={row.label}>
                <div className={`flex items-center ${rowDivider} ${rowPadding}`}>
                  <ReportRagStatusDot status={row.status} />
                </div>
                <span
                  className={`whitespace-nowrap pr-4 font-medium text-[var(--ds-text-primary)] ${rowDivider} ${rowPadding}`}
                >
                  {row.label}
                </span>
                <span
                  className={`min-w-0 text-[var(--ds-text-secondary)] ${rowDivider} ${rowPadding}`}
                >
                  {row.comment}
                </span>
              </Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
