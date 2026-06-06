"use client";

import type { ReactNode } from "react";
import { appShellPageTitleClassName, shellPageHeaderRailRowClassName } from "@visualify/app-shell";
import { ReportProjectReportingDateSelect } from "@/components/project/report/ReportProjectReportingDateSelect";
import {
  REPORT_PROJECT_REPORTING_PERIODS_PLACEHOLDER,
  resolveReportProjectReportingPeriod,
  type ReportProjectReportingPeriod,
} from "@/lib/projects/report-project-reporting-date";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

export type ReportProjectPageLayoutProps = {
  project: ReportProjectListItem;
  children: ReactNode;
  /** When true, content uses the full scroll region width (no max-width cap). */
  contentFullWidth?: boolean;
  /** Optional trailing chrome in the page header row. */
  headerTrailing?: ReactNode;
  /** ISO date (yyyy-mm-dd) for the selected board report period. */
  reportingDate?: string | null;
  /** Available reporting periods, newest first. */
  reportingPeriods?: ReportProjectReportingPeriod[];
  /** Called when the user selects a different reporting period. */
  onReportingDateChange?: (isoDate: string) => void;
};

function formatReportProjectDisplayName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Untitled project";
  const withoutSuffix = trimmed.replace(/\s*\(ControlAI\)\s*$/i, "").trim();
  return withoutSuffix || "Untitled project";
}

/**
 * Report project-page chrome: title and neutral content slot.
 * Project-level navigation lives in the app shell rail; tab sub-navigation belongs in `children`.
 */
export function ReportProjectPageLayout({
  project,
  children,
  contentFullWidth = false,
  headerTrailing,
  reportingDate,
  reportingPeriods = REPORT_PROJECT_REPORTING_PERIODS_PLACEHOLDER,
  onReportingDateChange,
}: ReportProjectPageLayoutProps) {
  const displayName = formatReportProjectDisplayName(project.name);
  const selectedPeriod = resolveReportProjectReportingPeriod(reportingDate, reportingPeriods);
  const showReportingDateSelect =
    reportingPeriods.length > 0 && onReportingDateChange != null;
  const contentClassName = contentFullWidth
    ? "flex w-full min-w-0 flex-col"
    : "mx-auto flex w-full min-w-0 max-w-[90rem] flex-col";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className={shellPageHeaderRailRowClassName}>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2">
              <h1 className={`min-w-0 truncate ${appShellPageTitleClassName}`}>{displayName}</h1>
              {showReportingDateSelect ? (
                <>
                  <span
                    className="shrink-0 font-normal text-[var(--ds-text-muted)]"
                    aria-hidden
                  >
                    |
                  </span>
                  <ReportProjectReportingDateSelect
                    id="report-project-reporting-date"
                    periods={reportingPeriods}
                    value={selectedPeriod.isoDate}
                    onChange={onReportingDateChange}
                  />
                </>
              ) : null}
            </div>
          </div>
          {headerTrailing ? (
            <div className={`${shellPageHeaderRailRowClassName} shrink-0 justify-end`}>
              {headerTrailing}
            </div>
          ) : null}
        </div>
        <div
          className="h-px w-full shrink-0 bg-[var(--ds-border-subtle)]"
          role="separator"
          aria-hidden="true"
        />
      </header>

      <div className="min-h-0 min-w-0 flex-1 pt-1 pb-4">
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}
