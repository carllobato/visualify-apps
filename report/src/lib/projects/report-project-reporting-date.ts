export type ReportProjectReportingPeriod = {
  isoDate: string;
  isLatest?: boolean;
};

/** Placeholder until report Excel upload supplies reporting periods. */
export const REPORT_PROJECT_REPORTING_PERIODS_PLACEHOLDER: ReportProjectReportingPeriod[] = [
  { isoDate: "2026-06-06", isLatest: true },
  { isoDate: "2026-05-07" },
  { isoDate: "2026-04-04" },
  { isoDate: "2026-03-06" },
  { isoDate: "2026-02-07" },
];

/** @deprecated Use {@link getLatestReportProjectReportingPeriod} instead. */
export const REPORT_PROJECT_REPORTING_DATE_PLACEHOLDER =
  REPORT_PROJECT_REPORTING_PERIODS_PLACEHOLDER[0]?.isoDate ?? "2026-06-06";

export function formatReportProjectReportingDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getLatestReportProjectReportingPeriod(
  periods: ReportProjectReportingPeriod[] = REPORT_PROJECT_REPORTING_PERIODS_PLACEHOLDER,
): ReportProjectReportingPeriod {
  return (
    periods.find((period) => period.isLatest) ??
    periods[0] ?? { isoDate: REPORT_PROJECT_REPORTING_DATE_PLACEHOLDER, isLatest: true }
  );
}

export function getReportProjectReportingPeriodByIsoDate(
  isoDate: string,
  periods: ReportProjectReportingPeriod[] = REPORT_PROJECT_REPORTING_PERIODS_PLACEHOLDER,
): ReportProjectReportingPeriod | null {
  const normalized = isoDate.trim();
  return periods.find((period) => period.isoDate === normalized) ?? null;
}

export function resolveReportProjectReportingPeriod(
  isoDate: string | null | undefined,
  periods: ReportProjectReportingPeriod[] = REPORT_PROJECT_REPORTING_PERIODS_PLACEHOLDER,
): ReportProjectReportingPeriod {
  return getReportProjectReportingPeriodByIsoDate(isoDate ?? "", periods) ?? getLatestReportProjectReportingPeriod(periods);
}
