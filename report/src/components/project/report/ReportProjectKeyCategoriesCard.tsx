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
          Category commentary
        </p>
        <ul className="m-0 flex list-none flex-col divide-y divide-[var(--ds-border-subtle)] p-0">
          {categories.map((row) => (
            <li key={row.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                  {row.category}
                </span>
                <ReportRagStatusDot status={row.status} />
              </div>
              <p className="m-0 mt-1.5 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
                {row.summary}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
