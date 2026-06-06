import { Card, CardContent, Trend } from "@visualify/design-system";
import { Fragment } from "react";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import type { ReportModuleTabId } from "@/components/project/report/report-module-tabs";
import { REPORT_MODULE_TABS } from "@/components/project/report/report-module-tabs";
import type { ReportProjectKeyMetrics } from "@/lib/projects/report-project-key-metrics";
import {
  getReportModuleStatusTabId,
  type ReportProjectModuleStatusItem,
} from "@/lib/projects/report-project-module-status";

type ReportProjectModuleStatusCardProps = {
  items: ReportProjectModuleStatusItem[];
  projectStatus: Pick<ReportProjectKeyMetrics, "status" | "statusTrend" | "statusContributors">;
  onItemNavigate?: (tabId: ReportModuleTabId) => void;
  onItemHover?: (label: string) => void;
  onItemLeave?: () => void;
};

function overallStatusHighlightClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "green") {
    return "bg-[var(--ds-status-success-subtle-bg)]";
  }
  if (normalized === "amber" || normalized === "yellow") {
    return "bg-[var(--ds-status-warning-subtle-bg)]";
  }
  if (normalized === "red") {
    return "bg-[var(--ds-status-danger-subtle-bg)]";
  }
  return "bg-[var(--ds-status-neutral-subtle-bg)]";
}

const STATUS_MODULE_COLUMN_CLASS =
  "relative flex min-h-0 min-w-0 flex-col m-2 sm:m-3 rounded-[var(--ds-radius-md)] px-3 py-3 sm:min-w-0 sm:flex-1 sm:px-5 sm:py-4";

const STATUS_MODULE_INTERACTIVE_INSET_CLASS = "absolute inset-0 z-0";

const STATUS_MODULE_INTERACTIVE_OUTLINE_CLASS =
  "rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 transition-[outline-color,box-shadow,background-color] duration-150 ease-out hover:outline hover:outline-2 hover:outline-offset-0 hover:outline-[var(--ds-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--ds-primary)]";

const STATUS_MODULE_COLUMN_HOVER_OUTLINE_CLASS =
  "transition-[outline-color,box-shadow,background-color] duration-150 ease-out hover:outline hover:outline-2 hover:outline-offset-0 hover:outline-[var(--ds-primary)]";

const STATUS_MODULE_TITLE_CLASS =
  "shrink-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]";

function StatusModuleDivider() {
  return (
    <div aria-hidden className="hidden shrink-0 self-stretch py-3 sm:flex sm:flex-col sm:py-4">
      <div className="w-px flex-1 bg-[var(--ds-border-subtle)]" />
    </div>
  );
}

function StatusModuleColumn({
  label,
  status,
  trend,
  tabId,
  tabLabel,
  highlightClassName,
  columnClassName,
  onItemNavigate,
  onItemHover,
  onItemLeave,
}: {
  label: string;
  status: string;
  trend: ReportProjectModuleStatusItem["trend"];
  tabId?: ReportModuleTabId;
  tabLabel?: string;
  highlightClassName?: string;
  columnClassName?: string;
  onItemNavigate?: (tabId: ReportModuleTabId) => void;
  onItemHover?: (label: string) => void;
  onItemLeave?: () => void;
}) {
  const isInteractive = tabId != null && onItemNavigate != null;

  return (
    <div
      className={[
        STATUS_MODULE_COLUMN_CLASS,
        columnClassName,
        highlightClassName,
        !isInteractive ? STATUS_MODULE_COLUMN_HOVER_OUTLINE_CLASS : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={() => onItemHover?.(label)}
      onMouseLeave={() => onItemLeave?.()}
    >
      {isInteractive ? (
        <button
          type="button"
          onClick={() => onItemNavigate(tabId)}
          aria-label={`View ${label} — open ${tabLabel} tab`}
          className={[
            STATUS_MODULE_INTERACTIVE_INSET_CLASS,
            STATUS_MODULE_INTERACTIVE_OUTLINE_CLASS,
            "cursor-pointer",
          ].join(" ")}
        />
      ) : null}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col pointer-events-none">
        <span className={STATUS_MODULE_TITLE_CLASS}>{label}</span>
        <div className="flex min-h-14 flex-1 items-center justify-center gap-2 pt-2 pb-2">
          <ReportRagStatusDot status={status} showPhrase />
          <Trend sentiment={trend.sentiment}>{trend.text}</Trend>
        </div>
      </div>
    </div>
  );
}

export function ReportProjectModuleStatusCard({
  items,
  projectStatus,
  onItemNavigate,
  onItemHover,
  onItemLeave,
}: ReportProjectModuleStatusCardProps) {
  return (
    <Card className="flex h-full w-full min-w-0 flex-col overflow-visible">
      <CardContent className="flex flex-1 flex-col px-4 py-4 sm:p-0">
        <div className="grid min-h-0 flex-1 min-w-0 grid-cols-2 gap-x-4 gap-y-5 sm:hidden">
          {items.map((row) => {
            const tabId = getReportModuleStatusTabId(row.label);
            const tabLabel = REPORT_MODULE_TABS.find((tab) => tab.id === tabId)?.label ?? "tab";

            return (
              <StatusModuleColumn
                key={row.label}
                label={row.label}
                status={row.status}
                trend={row.trend}
                tabId={tabId}
                tabLabel={tabLabel}
                onItemNavigate={onItemNavigate}
                onItemHover={onItemHover}
                onItemLeave={onItemLeave}
              />
            );
          })}
          <StatusModuleColumn
            label="Overall Status"
            status={projectStatus.status}
            trend={projectStatus.statusTrend}
            highlightClassName={overallStatusHighlightClass(projectStatus.status)}
            columnClassName="col-span-2"
            onItemHover={onItemHover}
            onItemLeave={onItemLeave}
          />
        </div>

        <div className="hidden min-h-0 flex-1 min-w-0 items-stretch sm:flex">
          {items.map((row, index) => {
            const tabId = getReportModuleStatusTabId(row.label);
            const tabLabel = REPORT_MODULE_TABS.find((tab) => tab.id === tabId)?.label ?? "tab";

            return (
              <Fragment key={row.label}>
                {index > 0 ? <StatusModuleDivider /> : null}
                <StatusModuleColumn
                  label={row.label}
                  status={row.status}
                  trend={row.trend}
                  tabId={tabId}
                  tabLabel={tabLabel}
                  onItemNavigate={onItemNavigate}
                  onItemHover={onItemHover}
                  onItemLeave={onItemLeave}
                />
              </Fragment>
            );
          })}
          <StatusModuleDivider />
          <StatusModuleColumn
            label="Overall Status"
            status={projectStatus.status}
            trend={projectStatus.statusTrend}
            highlightClassName={overallStatusHighlightClass(projectStatus.status)}
            onItemHover={onItemHover}
            onItemLeave={onItemLeave}
          />
        </div>
      </CardContent>
    </Card>
  );
}
