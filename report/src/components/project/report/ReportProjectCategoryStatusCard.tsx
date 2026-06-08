import { Card, CardContent } from "@visualify/design-system";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import type { ReportProjectCategoryRow } from "@/lib/projects/report-project-category-rows";

type ReportProjectCategoryStatusCardProps = {
  categories: ReportProjectCategoryRow[];
};

export function ReportProjectCategoryStatusCard({
  categories,
}: ReportProjectCategoryStatusCardProps) {
  return (
    <Card className="flex w-full min-w-0 flex-col">
      <CardContent className="flex flex-col px-4 py-4">
        <p className="m-0 mb-4 shrink-0 text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
          Project category status
        </p>
        <ul className="m-0 grid list-none grid-cols-1 gap-x-8 gap-y-0 p-0 sm:grid-cols-2">
          {categories.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 items-center justify-between gap-4 border-b border-[var(--ds-border-subtle)] py-3.5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <span className="min-w-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                {row.category}
              </span>
              <ReportRagStatusDot status={row.status} dotClassName="size-3" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
