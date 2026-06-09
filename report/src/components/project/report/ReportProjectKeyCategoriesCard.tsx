import { ReportProjectCategoryIcon } from "@/components/project/report/ReportProjectCategoryIcon";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import type { ReportProjectCategoryRow } from "@/lib/projects/report-project-category-rows";
import { REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS } from "@/lib/projects/report-project-overview-link";

type ReportProjectKeyCategoriesCardProps = {
  categories: ReportProjectCategoryRow[];
};

const CATEGORY_COMMENTARY_LIST_CLASS =
  "m-0 grid list-none grid-cols-[1.125rem_7rem_minmax(0,1fr)_0.75rem] gap-x-2 p-0";

const CATEGORY_COMMENTARY_ROW_CLASS = [
  "col-span-full grid grid-cols-subgrid items-start gap-x-2 border-b border-[var(--ds-border-subtle)] py-3 last:border-b-0 first:pt-0",
  REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS,
].join(" ");

export function ReportProjectKeyCategoriesCard({ categories }: ReportProjectKeyCategoriesCardProps) {
  return (
    <ReportProjectOverviewInteractiveCard hoverable>
      <p className="m-0 mb-2 shrink-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
        Category commentary
      </p>
      <ul className={CATEGORY_COMMENTARY_LIST_CLASS}>
        {categories.map((row) => (
          <li key={row.id} className={CATEGORY_COMMENTARY_ROW_CLASS}>
            <span className="flex items-center pt-0.5">
              <ReportProjectCategoryIcon category={row.category} />
            </span>
            <span className="min-w-0 pt-0.5 text-[length:var(--ds-text-sm)] font-medium leading-snug text-[var(--ds-text-primary)]">
              {row.category}
            </span>
            <p className="m-0 min-w-0 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
              {row.summary}
            </p>
            <span className="flex justify-end pt-0.5">
              <ReportRagStatusDot status={row.status} />
            </span>
          </li>
        ))}
      </ul>
    </ReportProjectOverviewInteractiveCard>
  );
}
