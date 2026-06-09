import { formatReportBudgetAmount } from "@/lib/projects/report-project-budget";
import {
  REPORT_PROJECT_COST_WBS_SUMMARY_PLACEHOLDER,
  REPORT_PROJECT_WBS_APPROVED_BUDGET_TOTAL,
  REPORT_PROJECT_WBS_CURRENT_FORECAST_TOTAL,
  REPORT_PROJECT_WBS_NORMALISED_FORECAST_TOTAL,
  type ReportProjectCostSummaryData,
} from "@/lib/projects/report-project-cost-summary";
import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectCostLastReport = {
  approvedBudget: number;
  currentForecast: number;
  normalisedForecast: number;
  spentToDate: number;
};

export type ReportProjectCostSummary = {
  currentBudget: number;
  normalisedBudget: number;
  forecastFinalAccount: number;
  spentToDate: number;
  deploymentSizeMw: number;
  currencySymbol?: string;
  status?: string;
  trend?: ReportProjectTrend;
  lastReport?: ReportProjectCostLastReport;
};

export type ReportProjectCashflowPoint = {
  key: string;
  value: number;
};

export type ReportProjectCashflowSeries = {
  label: string;
  data: ReportProjectCashflowPoint[];
  forecastFromIndex?: number;
  color?: string;
  fillUnder?: boolean;
};

export type ReportProjectCostData = {
  summary: ReportProjectCostSummary;
  costSummary: ReportProjectCostSummaryData;
  cashflow: ReportProjectCashflowSeries[];
};

const CASHFLOW_MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const REPORT_CASHFLOW_AXIS_MAX = 250_000_000;
const REPORT_CASHFLOW_FORECAST_FROM = "Jun 26";
export const REPORT_CASHFLOW_TODAY_KEY = "Jun 26";

const REPORT_CASHFLOW_COLORS = {
  commitment: "#4472C4",
  offRamp: "#ED7D31",
  actuals: "#548235",
} as const;

function buildReportCashflowMonthKeys(
  startYear: number,
  startMonthIndex: number,
  endYear: number,
  endMonthIndex: number,
): string[] {
  const keys: string[] = [];
  let year = startYear;
  let monthIndex = startMonthIndex;

  while (year < endYear || (year === endYear && monthIndex <= endMonthIndex)) {
    keys.push(`${CASHFLOW_MONTH_ABBR[monthIndex]} ${String(year).slice(-2)}`);
    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
  }

  return keys;
}

function buildReportCashflowStepSeries(
  monthKeys: string[],
  jumps: { from: string; value: number }[],
): ReportProjectCashflowPoint[] {
  return monthKeys.map((key) => {
    const jump = [...jumps].reverse().find((entry) => monthKeys.indexOf(key) >= monthKeys.indexOf(entry.from));
    return { key, value: jump?.value ?? 0 };
  });
}

function interpolateReportCashflowLevels(
  monthKeys: string[],
  levels: { from: string; value: number }[],
): number[] {
  const anchors = levels
    .map((level) => ({
      index: monthKeys.indexOf(level.from),
      value: level.value,
    }))
    .filter((level) => level.index >= 0)
    .sort((a, b) => a.index - b.index);

  if (anchors.length === 0) {
    return monthKeys.map(() => 0);
  }

  return monthKeys.map((_, index) => {
    let start = anchors[0];
    let end = anchors[anchors.length - 1];

    for (let anchorIndex = 0; anchorIndex < anchors.length; anchorIndex += 1) {
      const anchor = anchors[anchorIndex];
      if (anchor.index <= index) start = anchor;
      if (anchor.index >= index) {
        end = anchor;
        break;
      }
    }

    if (start.index === end.index) return start.value;

    const progress = (index - start.index) / (end.index - start.index);
    return Math.round(start.value + (end.value - start.value) * progress);
  });
}

function buildReportCashflowConvergingForecastSeries(
  monthKeys: string[],
  actualJumps: { from: string; value: number }[],
  forecastFromKey: string,
  endValue: number,
): ReportProjectCashflowPoint[] {
  const actualPoints = buildReportCashflowStepSeries(monthKeys, actualJumps);
  const forecastFromIndex = monthKeys.indexOf(forecastFromKey);
  const endIndex = monthKeys.length - 1;

  if (forecastFromIndex < 0 || endIndex <= forecastFromIndex) return actualPoints;

  const startValue = actualPoints[forecastFromIndex].value;
  const forecastSpan = endIndex - forecastFromIndex;

  return monthKeys.map((key, index) => {
    if (index <= forecastFromIndex) return actualPoints[index];

    const progress = (index - forecastFromIndex) / forecastSpan;
    return {
      key,
      value: Math.round(startValue + (endValue - startValue) * progress),
    };
  });
}

function buildReportCashflowActualsSeries(
  monthKeys: string[],
  actualLevels: { from: string; value: number }[],
  forecastFromKey: string,
  endValue: number,
): ReportProjectCashflowPoint[] {
  const actualValues = interpolateReportCashflowLevels(monthKeys, actualLevels);
  const forecastFromIndex = monthKeys.indexOf(forecastFromKey);
  const endIndex = monthKeys.length - 1;

  if (forecastFromIndex < 0 || endIndex <= forecastFromIndex) {
    return monthKeys.map((key, index) => ({ key, value: actualValues[index] }));
  }

  const startValue = actualValues[forecastFromIndex];
  const forecastSpan = endIndex - forecastFromIndex;

  return monthKeys.map((key, index) => {
    if (index <= forecastFromIndex) {
      return { key, value: actualValues[index] };
    }

    const progress = (index - forecastFromIndex) / forecastSpan;
    return {
      key,
      value: Math.round(startValue + (endValue - startValue) * progress),
    };
  });
}

function buildReportProjectCashflowPlaceholder(): ReportProjectCashflowSeries[] {
  const monthKeys = buildReportCashflowMonthKeys(2025, 0, 2026, 9);
  const forecastFromIndex = monthKeys.indexOf(REPORT_CASHFLOW_FORECAST_FROM);
  const endValue = REPORT_PROJECT_COST_SUMMARY_PLACEHOLDER.forecastFinalAccount;
  const { spentToDate } = REPORT_PROJECT_COST_SUMMARY_PLACEHOLDER;

  const commitmentActual = [
    { from: "Jan 25", value: 0 },
    { from: "Sep 25", value: 65_000_000 },
    { from: "Mar 26", value: 195_000_000 },
    { from: "Jun 26", value: 205_000_000 },
  ] as const;

  const offRampActual = [
    { from: "Jan 25", value: 0 },
    { from: "Sep 25", value: 42_000_000 },
    { from: "Mar 26", value: 128_000_000 },
    { from: "Jun 26", value: 142_000_000 },
  ] as const;

  const actualsActual = [
    { from: "Jan 25", value: 0 },
    { from: "Aug 25", value: 0 },
    { from: "Sep 25", value: 1_500_000 },
    { from: "Nov 25", value: 7_000_000 },
    { from: "Jan 26", value: 16_000_000 },
    { from: "Mar 26", value: 40_000_000 },
    { from: "May 26", value: 58_000_000 },
    { from: "Jun 26", value: spentToDate },
  ] as const;

  return [
    {
      label: "Commitment",
      color: REPORT_CASHFLOW_COLORS.commitment,
      forecastFromIndex: forecastFromIndex >= 0 ? forecastFromIndex : undefined,
      data: buildReportCashflowConvergingForecastSeries(
        monthKeys,
        [...commitmentActual],
        REPORT_CASHFLOW_FORECAST_FROM,
        endValue,
      ),
    },
    {
      label: "Off-Ramp",
      color: REPORT_CASHFLOW_COLORS.offRamp,
      forecastFromIndex: forecastFromIndex >= 0 ? forecastFromIndex : undefined,
      data: buildReportCashflowConvergingForecastSeries(
        monthKeys,
        [...offRampActual],
        REPORT_CASHFLOW_FORECAST_FROM,
        endValue,
      ),
    },
    {
      label: "Actuals",
      color: REPORT_CASHFLOW_COLORS.actuals,
      fillUnder: true,
      forecastFromIndex: forecastFromIndex >= 0 ? forecastFromIndex : undefined,
      data: buildReportCashflowActualsSeries(
        monthKeys,
        [...actualsActual],
        REPORT_CASHFLOW_FORECAST_FROM,
        endValue,
      ),
    },
  ];
}

const REPORT_PROJECT_COST_SUMMARY_PLACEHOLDER: ReportProjectCostSummary = {
  /** Rolled-up approved budget — matches summary table “Approved Budget” project total. */
  currentBudget: REPORT_PROJECT_WBS_APPROVED_BUDGET_TOTAL,
  /** Project total current forecast minus Asset Holding (11) and Contingency (49). */
  normalisedBudget: REPORT_PROJECT_WBS_NORMALISED_FORECAST_TOTAL,
  /** Matches summary table “Current Forecast” project total until EFC is supplied separately. */
  forecastFinalAccount: REPORT_PROJECT_WBS_CURRENT_FORECAST_TOTAL,
  spentToDate: 70_000_000,
  deploymentSizeMw: 15,
  currencySymbol: "$",
  status: "Green",
  trend: { text: "Unchanged vs last report", sentiment: "neutral" },
  lastReport: {
    approvedBudget: REPORT_PROJECT_WBS_APPROVED_BUDGET_TOTAL,
    currentForecast: Math.round(REPORT_PROJECT_WBS_CURRENT_FORECAST_TOTAL * 1.028),
    normalisedForecast: Math.round(REPORT_PROJECT_WBS_NORMALISED_FORECAST_TOTAL * 1.025),
    spentToDate: 65_000_000,
  },
};

/** Placeholder until report Excel upload supplies cost data. */
export const REPORT_PROJECT_COST_PLACEHOLDER: ReportProjectCostData = {
  summary: REPORT_PROJECT_COST_SUMMARY_PLACEHOLDER,
  costSummary: REPORT_PROJECT_COST_WBS_SUMMARY_PLACEHOLDER,
  cashflow: buildReportProjectCashflowPlaceholder(),
};

export const REPORT_PROJECT_CASHFLOW_AXIS_MAX = REPORT_CASHFLOW_AXIS_MAX;

export const REPORT_CASHFLOW_ACTUALS_SERIES_LABEL = "Actuals";

export function getReportCashflowTodayIndex(series: ReportProjectCashflowSeries[]): number {
  const firstSeries = series[0];
  if (
    firstSeries?.forecastFromIndex !== undefined &&
    firstSeries.forecastFromIndex >= 0
  ) {
    return firstSeries.forecastFromIndex;
  }

  const monthKeys = firstSeries?.data.map((point) => point.key) ?? [];
  return monthKeys.indexOf(REPORT_CASHFLOW_TODAY_KEY);
}

export function getReportCashflowActualsSeries(
  series: ReportProjectCashflowSeries[],
): ReportProjectCashflowSeries | undefined {
  return series.find((entry) => entry.label === REPORT_CASHFLOW_ACTUALS_SERIES_LABEL);
}

/** Cumulative Actuals at the reporting month — source of truth for spent to date. */
export function getReportCashflowSpentToDateAmount(
  series: ReportProjectCashflowSeries[],
): number | undefined {
  const actuals = getReportCashflowActualsSeries(series);
  if (!actuals || actuals.data.length === 0) return undefined;

  const reportingMonthIndex = getReportCashflowTodayIndex(series);
  if (reportingMonthIndex >= 0 && reportingMonthIndex < actuals.data.length) {
    return actuals.data[reportingMonthIndex]?.value;
  }

  const lastActualIndex =
    actuals.forecastFromIndex !== undefined && actuals.forecastFromIndex > 0
      ? actuals.forecastFromIndex - 1
      : actuals.data.length - 1;

  return actuals.data[lastActualIndex]?.value;
}

export function getReportProjectSpentToDateAmount(
  summary: Pick<ReportProjectCostSummary, "spentToDate">,
  cashflow: ReportProjectCashflowSeries[],
): number {
  return getReportCashflowSpentToDateAmount(cashflow) ?? summary.spentToDate;
}

export function formatReportCostAmount(
  amount: number,
  currencySymbol = "$",
): string {
  return formatReportBudgetAmount(amount, currencySymbol);
}

export function formatReportCashflowAxisLabel(
  amount: number,
  currencySymbol = "$",
): string {
  if (amount === 0) return `${currencySymbol}0`;
  return formatReportBudgetAmount(amount, currencySymbol);
}

export function formatReportCostPerMw(
  amount: number,
  capacityMw: number,
  currencySymbol = "$",
): string {
  if (capacityMw <= 0) return `${currencySymbol}—/MW`;

  const perMw = amount / capacityMw;
  if (perMw >= 1_000_000) {
    return `${currencySymbol}${(perMw / 1_000_000).toFixed(1)}M/MW`;
  }

  if (perMw >= 1_000) {
    return `${currencySymbol}${Math.round(perMw / 1_000)}K/MW`;
  }

  return `${currencySymbol}${Math.round(perMw)}/MW`;
}

export function formatReportCurrentBudgetPerMw(summary: ReportProjectCostSummary): string {
  return formatReportCostPerMw(
    summary.currentBudget,
    summary.deploymentSizeMw,
    summary.currencySymbol ?? "$",
  );
}

export function formatReportNormalisedBudgetPerMw(summary: ReportProjectCostSummary): string {
  return formatReportCostPerMw(
    summary.normalisedBudget,
    summary.deploymentSizeMw,
    summary.currencySymbol ?? "$",
  );
}

export function getReportForecastVariancePercent(summary: ReportProjectCostSummary): number {
  if (summary.currentBudget <= 0) return 0;
  return ((summary.forecastFinalAccount - summary.currentBudget) / summary.currentBudget) * 100;
}

export function getReportCostRagStatus(summary: ReportProjectCostSummary): string {
  if (summary.status) return summary.status;

  const variancePercent = getReportForecastVariancePercent(summary);
  if (variancePercent <= 0) return "Green";
  if (variancePercent <= 5) return "Amber";
  return "Red";
}

/** Trend arrow for a cost metric vs the prior reporting period (lower cost is favorable). */
export function getReportCostMetricTrend(
  current: number,
  lastReport?: number,
): ReportProjectTrend | undefined {
  if (lastReport === undefined) return undefined;

  const movement = current - lastReport;
  if (movement === 0) {
    return { text: "Unchanged vs last report", sentiment: "neutral" };
  }

  if (movement < 0) {
    return { text: "Improved vs last report", sentiment: "favorable" };
  }

  return { text: "Worsened vs last report", sentiment: "unfavorable" };
}

export function formatReportForecastVariancePercent(variancePercent: number): string {
  const rounded = Math.round(variancePercent * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}% vs budget`;
}

export function getReportSpentToDatePercent(summary: ReportProjectCostSummary): number {
  if (summary.currentBudget <= 0) return 0;
  return Math.min(100, Math.max(0, (summary.spentToDate / summary.currentBudget) * 100));
}

/** Subtitle for the spent-to-date metric. */
export function getReportSpentToDateMetricHelper(spentToDatePercent: number): string {
  return `${Math.round(spentToDatePercent)}% of approved budget spent to date`;
}
