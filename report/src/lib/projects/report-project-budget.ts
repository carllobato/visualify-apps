import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectBudget = {
  approvedBudget: number;
  currentForecast: number;
  lastReportForecast: number;
  currencySymbol?: string;
  status?: string;
  trend: ReportProjectTrend;
};

/** Placeholder until report Excel upload supplies project budget. */
export const REPORT_PROJECT_BUDGET_PLACEHOLDER: ReportProjectBudget = {
  approvedBudget: 204_200_000,
  currentForecast: 201_400_000,
  lastReportForecast: 210_300_000,
  currencySymbol: "$",
  status: "Green",
  trend: { text: "Improved vs last report", sentiment: "favorable" },
};

export function getReportBudgetMovementSinceLastReport(budget: ReportProjectBudget): number {
  return budget.currentForecast - budget.lastReportForecast;
}

export function formatReportBudgetMovementSinceLastReport(
  movement: number,
  currencySymbol = "$",
): string {
  if (movement === 0) {
    return formatReportBudgetAmount(0, currencySymbol);
  }

  return formatReportBudgetVarianceAmount(movement, currencySymbol);
}

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

export function getReportBudgetVarianceAmount(budget: ReportProjectBudget): number {
  return budget.currentForecast - budget.approvedBudget;
}

export function getReportBudgetVariancePercent(budget: ReportProjectBudget): number {
  if (budget.approvedBudget <= 0) return 0;
  return (getReportBudgetVarianceAmount(budget) / budget.approvedBudget) * 100;
}

export function getReportBudgetRagStatus(budget: ReportProjectBudget): string {
  if (budget.status) return budget.status;

  const variancePercent = getReportBudgetVariancePercent(budget);
  if (variancePercent <= 0) return "Green";
  if (variancePercent <= 5) return "Amber";
  return "Red";
}

export function isReportBudgetOverForecast(budget: ReportProjectBudget): boolean {
  return budget.currentForecast > budget.approvedBudget;
}

export function formatReportBudgetVarianceAmount(
  amount: number,
  currencySymbol = "$",
): string {
  const formatted = formatReportBudgetAmount(Math.abs(amount), currencySymbol);
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

export function formatReportBudgetVariancePercent(variancePercent: number): string {
  const rounded = Math.round(variancePercent * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

export function getReportBudgetVarianceToneClass(budget: ReportProjectBudget): string {
  if (!isReportBudgetOverForecast(budget)) {
    return "text-[var(--ds-status-success-fg)]";
  }

  const ragStatus = getReportBudgetRagStatus(budget).toLowerCase();
  if (ragStatus === "red") {
    return "text-[var(--ds-status-danger-fg)]";
  }

  return "text-[var(--ds-status-warning-fg)]";
}
