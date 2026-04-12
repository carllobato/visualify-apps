import { formatReportMonthLabel } from "@/lib/db/snapshots";

/** Build YYYY-MM for a given local calendar date. */
export function toReportingMonthYearKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Month options for portfolio reporting: 24 months back through 12 months forward from `now`. */
export function getReportingMonthYearOptions(now = new Date()): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let i = -24; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = toReportingMonthYearKey(d);
    options.push({ value, label: formatReportMonthLabel(value) });
  }
  return options;
}

export const PORTFOLIO_REPORTING_MONTH_QUERY_PARAM = "reportingMonth";

export function isValidReportingMonthYearKey(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s);
}

/** Previous or next calendar month as `YYYY-MM`; returns `null` if `key` is invalid. */
export function addReportingMonthYearKey(key: string, monthDelta: number): string | null {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  const d = new Date(y, mo - 1 + monthDelta, 1);
  return toReportingMonthYearKey(d);
}

/**
 * Distinct `YYYY-MM` keys from `report_month` column values, newest first (same rule as the reporting month dropdown).
 */
export function collectDistinctReportingMonthYearKeys(
  rows: ReadonlyArray<{ report_month?: string | null }>
): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    const rm = row.report_month;
    if (rm == null || typeof rm !== "string") continue;
    const ym = rm.slice(0, 7);
    if (isValidReportingMonthYearKey(ym)) keys.add(ym);
  }
  return [...keys].sort((a, b) => b.localeCompare(a));
}
