import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectSafetyOverview = {
  targetLtifr: number;
  currentLtifr: number;
  lastReportLtifr: number;
  status?: string;
  trend: ReportProjectTrend;
};

/** Placeholder until report Excel upload supplies safety data. */
export const REPORT_PROJECT_SAFETY_OVERVIEW_PLACEHOLDER: ReportProjectSafetyOverview = {
  targetLtifr: 0.15,
  currentLtifr: 0.12,
  lastReportLtifr: 0.15,
  status: "Green",
  trend: { text: "Improved vs last report", sentiment: "favorable" },
};

export function getReportSafetyMovementSinceLastReport(overview: ReportProjectSafetyOverview): number {
  return overview.currentLtifr - overview.lastReportLtifr;
}

export function formatReportSafetyMovementSinceLastReport(movement: number): string {
  const rounded = Math.round(movement * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(2)}`;
}

export function getReportSafetyLtifrVariance(overview: ReportProjectSafetyOverview): number {
  return overview.currentLtifr - overview.targetLtifr;
}

export function getReportSafetyRagStatus(overview: ReportProjectSafetyOverview): string {
  if (overview.status) return overview.status;

  const variance = getReportSafetyLtifrVariance(overview);
  if (variance <= 0) return "Green";
  if (variance <= 0.05) return "Amber";
  return "Red";
}

export function isReportSafetyAboveTarget(overview: ReportProjectSafetyOverview): boolean {
  return overview.currentLtifr > overview.targetLtifr;
}

export function formatReportSafetyLtifr(value: number): string {
  return value.toFixed(2);
}

export function formatReportSafetyLtifrVariance(variance: number): string {
  const rounded = Math.round(variance * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(2)}`;
}

export function getReportSafetyVarianceToneClass(overview: ReportProjectSafetyOverview): string {
  if (!isReportSafetyAboveTarget(overview)) {
    return "text-[var(--ds-status-success-fg)]";
  }

  const ragStatus = getReportSafetyRagStatus(overview).toLowerCase();
  if (ragStatus === "red") {
    return "text-[var(--ds-status-danger-fg)]";
  }

  return "text-[var(--ds-status-warning-fg)]";
}
