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
import { REPORT_OVERVIEW_MOBILE_FLATTEN_CARD_CLASS } from "@/lib/projects/report-project-overview-link";

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

const MOBILE_OVERALL_STATUS_HERO_CLASS =
  "relative col-span-2 flex min-w-0 flex-col rounded-[var(--ds-radius-md)] px-3 py-3";

const MOBILE_OVERALL_STATUS_VALUE_CLASS =
  "[&>span>span:first-child]:!size-3 [&>span>span:last-child]:!text-[length:1.75rem] [&>span>span:last-child]:!font-bold";

const MOBILE_SUPPORTING_STATUS_CARD_CLASS =
  "relative flex min-h-0 min-w-0 flex-col rounded-[var(--ds-radius-md)] px-2 py-2";

const MOBILE_SUPPORTING_STATUS_LABEL_CLASS =
  "shrink-0 text-[length:var(--ds-text-xs)] font-semibold text-[var(--ds-text-primary)]";

const MOBILE_SUPPORTING_STATUS_VALUE_CLASS =
  "[&>span>span:first-child]:!size-2 [&>span>span:last-child]:!text-[length:var(--ds-text-sm)] [&>span>span:last-child]:!font-semibold";

function MobileSupportingStatusCard({
  label,
  status,
  trend,
  tabId,
  tabLabel,
  onItemNavigate,
  onItemHover,
  onItemLeave,
}: {
  label: string;
  status: string;
  trend: ReportProjectModuleStatusItem["trend"];
  tabId?: ReportModuleTabId;
  tabLabel?: string;
  onItemNavigate?: (tabId: ReportModuleTabId) => void;
  onItemHover?: (label: string) => void;
  onItemLeave?: () => void;
}) {
  const isInteractive = tabId != null && onItemNavigate != null;

  return (
    <div
      className={MOBILE_SUPPORTING_STATUS_CARD_CLASS}
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
      <div className="relative z-10 flex min-h-0 flex-col pointer-events-none">
        <span className={MOBILE_SUPPORTING_STATUS_LABEL_CLASS}>{label}</span>
        <div className="flex items-center justify-center gap-1 pt-1.5">
          <div className={MOBILE_SUPPORTING_STATUS_VALUE_CLASS}>
            <ReportRagStatusDot status={status} showPhrase />
          </div>
          <Trend sentiment={trend.sentiment} className="shrink-0 scale-75 opacity-70" />
        </div>
      </div>
    </div>
  );
}

function MobileOverallStatusHero({
  status,
  trend,
  highlightClassName,
  onItemHover,
  onItemLeave,
}: {
  status: string;
  trend: ReportProjectModuleStatusItem["trend"];
  highlightClassName: string;
  onItemHover?: (label: string) => void;
  onItemLeave?: () => void;
}) {
  const trendText = trend.text.trim();

  return (
    <div
      className={[
        MOBILE_OVERALL_STATUS_HERO_CLASS,
        highlightClassName,
        STATUS_MODULE_COLUMN_HOVER_OUTLINE_CLASS,
      ].join(" ")}
      onMouseEnter={() => onItemHover?.("Overall Status")}
      onMouseLeave={() => onItemLeave?.()}
    >
      <span className={STATUS_MODULE_TITLE_CLASS}>Overall Status</span>
      <div className="flex items-center justify-center gap-2 pt-2 pb-0.5">
        <div className={MOBILE_OVERALL_STATUS_VALUE_CLASS}>
          <ReportRagStatusDot status={status} showPhrase />
        </div>
        {trendText ? (
          <Trend sentiment={trend.sentiment} className="shrink-0 scale-90 opacity-70">
            {trendText}
          </Trend>
        ) : null}
      </div>
    </div>
  );
}

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
    <Card
      className={[
        "flex h-full w-full min-w-0 flex-col overflow-visible max-md:overflow-hidden",
        REPORT_OVERVIEW_MOBILE_FLATTEN_CARD_CLASS,
      ].join(" ")}
    >
      <CardContent className="flex flex-1 flex-col px-0 py-3 sm:p-0">
        <div className="grid min-h-0 flex-1 min-w-0 grid-cols-2 gap-x-2 gap-y-2 sm:hidden">
          <MobileOverallStatusHero
            status={projectStatus.status}
            trend={projectStatus.statusTrend}
            highlightClassName={overallStatusHighlightClass(projectStatus.status)}
            onItemHover={onItemHover}
            onItemLeave={onItemLeave}
          />
          {items.map((row) => {
            const tabId = getReportModuleStatusTabId(row.label);
            const tabLabel = REPORT_MODULE_TABS.find((tab) => tab.id === tabId)?.label ?? "tab";

            return (
              <MobileSupportingStatusCard
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
