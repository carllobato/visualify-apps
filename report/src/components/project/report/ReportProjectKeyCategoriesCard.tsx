import { Fragment } from "react";
import { Card, CardContent } from "@visualify/design-system";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import type { ReportProjectCategoryRow } from "@/lib/projects/report-project-category-rows";

type ReportProjectKeyCategoriesCardProps = {
  categories: ReportProjectCategoryRow[];
};

export function ReportProjectKeyCategoriesCard({ categories }: ReportProjectKeyCategoriesCardProps) {
  return (
    <Card className="flex h-full w-full min-w-0 flex-col">
      <CardContent className="flex flex-1 flex-col px-4 py-3">
        <p className="m-0 mb-2 shrink-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Key project categories
        </p>
        <div
          className="grid min-h-0 flex-1 grid-cols-[0.6875rem_max-content_minmax(0,1fr)] gap-x-4 text-[length:var(--ds-text-sm)]"
          style={{
            gridTemplateRows: `repeat(${categories.length}, minmax(0, 1fr))`,
          }}
        >
          {categories.map((row, index) => {
            const rowDivider =
              index > 0 ? "border-t border-[var(--ds-border-subtle)] pt-1.5" : "";
            const rowPadding = "pb-1.5";

            return (
              <Fragment key={row.id}>
                <div className={`flex items-center ${rowDivider} ${rowPadding}`}>
                  <ReportRagStatusDot status={row.status} />
                </div>
                <span
                  className={`whitespace-nowrap pr-4 font-medium text-[var(--ds-text-primary)] ${rowDivider} ${rowPadding}`}
                >
                  {row.category}
                </span>
                <span
                  className={`min-w-0 text-[var(--ds-text-secondary)] ${rowDivider} ${rowPadding}`}
                >
                  {row.summary}
                </span>
              </Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
