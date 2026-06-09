export type ReportProjectCostWbsOption = {
  id: string;
  code: string;
  description: string;
  parentWbsId: string | null;
  sortOrder: number | null;
};

export type ReportProjectCostSummaryDirectRow = {
  id: string;
  wbsId: string;
  approvedBudget: number;
  currentForecast: number;
  currentCommitted: number;
  currentUncommitted: number;
};

export type ReportProjectCostSummaryCategoryRow = {
  rowKey: string;
  wbsId: string;
  wbsCode: string;
  wbsDescription: string;
  sortOrder: number | null;
  approvedBudget: number;
  currentForecast: number;
  currentCommitted: number;
  currentUncommitted: number;
};

export type ReportProjectCostSummaryData = {
  wbsOptions: ReportProjectCostWbsOption[];
  directRows: ReportProjectCostSummaryDirectRow[];
};

type ReportProjectCostSummaryTotals = {
  approvedBudget: number;
  currentForecast: number;
  currentCommitted: number;
  currentUncommitted: number;
};

function isDescendantWbsCode(ancestorCode: string, descendantCode: string): boolean {
  return descendantCode.startsWith(`${ancestorCode}.`);
}

/** Display WBS codes with two-digit numeric segments (e.g. 1 → 01, 9.1 → 09.01). */
export function formatReportCostSummaryWbsCode(code: string): string {
  return code
    .split(".")
    .map((segment) => (/^\d+$/.test(segment) ? segment.padStart(2, "0") : segment))
    .join(".");
}

function compareReportCostSummaryCategoryRows(
  a: ReportProjectCostSummaryCategoryRow,
  b: ReportProjectCostSummaryCategoryRow,
): number {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.wbsCode.localeCompare(b.wbsCode, undefined, { numeric: true });
}

function sumDirectRowsForCategory(
  categoryCode: string,
  directRows: ReportProjectCostSummaryDirectRow[],
  wbsById: Map<string, ReportProjectCostWbsOption>,
): ReportProjectCostSummaryTotals {
  const totals = directRows.reduce(
    (totals, row) => {
      const wbs = wbsById.get(row.wbsId);
      if (!wbs) return totals;
      if (wbs.code !== categoryCode && !isDescendantWbsCode(categoryCode, wbs.code)) {
        return totals;
      }

      return {
        approvedBudget: totals.approvedBudget + row.approvedBudget,
        currentForecast: totals.currentForecast + row.currentForecast,
        currentCommitted: totals.currentCommitted + row.currentCommitted,
      };
    },
    {
      approvedBudget: 0,
      currentForecast: 0,
      currentCommitted: 0,
    },
  );

  return {
    ...totals,
    currentUncommitted: getReportCostSummaryUncommittedAmount(
      totals.currentForecast,
      totals.currentCommitted,
    ),
  };
}

/** Builds one flat row per top-level WBS category, rolling up descendant cost lines. */
export function buildReportCostSummaryCategoryRows(
  wbsOptions: ReportProjectCostWbsOption[],
  directRows: ReportProjectCostSummaryDirectRow[],
): ReportProjectCostSummaryCategoryRow[] {
  if (wbsOptions.length === 0) return [];

  const wbsById = new Map(wbsOptions.map((option) => [option.id, option]));
  const topLevelCategories = wbsOptions.filter(
    (option) =>
      option.parentWbsId === null &&
      !REPORT_PROJECT_COST_SUMMARY_EXCLUDED_TOP_LEVEL_CODES.has(option.code),
  );

  const rows = topLevelCategories.map((category) => {
    const totals = sumDirectRowsForCategory(category.code, directRows, wbsById);

    return {
      rowKey: category.id,
      wbsId: category.id,
      wbsCode: category.code,
      wbsDescription: category.description,
      sortOrder: category.sortOrder,
      ...totals,
    };
  });

  rows.sort(compareReportCostSummaryCategoryRows);
  return rows;
}

export function sumReportCostSummaryCategoryRows(
  rows: ReportProjectCostSummaryCategoryRow[],
): ReportProjectCostSummaryTotals {
  const totals = rows.reduce(
    (totals, row) => ({
      approvedBudget: totals.approvedBudget + row.approvedBudget,
      currentForecast: totals.currentForecast + row.currentForecast,
      currentCommitted: totals.currentCommitted + row.currentCommitted,
    }),
    {
      approvedBudget: 0,
      currentForecast: 0,
      currentCommitted: 0,
    },
  );

  return {
    ...totals,
    currentUncommitted: getReportCostSummaryUncommittedAmount(
      totals.currentForecast,
      totals.currentCommitted,
    ),
  };
}

export function getReportCostSummaryUncommittedAmount(
  currentForecast: number,
  currentCommitted: number,
): number {
  return currentForecast - currentCommitted;
}

export function getReportCostSummaryVarianceAmount(
  approvedBudget: number,
  currentForecast: number,
): number {
  return currentForecast - approvedBudget;
}

function formatReportCostSummaryMagnitude(
  amount: number,
  decimals: number,
  currencySymbol = "$",
): string {
  if (amount === 0) return `${currencySymbol} - M`;
  const magnitude = `${currencySymbol}${(Math.abs(amount) / 1_000_000).toFixed(decimals)}M`;
  if (amount < 0) return `- ${magnitude}`;
  return magnitude;
}

/** Summary table amounts — millions with two decimal places (e.g. $1.23M, - $1.23M). */
export function formatReportCostSummaryAmount(
  amount: number,
  currencySymbol = "$",
): string {
  return formatReportCostSummaryMagnitude(amount, 2, currencySymbol);
}

/** Summary table project total row — millions with one decimal place (e.g. $233.5M). */
export function formatReportCostSummaryTotalAmount(
  amount: number,
  currencySymbol = "$",
): string {
  return formatReportCostSummaryMagnitude(amount, 1, currencySymbol);
}

function formatReportCostSummaryDifferenceAmount(
  amount: number,
  formatAbsolute: (abs: number, currencySymbol: string) => string,
  currencySymbol = "$",
): string {
  const formatted = formatAbsolute(Math.abs(amount), currencySymbol);
  if (amount > 0) return `+ ${formatted}`;
  if (amount < 0) return `- ${formatted}`;
  return formatted;
}

/** vs Budget column — positive differences include a leading + (e.g. + $1.23M). */
export function formatReportCostSummaryVarianceAmount(
  amount: number,
  currencySymbol = "$",
): string {
  return formatReportCostSummaryDifferenceAmount(
    amount,
    formatReportCostSummaryAmount,
    currencySymbol,
  );
}

export function formatReportCostSummaryTotalVarianceAmount(
  amount: number,
  currencySymbol = "$",
): string {
  return formatReportCostSummaryDifferenceAmount(
    amount,
    formatReportCostSummaryTotalAmount,
    currencySymbol,
  );
}

export function getReportCostSummaryAmountToneClass(amount: number): string {
  if (amount < 0) {
    return "text-[var(--ds-status-danger-fg)]";
  }

  return "text-[var(--ds-text-primary)]";
}

export function getReportCostSummaryVarianceToneClass(varianceAmount: number): string {
  if (varianceAmount < 0) {
    return "text-[var(--ds-status-danger-fg)]";
  }

  if (varianceAmount > 0) {
    return "text-[var(--ds-status-success-fg)]";
  }

  return "text-[var(--ds-text-primary)]";
}

export function getReportCostSummaryVariancePercent(
  approvedBudget: number,
  currentForecast: number,
): number {
  if (approvedBudget <= 0) return 0;
  return (getReportCostSummaryVarianceAmount(approvedBudget, currentForecast) / approvedBudget) * 100;
}

/** Top-level WBS codes omitted from the report cost summary table. */
export const REPORT_PROJECT_COST_SUMMARY_EXCLUDED_TOP_LEVEL_CODES = new Set([
  "00",
  "01",
  "09",
  "10",
  "50",
  "51",
  "59",
  "99",
]);

/** Top-level WBS codes excluded from normalised forecast (Asset Holding, Contingency). */
export const REPORT_PROJECT_COST_NORMALISED_FORECAST_EXCLUDED_WBS_CODES = new Set([
  "11",
  "49",
]);

const REPORT_PROJECT_COST_TOP_LEVEL_WBS_PLACEHOLDER: ReportProjectCostWbsOption[] = [
  { id: "wbs-11", code: "11", description: "Asset Holding Costs", parentWbsId: null, sortOrder: 0 },
  { id: "wbs-12", code: "12", description: "Due Diligence", parentWbsId: null, sortOrder: 1 },
  { id: "wbs-13", code: "13", description: "Design & Development", parentWbsId: null, sortOrder: 2 },
  { id: "wbs-14", code: "14", description: "Authority / Planning Costs", parentWbsId: null, sortOrder: 3 },
  { id: "wbs-15", code: "15", description: "Power & Utilities", parentWbsId: null, sortOrder: 4 },
  { id: "wbs-16", code: "16", description: "Long Lead Equipment", parentWbsId: null, sortOrder: 5 },
  { id: "wbs-17", code: "17", description: "IT & AV", parentWbsId: null, sortOrder: 6 },
  { id: "wbs-18", code: "18", description: "Construction", parentWbsId: null, sortOrder: 7 },
  { id: "wbs-19", code: "19", description: "Customer", parentWbsId: null, sortOrder: 8 },
  { id: "wbs-49", code: "49", description: "Contingency", parentWbsId: null, sortOrder: 9 },
];

const REPORT_PROJECT_COST_SUMMARY_DIRECT_ROWS_PLACEHOLDER: ReportProjectCostSummaryDirectRow[] = [
  {
    id: "cs-11",
    wbsId: "wbs-11",
    approvedBudget: 431_556,
    currentForecast: 431_556,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
  {
    id: "cs-12",
    wbsId: "wbs-12",
    approvedBudget: 1_192_591,
    currentForecast: 1_192_591,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
  {
    id: "cs-13",
    wbsId: "wbs-13",
    approvedBudget: 6_793_635,
    currentForecast: 6_793_635,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
  {
    id: "cs-14",
    wbsId: "wbs-14",
    approvedBudget: 2_439_483,
    currentForecast: 2_439_483,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
  {
    id: "cs-15",
    wbsId: "wbs-15",
    approvedBudget: 6_897_000,
    currentForecast: 6_897_000,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
  {
    id: "cs-16",
    wbsId: "wbs-16",
    approvedBudget: 62_460_878,
    currentForecast: 62_460_878,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
  {
    id: "cs-17",
    wbsId: "wbs-17",
    approvedBudget: 2_000_000,
    currentForecast: 2_000_000,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
  {
    id: "cs-18",
    wbsId: "wbs-18",
    approvedBudget: 114_673_218,
    currentForecast: 114_673_218,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
  {
    id: "cs-19",
    wbsId: "wbs-19",
    approvedBudget: 29_200_000,
    currentForecast: 29_200_000,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
  {
    id: "cs-49",
    wbsId: "wbs-49",
    approvedBudget: 7_371_591,
    currentForecast: 7_371_591,
    currentCommitted: 0,
    currentUncommitted: 0,
  },
];

/** Placeholder until report Excel upload supplies WBS cost summary rows. */
export const REPORT_PROJECT_COST_WBS_SUMMARY_PLACEHOLDER: ReportProjectCostSummaryData = {
  wbsOptions: REPORT_PROJECT_COST_TOP_LEVEL_WBS_PLACEHOLDER,
  directRows: REPORT_PROJECT_COST_SUMMARY_DIRECT_ROWS_PLACEHOLDER,
};

/** Rolled-up totals for a WBS cost summary — use for project-level budget figures. */
export function getReportProjectCostWbsSummaryTotals(
  data: ReportProjectCostSummaryData,
): ReportProjectCostSummaryTotals {
  const categoryRows = buildReportCostSummaryCategoryRows(data.wbsOptions, data.directRows);
  return sumReportCostSummaryCategoryRows(categoryRows);
}

/**
 * Normalised forecast — project current forecast total minus Asset Holding (11)
 * and Contingency (49).
 */
function sumReportProjectCostNormalisedCategoryField(
  data: ReportProjectCostSummaryData,
  field: keyof Pick<ReportProjectCostSummaryCategoryRow, "approvedBudget" | "currentForecast">,
): number {
  const categoryRows = buildReportCostSummaryCategoryRows(data.wbsOptions, data.directRows);

  return categoryRows.reduce((total, row) => {
    if (REPORT_PROJECT_COST_NORMALISED_FORECAST_EXCLUDED_WBS_CODES.has(row.wbsCode)) {
      return total;
    }

    return total + row[field];
  }, 0);
}

export function getReportProjectCostNormalisedForecast(
  data: ReportProjectCostSummaryData,
): number {
  return sumReportProjectCostNormalisedCategoryField(data, "currentForecast");
}

export function getReportProjectCostNormalisedApprovedBudget(
  data: ReportProjectCostSummaryData,
): number {
  return sumReportProjectCostNormalisedCategoryField(data, "approvedBudget");
}

const REPORT_PROJECT_WBS_SUMMARY_TOTALS = getReportProjectCostWbsSummaryTotals(
  REPORT_PROJECT_COST_WBS_SUMMARY_PLACEHOLDER,
);

/** Normalised forecast for the placeholder cost summary table. */
export const REPORT_PROJECT_WBS_NORMALISED_FORECAST_TOTAL = getReportProjectCostNormalisedForecast(
  REPORT_PROJECT_COST_WBS_SUMMARY_PLACEHOLDER,
);

/** Sum of top-level WBS approved budgets in the placeholder cost summary table. */
export const REPORT_PROJECT_WBS_APPROVED_BUDGET_TOTAL =
  REPORT_PROJECT_WBS_SUMMARY_TOTALS.approvedBudget;

/** Sum of top-level WBS current forecasts in the placeholder cost summary table. */
export const REPORT_PROJECT_WBS_CURRENT_FORECAST_TOTAL =
  REPORT_PROJECT_WBS_SUMMARY_TOTALS.currentForecast;
