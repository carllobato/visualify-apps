import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import {
  formatReportBudgetAmount,
  formatReportBudgetMovementSinceLastReport,
  formatReportBudgetVarianceAmount,
  getReportBudgetMovementSinceLastReport,
  getReportBudgetRagStatus,
  getReportBudgetVarianceAmount,
  getReportBudgetVarianceToneClass,
  type ReportProjectBudget,
} from "@/lib/projects/report-project-budget";
import { REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS } from "@/lib/projects/report-project-overview-link";
import { getReportTrendToneClass } from "@/lib/projects/report-project-trend";

type ReportProjectBudgetCardProps = {
  budget: ReportProjectBudget;
  highlighted?: boolean;
  rowHoverable?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const BUDGET_ROW_CLASS =
  "flex min-h-10 shrink-0 items-center justify-between gap-4 text-[length:var(--ds-text-sm)]";

export function ReportProjectBudgetCard({
  budget,
  highlighted = false,
  rowHoverable = false,
  onNavigate,
  navigateLabel,
}: ReportProjectBudgetCardProps) {
  const currencySymbol = budget.currencySymbol ?? "$";
  const varianceAmount = getReportBudgetVarianceAmount(budget);
  const movementSinceLastReport = getReportBudgetMovementSinceLastReport(budget);
  const ragStatus = getReportBudgetRagStatus(budget);
  const varianceToneClass = getReportBudgetVarianceToneClass(budget);
  const movementToneClass = getReportTrendToneClass(budget.trend.sentiment);
  const budgetRowClassName = [
    BUDGET_ROW_CLASS,
    rowHoverable ? REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS : "",
    rowHoverable && onNavigate ? "pointer-events-auto cursor-pointer" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const budgetRowProps =
    rowHoverable && onNavigate
      ? ({ onClick: onNavigate } as const)
      : undefined;

  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
    >
      <ReportProjectOverviewCardHeader title="Cost" status={ragStatus} />
      <div className="flex min-h-0 flex-1 flex-col">
        <dl className="m-0 flex shrink-0 flex-col divide-y divide-[var(--ds-border-subtle)]">
          <div className={budgetRowClassName} {...budgetRowProps}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Target Budget</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportBudgetAmount(budget.approvedBudget, currencySymbol)}
            </dd>
          </div>
          <div className={budgetRowClassName} {...budgetRowProps}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Current Forecast</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportBudgetAmount(budget.currentForecast, currencySymbol)}
            </dd>
          </div>
          <div className={budgetRowClassName} {...budgetRowProps}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Variance</dt>
            <dd className={`m-0 font-semibold tabular-nums ${varianceToneClass}`}>
              {formatReportBudgetVarianceAmount(varianceAmount, currencySymbol)}
            </dd>
          </div>
          <div className={budgetRowClassName} {...budgetRowProps}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Since last report</dt>
            <dd className={`m-0 font-semibold tabular-nums ${movementToneClass}`}>
              {formatReportBudgetMovementSinceLastReport(movementSinceLastReport, currencySymbol)}
            </dd>
          </div>
        </dl>
        <div className="min-h-0 flex-1" aria-hidden="true" />
      </div>
    </ReportProjectOverviewInteractiveCard>
  );
}
