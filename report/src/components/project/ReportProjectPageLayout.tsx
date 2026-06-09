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
    <div className="report-project-page flex min-w-0 flex-1 flex-col max-md:overflow-x-visible">
      <header className="flex shrink-0 flex-col gap-1 max-md:gap-0">
        <div className="flex flex-col gap-y-1 max-md:min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
          <div className={`${shellPageHeaderRailRowClassName} max-md:h-auto max-md:min-h-0`}>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 max-md:gap-x-1.5">
              <h1
                className={[
                  "min-w-0 truncate",
                  appShellPageTitleClassName,
                  "max-md:!text-[length:var(--ds-text-lg)] max-md:!font-medium max-md:!leading-snug",
                ].join(" ")}
              >
                {displayName}
              </h1>
              {showReportingDateSelect ? (
                <>
                  <span
                    className="shrink-0 font-normal text-[var(--ds-text-muted)] max-md:text-[length:var(--ds-text-xs)]"
                    aria-hidden
                  >
                    |
                  </span>
                  <div className="max-md:text-[length:var(--ds-text-sm)]">
                    <ReportProjectReportingDateSelect
                      id="report-project-reporting-date"
                      periods={reportingPeriods}
                      value={selectedPeriod.isoDate}
                      onChange={onReportingDateChange}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
          {headerTrailing ? (
            <div
              className={[
                shellPageHeaderRailRowClassName,
                "shrink-0 justify-end max-md:justify-start max-md:h-auto max-md:min-h-0",
                "max-md:w-full max-md:min-w-0 max-md:overflow-x-auto max-md:overflow-y-hidden max-md:overscroll-x-contain",
              ].join(" ")}
            >
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

      <div className="report-project-page-body min-w-0 flex-1 md:pt-1 md:pb-4">
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}
