import { Trend } from "@visualify/design-system";
import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import {
  formatReportBudgetAmount,
  formatReportBudgetMovementSinceLastReport,
  formatReportBudgetVarianceAmount,
  formatReportBudgetVariancePercent,
  getReportBudgetMovementSinceLastReport,
  getReportBudgetRagStatus,
  getReportBudgetVarianceAmount,
  getReportBudgetVariancePercent,
  getReportBudgetVarianceToneClass,
  type ReportProjectBudget,
} from "@/lib/projects/report-project-budget";
import {
  REPORT_OVERVIEW_METRIC_DOT_CLASS,
  REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS,
  REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS,
} from "@/lib/projects/report-project-overview-link";
import { getReportTrendToneClass } from "@/lib/projects/report-project-trend";

type ReportProjectBudgetCardProps = {
  budget: ReportProjectBudget;
  highlighted?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const BUDGET_ROW_CLASS =
  "flex min-h-10 shrink-0 items-center justify-between gap-4 text-[length:var(--ds-text-sm)]";

export function ReportProjectBudgetCard({
  budget,
  highlighted = false,
  onNavigate,
  navigateLabel,
}: ReportProjectBudgetCardProps) {
  const currencySymbol = budget.currencySymbol ?? "$";
  const varianceAmount = getReportBudgetVarianceAmount(budget);
  const variancePercent = getReportBudgetVariancePercent(budget);
  const movementSinceLastReport = getReportBudgetMovementSinceLastReport(budget);
  const ragStatus = getReportBudgetRagStatus(budget);
  const varianceToneClass = getReportBudgetVarianceToneClass(budget);
  const movementToneClass = getReportTrendToneClass(budget.trend.sentiment);

  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
    >
      <ReportProjectOverviewCardHeader title="Cost" />
      <div className="flex min-h-0 flex-1 flex-col">
        <dl className="m-0 flex shrink-0 flex-col divide-y divide-[var(--ds-border-subtle)]">
          <div className={BUDGET_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Target Budget</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportBudgetAmount(budget.approvedBudget, currencySymbol)}
            </dd>
          </div>
          <div className={BUDGET_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Current Forecast</dt>
            <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {formatReportBudgetAmount(budget.currentForecast, currencySymbol)}
            </dd>
          </div>
          <div className={BUDGET_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Variance</dt>
            <dd className={REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS}>
              <span className={REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS}>
                <ReportRagStatusDot status={ragStatus} dotClassName={REPORT_OVERVIEW_METRIC_DOT_CLASS} />
              </span>
              <span className={`font-semibold tabular-nums ${varianceToneClass}`}>
                {formatReportBudgetVarianceAmount(varianceAmount, currencySymbol)}{" "}
                ({formatReportBudgetVariancePercent(variancePercent)})
              </span>
            </dd>
          </div>
          <div className={BUDGET_ROW_CLASS}>
            <dt className="m-0 text-[var(--ds-text-secondary)]">Since last report</dt>
            <dd className={REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS}>
              <span className={REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS}>
                <Trend sentiment={budget.trend.sentiment}>{budget.trend.text}</Trend>
              </span>
              <span className={`font-semibold tabular-nums ${movementToneClass}`}>
                {formatReportBudgetMovementSinceLastReport(movementSinceLastReport, currencySymbol)}
              </span>
            </dd>
          </div>
        </dl>
        <div className="min-h-0 flex-1" aria-hidden="true" />
      </div>
    </ReportProjectOverviewInteractiveCard>
  );
}
