/** Locked Report Excel workbook structure (source of truth). */

export const REPORT_EXCEL_DIVIDER_SHEETS = ["Project", "Cost"] as const;

export const REPORT_EXCEL_DATA_SHEETS = [
  "Project Meta",
  "Status",
  "Schedule",
  "Key Milestones",
  "Safety Stats",
  "Category Status",
  "Top Risks",
  "Cost Summary",
  "Cashflow",
] as const;

export type ReportExcelDataSheetName = (typeof REPORT_EXCEL_DATA_SHEETS)[number];

export const REPORT_EXCEL_FIELD_VALUE_COLUMNS = ["Field", "Value", "Notes"] as const;

export const REPORT_EXCEL_ACCEPTED_RAG = ["Green", "Amber", "Red", "Yellow"] as const;

export const REPORT_EXCEL_ACCEPTED_TREND_SENTIMENTS = [
  "favorable",
  "unfavorable",
  "neutral",
] as const;

export const REPORT_EXCEL_ACCEPTED_RISK_LEVELS = ["Low", "Medium", "High"] as const;

/** Project Meta — Field / Value rows. */
export const REPORT_EXCEL_PROJECT_META_FIELDS = [
  "Site IT Load",
  "Deployment IT Load",
  "RFS Date",
  "Customer Status",
] as const;

/** Status — Field / Value rows. */
export const REPORT_EXCEL_STATUS_FIELDS = [
  "Reporting Date",
  "Overall Status",
  "Safety Status",
  "Schedule Status",
  "Cost Status",
  "Risk Status",
] as const;

/** Schedule — Field / Value rows. */
export const REPORT_EXCEL_SCHEDULE_FIELDS = ["Target RFS", "Current RFS"] as const;

export const REPORT_EXCEL_KEY_MILESTONES_COLUMNS = [
  "Milestone",
  "Forecast Date",
  "Status",
] as const;

export const REPORT_EXCEL_SAFETY_STATS_COLUMNS = [
  "Metric",
  "Value",
  "Display Override",
] as const;

export const REPORT_EXCEL_CATEGORY_STATUS_COLUMNS = [
  "Category",
  "Status",
  "Summary",
] as const;

export const REPORT_EXCEL_TOP_RISKS_COLUMNS = [
  "Title",
  "Description",
  "Category",
  "Status",
] as const;

export const REPORT_EXCEL_COST_SUMMARY_COLUMNS = [
  "WBS Code",
  "WBS Description",
  "Approved Budget",
  "Current Forecast",
  "Current Committed",
] as const;

export const REPORT_EXCEL_CASHFLOW_COLUMNS = [
  "Month",
  "Commitment",
  "Off-Ramp",
  "Actuals",
] as const;

export const REPORT_EXCEL_CASHFLOW_SERIES = ["Commitment", "Off-Ramp", "Actuals"] as const;

export const REPORT_EXCEL_DEFAULT_TREND = {
  text: "No change",
  sentiment: "neutral",
} as const;

/** Required header columns per sheet (validated at parse time). */
export const REPORT_EXCEL_REQUIRED_COLUMNS: Record<ReportExcelDataSheetName, readonly string[]> = {
  "Project Meta": REPORT_EXCEL_FIELD_VALUE_COLUMNS,
  Status: REPORT_EXCEL_FIELD_VALUE_COLUMNS,
  Schedule: REPORT_EXCEL_FIELD_VALUE_COLUMNS,
  "Key Milestones": REPORT_EXCEL_KEY_MILESTONES_COLUMNS,
  "Safety Stats": REPORT_EXCEL_SAFETY_STATS_COLUMNS,
  "Category Status": REPORT_EXCEL_CATEGORY_STATUS_COLUMNS,
  "Top Risks": REPORT_EXCEL_TOP_RISKS_COLUMNS,
  "Cost Summary": REPORT_EXCEL_COST_SUMMARY_COLUMNS,
  Cashflow: REPORT_EXCEL_CASHFLOW_COLUMNS,
};

/** Module labels derived from Status sheet rows. */
export const REPORT_EXCEL_MODULE_STATUS_FIELDS = [
  { field: "Safety Status", label: "Safety" },
  { field: "Schedule Status", label: "Schedule" },
  { field: "Cost Status", label: "Cost" },
  { field: "Risk Status", label: "Risk" },
] as const;
