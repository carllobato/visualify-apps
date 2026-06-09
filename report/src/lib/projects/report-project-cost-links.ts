import {
  getReportCashflowTodayIndex,
  REPORT_CASHFLOW_ACTUALS_SERIES_LABEL,
  type ReportProjectCashflowSeries,
} from "@/lib/projects/report-project-cost";
import {
  REPORT_PROJECT_COST_NORMALISED_FORECAST_EXCLUDED_WBS_CODES,
  type ReportProjectCostSummaryCategoryRow,
} from "@/lib/projects/report-project-cost-summary";

export type ReportCostMetricLinkId =
  | "cost-status"
  | "approved-budget"
  | "current-forecast"
  | "normalised-forecast"
  | "spent-to-date";

export type ReportCostSummaryHighlightColumn =
  | "approved-budget"
  | "current-forecast"
  | "current-committed"
  | "current-uncommitted";

export type ReportCostSummaryColumnBorderSegment = "header" | "body" | "footer";

/** Highlight ring segments — styled in report-project-cost-summary-table.css */
export const REPORT_COST_SUMMARY_COLUMN_HIGHLIGHT_HEADER_CLASS =
  "report-cost-summary-col-highlight-header";
export const REPORT_COST_SUMMARY_COLUMN_HIGHLIGHT_BODY_CLASS =
  "report-cost-summary-col-highlight-body";
export const REPORT_COST_SUMMARY_COLUMN_HIGHLIGHT_FOOTER_CLASS =
  "report-cost-summary-col-highlight-footer";

/** Blue fill for highlighted summary column cells. */
export const REPORT_COST_SOURCE_ROW_CELL_HIGHLIGHT_CLASS =
  "!bg-[color-mix(in_oklab,var(--ds-primary)_12%,transparent)]";

export function getReportCostMetricSummaryColumn(
  linkId: ReportCostMetricLinkId,
): ReportCostSummaryHighlightColumn | undefined {
  switch (linkId) {
    case "approved-budget":
      return "approved-budget";
    case "current-forecast":
    case "normalised-forecast":
      return "current-forecast";
    default:
      return undefined;
  }
}

export type ReportCostMetricCashflowLink = {
  pointIndex: number;
  seriesLabel: string;
};

export function getReportCostMetricHighlightsCashflow(linkId: ReportCostMetricLinkId): boolean {
  return linkId === "spent-to-date";
}

export function getReportCostMetricCashflowLink(
  linkId: ReportCostMetricLinkId,
  cashflow: ReportProjectCashflowSeries[],
): ReportCostMetricCashflowLink | undefined {
  if (linkId !== "spent-to-date") return undefined;

  const pointIndex = getReportCashflowTodayIndex(cashflow);
  if (pointIndex < 0) return undefined;

  return {
    pointIndex,
    seriesLabel: REPORT_CASHFLOW_ACTUALS_SERIES_LABEL,
  };
}

export function getReportCostMetricSummaryRowFilter(
  linkId: ReportCostMetricLinkId,
): ((row: ReportProjectCostSummaryCategoryRow) => boolean) | undefined {
  if (linkId !== "normalised-forecast") {
    return undefined;
  }

  return (row) => !REPORT_PROJECT_COST_NORMALISED_FORECAST_EXCLUDED_WBS_CODES.has(row.wbsCode);
}

export function getReportCostSummaryColumnBorderClass(
  column: ReportCostSummaryHighlightColumn,
  segment: ReportCostSummaryColumnBorderSegment,
  highlightedColumn: ReportCostSummaryHighlightColumn | undefined,
): string {
  if (highlightedColumn !== column) {
    return "";
  }

  switch (segment) {
    case "header":
      return REPORT_COST_SUMMARY_COLUMN_HIGHLIGHT_HEADER_CLASS;
    case "body":
      return REPORT_COST_SUMMARY_COLUMN_HIGHLIGHT_BODY_CLASS;
    case "footer":
      return REPORT_COST_SUMMARY_COLUMN_HIGHLIGHT_FOOTER_CLASS;
  }
}

export function getReportCostSummaryColumnFillClass(
  column: ReportCostSummaryHighlightColumn,
  highlightedColumn: ReportCostSummaryHighlightColumn | undefined,
  options: {
    row?: ReportProjectCostSummaryCategoryRow;
    highlightedRowFilter?: (row: ReportProjectCostSummaryCategoryRow) => boolean;
    segment?: ReportCostSummaryColumnBorderSegment;
  } = {},
): string {
  const { row, highlightedRowFilter, segment = "body" } = options;

  if (highlightedColumn !== column || highlightedRowFilter == null) {
    return "";
  }

  if (segment !== "body" || row == null) {
    return "";
  }

  return highlightedRowFilter(row) ? REPORT_COST_SOURCE_ROW_CELL_HIGHLIGHT_CLASS : "";
}
