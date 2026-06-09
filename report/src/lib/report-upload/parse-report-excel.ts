import * as XLSX from "xlsx";
import {
  getReportProjectCostNormalisedForecast,
  getReportProjectCostWbsSummaryTotals,
} from "@/lib/projects/report-project-cost-summary";
import type { ReportProjectBudget } from "@/lib/projects/report-project-budget";
import type { ReportProjectCategoryRow } from "@/lib/projects/report-project-category-rows";
import type { ReportProjectCostData } from "@/lib/projects/report-project-cost";
import type { ReportProjectCashflowSeries } from "@/lib/projects/report-project-cost";
import type { ReportProjectCostSummaryDirectRow } from "@/lib/projects/report-project-cost-summary";
import type { ReportProjectCostWbsOption } from "@/lib/projects/report-project-cost-summary";
import type { ReportProjectKeyMetrics } from "@/lib/projects/report-project-key-metrics";
import type { ReportProjectKeyMilestone } from "@/lib/projects/report-project-key-milestones";
import type { ReportProjectModuleStatusItem } from "@/lib/projects/report-project-module-status";
import type { ReportProjectSafetyOverview } from "@/lib/projects/report-project-safety-overview";
import type { ReportProjectSafetyStat } from "@/lib/projects/report-project-safety-stats";
import {
  formatReportScheduleDate,
  type ReportProjectScheduleOverview,
} from "@/lib/projects/report-project-schedule";
import type { ReportProjectTopRisk } from "@/lib/projects/report-project-top-risks";
import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";
import {
  REPORT_EXCEL_ACCEPTED_RAG,
  REPORT_EXCEL_CASHFLOW_SERIES,
  REPORT_EXCEL_DATA_SHEETS,
  REPORT_EXCEL_DEFAULT_TREND,
  REPORT_EXCEL_MODULE_STATUS_FIELDS,
  REPORT_EXCEL_REQUIRED_COLUMNS,
  type ReportExcelDataSheetName,
} from "@/lib/report-upload/report-excel-template";
import type { ReportSnapshotPayload } from "@/lib/report-upload/report-snapshot-payload";

export type ReportExcelParseError = {
  sheet: string;
  row?: number;
  column?: string;
  message: string;
};

export type ReportExcelParseResult =
  | { ok: true; payload: ReportSnapshotPayload }
  | { ok: false; errors: ReportExcelParseError[] };

const CASHFLOW_COLORS: Record<string, string> = {
  Commitment: "#4472C4",
  "Off-Ramp": "#ED7D31",
  Actuals: "#548235",
};

const TABLE_START_MARKERS = new Set([
  "Metric",
  "WBS Code",
  "Milestone",
  "Category",
  "Title",
  "Month",
  "Module",
]);

function isRowEmpty(cells: unknown[]): boolean {
  return cells.every((cell) => cell === undefined || cell === null || String(cell).trim() === "");
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim();
}

/** Trim field / metric labels before dictionary lookup. */
function normalizeFieldName(value: unknown): string {
  return normalizeHeader(value);
}

function sheetToRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
}

function normalizeCellString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

type ReportExcelDateFormat = "iso" | "display" | "month";

const CASHFLOW_MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatUtcDateParts(
  year: number,
  monthIndex: number,
  day: number,
  output: ReportExcelDateFormat,
): string {
  if (output === "iso") {
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const date = new Date(Date.UTC(year, monthIndex, day));

  if (output === "display") {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return `${CASHFLOW_MONTH_ABBR[monthIndex]} ${String(year).slice(-2)}`;
}

function parseExcelSerialDate(serial: number, output: ReportExcelDateFormat): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;

  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;

  return formatUtcDateParts(parsed.y, parsed.m - 1, parsed.d, output);
}

function parseExcelDateCell(value: unknown, output: ReportExcelDateFormat): string | null {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatUtcDateParts(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      output,
    );
  }

  if (typeof value === "number") {
    const fromSerial = parseExcelSerialDate(value, output);
    if (fromSerial) return fromSerial;
  }

  const trimmed = normalizeCellString(value);
  if (!trimmed) return null;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const fromSerial = parseExcelSerialDate(Number(trimmed), output);
    if (fromSerial) return fromSerial;
  }

  if (output === "iso" && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatUtcDateParts(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      output,
    );
  }

  return output === "display" || output === "month" ? trimmed : null;
}

function lookupFieldValue(values: Record<string, unknown>, fieldName: string): unknown {
  const normalized = normalizeFieldName(fieldName);
  const match = Object.keys(values).find((key) => normalizeFieldName(key) === normalized);
  return match ? values[match] : undefined;
}

function findHeaderRowIndex(rows: unknown[][], requiredHeaders: readonly string[]): number {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const normalized = row.map(normalizeHeader);
    if (
      requiredHeaders.every((header) =>
        normalized.includes(normalizeFieldName(header)),
      )
    ) {
      return index;
    }
  }
  return -1;
}

function columnIndex(headers: string[], name: string): number {
  return headers.findIndex(
    (header) => normalizeFieldName(header) === normalizeFieldName(name),
  );
}

function normalizeRag(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Green";
  if (trimmed.toLowerCase() === "yellow") return "Amber";
  const match = REPORT_EXCEL_ACCEPTED_RAG.find(
    (rag) => rag.toLowerCase() === trimmed.toLowerCase(),
  );
  return match === "Yellow" ? "Amber" : (match ?? trimmed);
}

function defaultTrend(): ReportProjectTrend {
  return { ...REPORT_EXCEL_DEFAULT_TREND };
}

function parseNumber(value: string, fallback = 0): number {
  const cleaned = value.replace(/[$£€,\s]/g, "").trim();
  if (!cleaned || cleaned === "—" || cleaned === "-") return fallback;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseFieldValueSheet(rows: unknown[][]): Record<string, unknown> {
  const headerIndex = findHeaderRowIndex(rows, ["Field", "Value"]);
  if (headerIndex < 0) return {};

  const headers = (rows[headerIndex] ?? []).map(normalizeHeader);
  const fieldCol = columnIndex(headers, "Field");
  const valueCol = columnIndex(headers, "Value");
  const values: Record<string, unknown> = {};

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (isRowEmpty(row)) continue;

    const field = normalizeFieldName(row[fieldCol]);
    if (!field || field === "Field" || TABLE_START_MARKERS.has(field)) {
      break;
    }

    values[field] = row[valueCol];
  }

  return values;
}

function validateRequiredSheets(
  sheetNames: string[],
  errors: ReportExcelParseError[],
): void {
  for (const required of REPORT_EXCEL_DATA_SHEETS) {
    if (!sheetNames.includes(required)) {
      errors.push({
        sheet: required,
        message: `Required sheet "${required}" is missing from the workbook.`,
      });
    }
  }
}

function validateSheetColumns(
  sheetName: ReportExcelDataSheetName,
  rows: unknown[][],
  errors: ReportExcelParseError[],
): void {
  const required = REPORT_EXCEL_REQUIRED_COLUMNS[sheetName];
  const headerIndex = findHeaderRowIndex(rows, required);

  if (headerIndex < 0) {
    errors.push({
      sheet: sheetName,
      message: `Required header row is missing. Expected columns: ${required.join(", ")}.`,
    });
  }
}

function parseProjectMetaSheet(rows: unknown[][]): Pick<
  ReportProjectKeyMetrics,
  "siteItLoad" | "deploymentCurrent" | "deploymentTotal" | "customerStatus"
> {
  const values = parseFieldValueSheet(rows);
  const deploymentItLoad = normalizeCellString(lookupFieldValue(values, "Deployment IT Load"));

  return {
    siteItLoad: normalizeCellString(lookupFieldValue(values, "Site IT Load")),
    deploymentCurrent: deploymentItLoad,
    deploymentTotal: deploymentItLoad,
    customerStatus: normalizeCellString(lookupFieldValue(values, "Customer Status")),
  };
}

function deriveStatusContributors(moduleStatus: ReportProjectModuleStatusItem[]): string[] {
  return moduleStatus
    .filter((item) => {
      const rag = item.status.toLowerCase();
      return rag === "amber" || rag === "red" || rag === "yellow";
    })
    .map((item) => item.label);
}

function parseStatusSheet(
  rows: unknown[][],
  projectMeta: ReturnType<typeof parseProjectMetaSheet>,
  errors: ReportExcelParseError[],
): {
  reportingDate: string;
  isLatest: boolean;
  keyMetrics: ReportProjectKeyMetrics;
  moduleStatus: ReportProjectModuleStatusItem[];
  costStatusRag: string;
  scheduleStatusRag: string;
} {
  const values = parseFieldValueSheet(rows);

  const reportingDate = parseExcelDateCell(
    lookupFieldValue(values, "Reporting Date"),
    "iso",
  );
  if (!reportingDate) {
    errors.push({
      sheet: "Status",
      column: "Reporting Date",
      message: "Reporting Date is required and must be a valid date.",
    });
  }

  const moduleStatus: ReportProjectModuleStatusItem[] = REPORT_EXCEL_MODULE_STATUS_FIELDS.map(
    ({ field, label }) => ({
      label,
      status: normalizeRag(normalizeCellString(lookupFieldValue(values, field)) || "Green"),
      trend: defaultTrend(),
    }),
  );

  const overallStatus = normalizeRag(
    normalizeCellString(lookupFieldValue(values, "Overall Status")) || "Green",
  );

  return {
    reportingDate: reportingDate ?? "",
    isLatest: true,
    costStatusRag: normalizeRag(
      normalizeCellString(lookupFieldValue(values, "Cost Status")) || "Green",
    ),
    scheduleStatusRag: normalizeRag(
      normalizeCellString(lookupFieldValue(values, "Schedule Status")) || "Green",
    ),
    moduleStatus,
    keyMetrics: {
      status: overallStatus,
      statusTrend: defaultTrend(),
      statusContributors: deriveStatusContributors(moduleStatus),
      rfs: "",
      ...projectMeta,
    },
  };
}

function parseScheduleSheet(
  rows: unknown[][],
  scheduleStatusRag: string,
): ReportProjectScheduleOverview {
  const values = parseFieldValueSheet(rows);

  const baselineRfs =
    parseExcelDateCell(lookupFieldValue(values, "Target RFS"), "iso") ?? "";
  const forecastRfs =
    parseExcelDateCell(lookupFieldValue(values, "Current RFS"), "iso") ?? "";

  return {
    baselineRfs,
    forecastRfs,
    lastReportForecastRfs: forecastRfs,
    status: scheduleStatusRag,
    trend: defaultTrend(),
  };
}

function parseMilestonesSheet(rows: unknown[][]): ReportProjectKeyMilestone[] {
  const headerIndex = findHeaderRowIndex(rows, ["Milestone", "Forecast Date", "Status"]);
  if (headerIndex < 0) return [];

  const headers = (rows[headerIndex] ?? []).map(normalizeHeader);
  const milestoneCol = columnIndex(headers, "Milestone");
  const dateCol = columnIndex(headers, "Forecast Date");
  const statusCol = columnIndex(headers, "Status");
  const milestones: ReportProjectKeyMilestone[] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (isRowEmpty(row)) continue;

    const milestone = normalizeFieldName(row[milestoneCol]);
    if (!milestone) continue;

    const forecastDate =
      parseExcelDateCell(row[dateCol], "display") ??
      normalizeCellString(row[dateCol]);

    milestones.push({
      id: `milestone-${milestones.length + 1}`,
      milestone,
      forecastDate,
      status: normalizeCellString(row[statusCol]),
    });
  }

  return milestones;
}

function isRagDisplayOverride(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return lower === "rag" || lower === "status";
}

function lookupMetricValue(values: Record<string, unknown>, metricName: string): unknown {
  const normalized = normalizeFieldName(metricName);
  const match = Object.keys(values).find((key) => normalizeFieldName(key) === normalized);
  return match ? values[match] : undefined;
}

function parseSafetyStatsSheet(
  rows: unknown[][],
  safetyStatusRag: string,
): {
  safetyOverview: ReportProjectSafetyOverview;
  safetyStats: ReportProjectSafetyStat[];
} {
  const headerIndex = findHeaderRowIndex(rows, ["Metric", "Value", "Display Override"]);
  const safetyStats: ReportProjectSafetyStat[] = [];
  const metricValues: Record<string, unknown> = {};

  if (headerIndex >= 0) {
    const headers = (rows[headerIndex] ?? []).map(normalizeHeader);
    const metricCol = columnIndex(headers, "Metric");
    const valueCol = columnIndex(headers, "Value");
    const displayCol = columnIndex(headers, "Display Override");

    for (let index = headerIndex + 1; index < rows.length; index += 1) {
      const row = rows[index] ?? [];
      if (isRowEmpty(row)) continue;

      const metric = normalizeFieldName(row[metricCol]);
      if (!metric) continue;

      const rawValue = normalizeCellString(row[valueCol]);
      const displayOverride = normalizeCellString(row[displayCol]);
      const useRag = isRagDisplayOverride(displayOverride);

      metricValues[metric] = row[valueCol];
      safetyStats.push({
        label: metric,
        value: useRag ? normalizeRag(rawValue) : rawValue,
        display: useRag ? "rag" : undefined,
      });
    }
  }

  const targetLtifr = parseNumber(
    normalizeCellString(lookupMetricValue(metricValues, "Target LTIFR")),
    0,
  );
  const currentLtifr = parseNumber(
    normalizeCellString(
      lookupMetricValue(metricValues, "LTIFR") ??
        lookupMetricValue(metricValues, "Current LTIFR"),
    ),
    0,
  );
  const lastReportLtifr = parseNumber(
    normalizeCellString(lookupMetricValue(metricValues, "Last Report LTIFR")),
    currentLtifr,
  );

  const safetyOverview: ReportProjectSafetyOverview = {
    targetLtifr,
    currentLtifr,
    lastReportLtifr,
    status: safetyStatusRag,
    trend: defaultTrend(),
  };

  if (!safetyStats.some((stat) => stat.label.toLowerCase() === "safety status")) {
    safetyStats.unshift({
      label: "Safety status",
      value: safetyStatusRag,
      display: "rag",
    });
  }

  return { safetyOverview, safetyStats };
}

function parseCategoryStatusSheet(rows: unknown[][]): ReportProjectCategoryRow[] {
  const headerIndex = findHeaderRowIndex(rows, ["Category", "Status", "Summary"]);
  if (headerIndex < 0) return [];

  const headers = (rows[headerIndex] ?? []).map(normalizeHeader);
  const categoryCol = columnIndex(headers, "Category");
  const statusCol = columnIndex(headers, "Status");
  const summaryCol = columnIndex(headers, "Summary");
  const categories: ReportProjectCategoryRow[] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (isRowEmpty(row)) continue;

    const category = normalizeFieldName(row[categoryCol]);
    if (!category) continue;

    categories.push({
      id: `category-${slugify(category)}`,
      category,
      status: normalizeRag(normalizeCellString(row[statusCol])),
      summary: normalizeCellString(row[summaryCol]),
      trend: defaultTrend(),
    });
  }

  return categories;
}

function riskLevelsFromStatus(status: string): { likelihood: string; impact: string } {
  const rag = normalizeRag(status).toLowerCase();
  if (rag === "red") return { likelihood: "High", impact: "High" };
  if (rag === "amber") return { likelihood: "Medium", impact: "Medium" };
  return { likelihood: "Low", impact: "Low" };
}

function parseTopRisksSheet(rows: unknown[][]): ReportProjectTopRisk[] {
  const headerIndex = findHeaderRowIndex(rows, ["Title", "Description", "Category", "Status"]);
  if (headerIndex < 0) return [];

  const headers = (rows[headerIndex] ?? []).map(normalizeHeader);
  const titleCol = columnIndex(headers, "Title");
  const descriptionCol = columnIndex(headers, "Description");
  const categoryCol = columnIndex(headers, "Category");
  const statusCol = columnIndex(headers, "Status");
  const risks: ReportProjectTopRisk[] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (isRowEmpty(row)) continue;

    const title = normalizeFieldName(row[titleCol]);
    if (!title) continue;

    const status = normalizeCellString(row[statusCol]);
    const { likelihood, impact } = riskLevelsFromStatus(status);

    risks.push({
      id: `risk-${risks.length + 1}`,
      title,
      description: normalizeCellString(row[descriptionCol]),
      category: normalizeCellString(row[categoryCol]),
      likelihood,
      impact,
      comment: "",
      trend: defaultTrend(),
    });
  }

  return risks;
}

function parseCostSummarySheet(
  rows: unknown[][],
  costStatusRag: string,
  errors: ReportExcelParseError[],
): { budget: ReportProjectBudget; cost: ReportProjectCostData } {
  const headerIndex = findHeaderRowIndex(rows, [
    "WBS Code",
    "WBS Description",
    "Approved Budget",
    "Current Forecast",
    "Current Committed",
  ]);

  const wbsOptions: ReportProjectCostWbsOption[] = [];
  const directRows: ReportProjectCostSummaryDirectRow[] = [];

  if (headerIndex >= 0) {
    const headers = (rows[headerIndex] ?? []).map(normalizeHeader);
    const codeCol = columnIndex(headers, "WBS Code");
    const descCol = columnIndex(headers, "WBS Description");
    const approvedCol = columnIndex(headers, "Approved Budget");
    const forecastCol = columnIndex(headers, "Current Forecast");
    const committedCol = columnIndex(headers, "Current Committed");

    for (let index = headerIndex + 1; index < rows.length; index += 1) {
      const row = rows[index] ?? [];
      if (isRowEmpty(row)) continue;

      const code = normalizeFieldName(row[codeCol]);
      if (!code) continue;

      const wbsId = `wbs-${code.replace(/\./g, "-")}`;
      const approvedBudget = parseNumber(normalizeCellString(row[approvedCol]));
      const currentForecast = parseNumber(normalizeCellString(row[forecastCol]));
      const currentCommitted = parseNumber(normalizeCellString(row[committedCol]));
      const currentUncommitted = Math.max(0, currentForecast - currentCommitted);

      wbsOptions.push({
        id: wbsId,
        code,
        description: normalizeCellString(row[descCol]),
        parentWbsId: null,
        sortOrder: wbsOptions.length,
      });

      directRows.push({
        id: `cs-${code.replace(/\./g, "-")}`,
        wbsId,
        approvedBudget,
        currentForecast,
        currentCommitted,
        currentUncommitted,
      });
    }
  } else {
    errors.push({
      sheet: "Cost Summary",
      message:
        "Required header row is missing. Expected columns: WBS Code, WBS Description, Approved Budget, Current Forecast, Current Committed.",
    });
  }

  const costSummaryData = { wbsOptions, directRows };
  const totals = getReportProjectCostWbsSummaryTotals(costSummaryData);
  const normalisedBudget = getReportProjectCostNormalisedForecast(costSummaryData);
  const costTrend = defaultTrend();

  const budget: ReportProjectBudget = {
    approvedBudget: totals.approvedBudget,
    currentForecast: totals.currentForecast,
    lastReportForecast: totals.currentForecast,
    currencySymbol: "$",
    status: costStatusRag,
    trend: costTrend,
  };

  const cost: ReportProjectCostData = {
    summary: {
      currentBudget: totals.approvedBudget,
      normalisedBudget,
      forecastFinalAccount: totals.currentForecast,
      spentToDate: 0,
      deploymentSizeMw: 0,
      currencySymbol: "$",
      status: costStatusRag,
      trend: costTrend,
    },
    costSummary: costSummaryData,
    cashflow: [],
  };

  return { budget, cost };
}

type CashflowMonthParts = { year: number; monthIndex: number };

function parseCashflowMonthKey(key: string): CashflowMonthParts | null {
  const match = key.trim().match(/^([A-Za-z]{3})\s+(\d{2})$/);
  if (!match) return null;

  const monthIndex = CASHFLOW_MONTH_ABBR.findIndex(
    (month) => month.toLowerCase() === match[1].toLowerCase(),
  );
  if (monthIndex < 0) return null;

  return { year: 2000 + Number(match[2]), monthIndex };
}

function formatCashflowMonthKey(parts: CashflowMonthParts): string {
  return `${CASHFLOW_MONTH_ABBR[parts.monthIndex]} ${String(parts.year).slice(-2)}`;
}

function compareCashflowMonths(a: CashflowMonthParts, b: CashflowMonthParts): number {
  return a.year * 12 + a.monthIndex - (b.year * 12 + b.monthIndex);
}

function collectSortedCashflowMonthKeys(
  bySeries: Record<string, { key: string; value: number }[]>,
): string[] {
  const uniqueKeys = new Map<string, CashflowMonthParts>();

  for (const points of Object.values(bySeries)) {
    for (const point of points) {
      const parts = parseCashflowMonthKey(point.key);
      if (!parts || uniqueKeys.has(point.key)) continue;
      uniqueKeys.set(point.key, parts);
    }
  }

  return [...uniqueKeys.entries()]
    .sort(([, a], [, b]) => compareCashflowMonths(a, b))
    .map(([key]) => key);
}

function reportingDateToCashflowMonthKey(reportingDateIso: string): string | null {
  const [year, month, day] = reportingDateIso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return formatCashflowMonthKey({ year, monthIndex: month - 1 });
}

/** Workbook cashflow values are monthly amounts — sum into a running cumulative total. */
function buildCashflowSeriesPoints(
  monthKeys: string[],
  sparsePoints: { key: string; value: number }[],
): { key: string; value: number }[] {
  const monthlyByKey = new Map(sparsePoints.map((point) => [point.key, point.value]));
  let runningTotal = 0;

  return monthKeys.map((key) => {
    if (monthlyByKey.has(key)) {
      runningTotal += monthlyByKey.get(key)!;
    }
    return { key, value: runningTotal };
  });
}

function parseCashflowSheet(
  rows: unknown[][],
  reportingDateIso?: string,
): ReportProjectCashflowSeries[] {
  const headerIndex = findHeaderRowIndex(rows, ["Month", "Commitment", "Off-Ramp", "Actuals"]);
  if (headerIndex < 0) return [];

  const headers = (rows[headerIndex] ?? []).map(normalizeHeader);
  const monthCol = columnIndex(headers, "Month");
  const commitmentCol = columnIndex(headers, "Commitment");
  const offRampCol = columnIndex(headers, "Off-Ramp");
  const actualsCol = columnIndex(headers, "Actuals");

  const bySeries: Record<string, { key: string; value: number }[]> = {
    Commitment: [],
    "Off-Ramp": [],
    Actuals: [],
  };

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (isRowEmpty(row)) continue;

    const month =
      parseExcelDateCell(row[monthCol], "month") ?? normalizeCellString(row[monthCol]);
    if (!month) continue;

    bySeries.Commitment.push({
      key: month,
      value: parseNumber(normalizeCellString(row[commitmentCol])),
    });
    bySeries["Off-Ramp"].push({
      key: month,
      value: parseNumber(normalizeCellString(row[offRampCol])),
    });
    bySeries.Actuals.push({
      key: month,
      value: parseNumber(normalizeCellString(row[actualsCol])),
    });
  }

  const monthKeys = collectSortedCashflowMonthKeys(bySeries);
  if (monthKeys.length === 0) {
    return [];
  }

  const reportingMonthKey = reportingDateIso
    ? reportingDateToCashflowMonthKey(reportingDateIso)
    : null;
  const forecastFromIndex =
    reportingMonthKey != null ? monthKeys.indexOf(reportingMonthKey) : -1;

  return REPORT_EXCEL_CASHFLOW_SERIES.map((label) => ({
    label,
    color: CASHFLOW_COLORS[label],
    fillUnder: label === "Actuals",
    forecastFromIndex: forecastFromIndex >= 0 ? forecastFromIndex : undefined,
    data: buildCashflowSeriesPoints(monthKeys, bySeries[label] ?? []),
  })).filter((series) => series.data.length > 0);
}

export function enrichPayloadWithPriorSnapshot(
  payload: ReportSnapshotPayload,
  prior: ReportSnapshotPayload | null,
): ReportSnapshotPayload {
  if (!prior) return payload;

  return {
    ...payload,
    schedule: {
      ...payload.schedule,
      lastReportForecastRfs: prior.schedule.forecastRfs,
    },
    safetyOverview: {
      ...payload.safetyOverview,
      lastReportLtifr: prior.safetyOverview.currentLtifr,
    },
    budget: {
      ...payload.budget,
      lastReportForecast: prior.budget.currentForecast,
    },
    cost: {
      ...payload.cost,
      summary: {
        ...payload.cost.summary,
        lastReport: {
          approvedBudget: prior.cost.summary.currentBudget,
          currentForecast: getReportProjectCostWbsSummaryTotals(prior.cost.costSummary)
            .currentForecast,
          normalisedForecast: prior.cost.summary.normalisedBudget,
          spentToDate: prior.cost.summary.spentToDate,
        },
      },
    },
  };
}

export function parseReportExcel(
  input: ArrayBuffer | Buffer,
  priorSnapshot?: ReportSnapshotPayload | null,
): ReportExcelParseResult {
  const errors: ReportExcelParseError[] = [];
  const workbook = XLSX.read(input, { type: "array" });

  validateRequiredSheets(workbook.SheetNames, errors);

  const sheets: Partial<Record<ReportExcelDataSheetName, unknown[][]>> = {};
  for (const sheetName of REPORT_EXCEL_DATA_SHEETS) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const rows = sheetToRows(worksheet);
    sheets[sheetName] = rows;
    validateSheetColumns(sheetName, rows, errors);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const projectMeta = parseProjectMetaSheet(sheets["Project Meta"] ?? []);
  const status = parseStatusSheet(sheets.Status ?? [], projectMeta, errors);
  if (!status.reportingDate) {
    return { ok: false, errors };
  }

  const schedule = parseScheduleSheet(sheets.Schedule ?? [], status.scheduleStatusRag);
  const milestones = parseMilestonesSheet(sheets["Key Milestones"] ?? []);
  const safetyStatusRag =
    status.moduleStatus.find((item) => item.label === "Safety")?.status ?? "Green";
  const { safetyOverview, safetyStats } = parseSafetyStatsSheet(
    sheets["Safety Stats"] ?? [],
    safetyStatusRag,
  );
  const categories = parseCategoryStatusSheet(sheets["Category Status"] ?? []);
  const topRisks = parseTopRisksSheet(sheets["Top Risks"] ?? []);
  const { budget, cost } = parseCostSummarySheet(
    sheets["Cost Summary"] ?? [],
    status.costStatusRag,
    errors,
  );
  const cashflow = parseCashflowSheet(sheets.Cashflow ?? [], status.reportingDate);
  cost.cashflow = cashflow;

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const keyMetrics: ReportProjectKeyMetrics = {
    ...status.keyMetrics,
    rfs: schedule.baselineRfs
      ? formatReportScheduleDate(schedule.baselineRfs)
      : status.keyMetrics.rfs,
  };

  let payload: ReportSnapshotPayload = {
    reportingDate: status.reportingDate,
    isLatest: status.isLatest,
    keyMetrics,
    moduleStatus: status.moduleStatus,
    schedule,
    milestones,
    safetyOverview,
    safetyStats,
    categories,
    topRisks,
    budget,
    cost,
  };

  payload = enrichPayloadWithPriorSnapshot(payload, priorSnapshot ?? null);

  return { ok: true, payload };
}
