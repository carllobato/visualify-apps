import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectScheduleOverview = {
  baselineRfs: string;
  forecastRfs: string;
  lastReportForecastRfs: string;
  status?: string;
  trend: ReportProjectTrend;
};

/** Placeholder until report Excel upload supplies schedule data. */
export const REPORT_PROJECT_SCHEDULE_OVERVIEW_PLACEHOLDER: ReportProjectScheduleOverview = {
  baselineRfs: "2026-09-24",
  forecastRfs: "2026-09-18",
  lastReportForecastRfs: "2026-09-04",
  status: "Green",
  trend: { text: "2 weeks behind vs last report", sentiment: "unfavorable" },
};

export function getReportScheduleMovementSinceLastReport(
  overview: ReportProjectScheduleOverview,
): number {
  const lastReport = parseReportScheduleDate(overview.lastReportForecastRfs);
  const forecast = parseReportScheduleDate(overview.forecastRfs);
  return countReportScheduleWorkingDaysBetween(lastReport, forecast);
}

function parseReportScheduleDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatReportScheduleDate(isoDate: string, month: "short" | "long" = "short"): string {
  return parseReportScheduleDate(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month,
    year: "numeric",
  });
}

function isReportScheduleWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function countReportScheduleWorkingDaysBetween(start: Date, end: Date): number {
  const sign = end >= start ? 1 : -1;
  const from = sign > 0 ? start : end;
  const to = sign > 0 ? end : start;

  let count = 0;
  const current = new Date(from);
  current.setDate(current.getDate() + 1);

  while (current <= to) {
    if (isReportScheduleWorkingDay(current)) count++;
    current.setDate(current.getDate() + 1);
  }

  return count * sign;
}

export function getReportScheduleVarianceDays(overview: ReportProjectScheduleOverview): number {
  const baseline = parseReportScheduleDate(overview.baselineRfs);
  const forecast = parseReportScheduleDate(overview.forecastRfs);
  return countReportScheduleWorkingDaysBetween(baseline, forecast);
}

export function getReportScheduleRagStatus(overview: ReportProjectScheduleOverview): string {
  if (overview.status) return overview.status;

  const varianceDays = getReportScheduleVarianceDays(overview);
  if (varianceDays <= 0) return "Green";
  if (varianceDays <= 10) return "Amber";
  return "Red";
}

export function isReportScheduleDelayed(overview: ReportProjectScheduleOverview): boolean {
  return getReportScheduleVarianceDays(overview) > 0;
}

export function formatReportScheduleVarianceDays(days: number): string {
  const label = Math.abs(days) === 1 ? "working day" : "working days";
  if (days > 0) return `+${days} ${label}`;
  if (days < 0) return `${days} ${label}`;
  return `0 ${label}`;
}

export function getReportScheduleVarianceToneClass(overview: ReportProjectScheduleOverview): string {
  if (!isReportScheduleDelayed(overview)) {
    return "text-[var(--ds-status-success-fg)]";
  }

  const ragStatus = getReportScheduleRagStatus(overview).toLowerCase();
  if (ragStatus === "red") {
    return "text-[var(--ds-status-danger-fg)]";
  }

  return "text-[var(--ds-status-warning-fg)]";
}
