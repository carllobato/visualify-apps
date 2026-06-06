import { formatReportBudgetAmount } from "@/lib/projects/report-project-budget";

export type ReportProjectCostSummary = {
  currentBudget: number;
  normalisedBudget: number;
  forecastFinalAccount: number;
  spentToDate: number;
  deploymentSizeMw: number;
  currencySymbol?: string;
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
  currentBudget: 204_200_000,
  normalisedBudget: 198_400_000,
  forecastFinalAccount: 210_326_000,
  spentToDate: 70_000_000,
  deploymentSizeMw: 15,
  currencySymbol: "$",
};

/** Placeholder until report Excel upload supplies cost data. */
export const REPORT_PROJECT_COST_PLACEHOLDER: ReportProjectCostData = {
  summary: REPORT_PROJECT_COST_SUMMARY_PLACEHOLDER,
  cashflow: buildReportProjectCashflowPlaceholder(),
};

export const REPORT_PROJECT_CASHFLOW_AXIS_MAX = REPORT_CASHFLOW_AXIS_MAX;

export function getReportCashflowTodayIndex(series: ReportProjectCashflowSeries[]): number {
  const monthKeys = series[0]?.data.map((point) => point.key) ?? [];
  return monthKeys.indexOf(REPORT_CASHFLOW_TODAY_KEY);
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

export function formatReportForecastVariancePercent(variancePercent: number): string {
  const rounded = Math.round(variancePercent * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}% vs budget`;
}

export function getReportSpentToDatePercent(summary: ReportProjectCostSummary): number {
  if (summary.currentBudget <= 0) return 0;
  return Math.min(100, Math.max(0, (summary.spentToDate / summary.currentBudget) * 100));
}
