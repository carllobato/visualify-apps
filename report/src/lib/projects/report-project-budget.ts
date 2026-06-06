export type ReportProjectBudget = {
  projectValue: number;
  worksCompleted: number;
  currencySymbol?: string;
};

/** Placeholder until report Excel upload supplies project budget. */
export const REPORT_PROJECT_BUDGET_PLACEHOLDER: ReportProjectBudget = {
  projectValue: 204_200_000,
  worksCompleted: 70_000_000,
  currencySymbol: "$",
};

export function formatReportBudgetAmount(
  amount: number,
  currencySymbol = "£",
): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `${currencySymbol}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${currencySymbol}${Math.round(amount / 1_000)}K`;
  }
  return `${currencySymbol}${Math.round(amount)}`;
}

export function getReportBudgetCompletionRatio(budget: ReportProjectBudget): number {
  if (budget.projectValue <= 0) return 0;
  return Math.min(1, Math.max(0, budget.worksCompleted / budget.projectValue));
}
