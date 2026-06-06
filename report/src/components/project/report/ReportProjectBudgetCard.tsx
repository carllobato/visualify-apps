import { Card, CardContent, DonutChartGlyph } from "@visualify/design-system";
import {
  formatReportBudgetAmount,
  getReportBudgetCompletionRatio,
  type ReportProjectBudget,
} from "@/lib/projects/report-project-budget";

type ReportProjectBudgetCardProps = {
  budget: ReportProjectBudget;
};

export function ReportProjectBudgetCard({ budget }: ReportProjectBudgetCardProps) {
  const currencySymbol = budget.currencySymbol ?? "$";
  const completionRatio = getReportBudgetCompletionRatio(budget);
  const projectValueLabel = formatReportBudgetAmount(budget.projectValue, currencySymbol);
  const worksCompletedLabel = formatReportBudgetAmount(budget.worksCompleted, currencySymbol);
  const percentLabel = `${Math.round(completionRatio * 100)}%`;

  return (
    <Card className="h-full w-full min-w-0">
      <CardContent className="px-4 py-3">
        <p className="m-0 mb-2 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Project budget
        </p>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 w-full items-center justify-center sm:w-1/2">
            <DonutChartGlyph
              completedRatio={completionRatio}
              centerLabel={percentLabel}
              centerSubLabel="complete"
              status="positive"
              ariaLabel={`Works completed ${percentLabel} of project value`}
            />
          </div>
          <dl className="m-0 flex min-w-0 w-full flex-col justify-center divide-y divide-[var(--ds-border-subtle)] text-[length:var(--ds-text-sm)] sm:w-1/2">
            <div className="flex items-baseline justify-between gap-4 py-2 first:pt-0">
              <dt className="m-0 text-[var(--ds-text-secondary)]">Project value</dt>
              <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                {projectValueLabel}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2 last:pb-0">
              <dt className="m-0 text-[var(--ds-text-secondary)]">Works completed</dt>
              <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                {worksCompletedLabel}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
