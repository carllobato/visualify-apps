"use client";

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
import {
  REPORT_OVERVIEW_MOBILE_CARD_SHADOW_CLASS,
  REPORT_OVERVIEW_MOBILE_FLATTEN_CARD_CLASS,
} from "@/lib/projects/report-project-overview-link";
import { useReportSmMinWidth } from "@/lib/useReportSmMinWidth";

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

const MOBILE_OVERALL_STATUS_HERO_CLASS = [
  "relative col-span-2 flex min-w-0 flex-col rounded-[var(--ds-radius-md)] px-3 py-3",
  REPORT_OVERVIEW_MOBILE_CARD_SHADOW_CLASS,
].join(" ");

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
        <div className="flex items-center justify-center gap-1 pt-1.5 text-[length:var(--ds-text-sm)]">
          <div className={MOBILE_SUPPORTING_STATUS_VALUE_CLASS}>
            <ReportRagStatusDot status={status} showPhrase />
          </div>
          <Trend sentiment={trend.sentiment} className="shrink-0 opacity-70" />
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
      <div className="flex items-center justify-center gap-2 pt-2 pb-0.5 text-[length:1.75rem]">
        <div className={MOBILE_OVERALL_STATUS_VALUE_CLASS}>
          <ReportRagStatusDot status={status} showPhrase />
        </div>
        {trendText ? (
          <Trend sentiment={trend.sentiment} className="shrink-0 opacity-70">
            {trendText}
          </Trend>
        ) : null}
      </div>
    </div>
  );
}

function StatusModuleDivider({ cssHiddenFallback = false }: { cssHiddenFallback?: boolean }) {
  return (
    <div
      aria-hidden
      className={[
        "shrink-0 self-stretch py-3 sm:flex sm:flex-col sm:py-4",
        cssHiddenFallback ? "hidden" : "flex flex-col",
      ].join(" ")}
    >
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
        <div className="flex min-h-14 flex-1 items-center justify-center gap-2 pt-2 pb-2 text-2xl">
          <ReportRagStatusDot status={status} showPhrase />
          <Trend sentiment={trend.sentiment}>{trend.text}</Trend>
        </div>
      </div>
    </div>
  );
}

type ModuleStatusLayoutProps = Pick<
  ReportProjectModuleStatusCardProps,
  "items" | "projectStatus" | "onItemNavigate" | "onItemHover" | "onItemLeave"
>;

function ModuleStatusMobileGrid({
  items,
  projectStatus,
  onItemNavigate,
  onItemHover,
  onItemLeave,
}: ModuleStatusLayoutProps) {
  return (
    <>
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
    </>
  );
}

function ModuleStatusDesktopRow({
  items,
  projectStatus,
  onItemNavigate,
  onItemHover,
  onItemLeave,
  cssHiddenFallback = false,
}: ModuleStatusLayoutProps & { cssHiddenFallback?: boolean }) {
  return (
    <>
      {items.map((row, index) => {
        const tabId = getReportModuleStatusTabId(row.label);
        const tabLabel = REPORT_MODULE_TABS.find((tab) => tab.id === tabId)?.label ?? "tab";

        return (
          <Fragment key={row.label}>
            {index > 0 ? <StatusModuleDivider cssHiddenFallback={cssHiddenFallback} /> : null}
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
      <StatusModuleDivider cssHiddenFallback={cssHiddenFallback} />
      <StatusModuleColumn
        label="Overall Status"
        status={projectStatus.status}
        trend={projectStatus.statusTrend}
        highlightClassName={overallStatusHighlightClass(projectStatus.status)}
        onItemHover={onItemHover}
        onItemLeave={onItemLeave}
      />
    </>
  );
}

function ModuleStatusCardContent({
  layoutProps,
  isSmMinWidth,
}: {
  layoutProps: ModuleStatusLayoutProps;
  isSmMinWidth: boolean | null;
}) {
  if (isSmMinWidth === null) {
    return (
      <>
        <div className="grid min-h-0 flex-1 min-w-0 grid-cols-2 gap-x-2 gap-y-2 sm:hidden">
          <ModuleStatusMobileGrid {...layoutProps} />
        </div>
        <div className="hidden min-h-0 flex-1 min-w-0 items-stretch sm:flex">
          <ModuleStatusDesktopRow {...layoutProps} cssHiddenFallback />
        </div>
      </>
    );
  }

  if (isSmMinWidth) {
    return (
      <div className="flex min-h-0 flex-1 min-w-0 items-stretch">
        <ModuleStatusDesktopRow {...layoutProps} />
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 min-w-0 grid-cols-2 gap-x-2 gap-y-2">
      <ModuleStatusMobileGrid {...layoutProps} />
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
  const isSmMinWidth = useReportSmMinWidth();
  const layoutProps: ModuleStatusLayoutProps = {
    items,
    projectStatus,
    onItemNavigate,
    onItemHover,
    onItemLeave,
  };

  return (
    <Card
      className={[
        "flex h-full w-full min-w-0 flex-col overflow-visible",
        REPORT_OVERVIEW_MOBILE_FLATTEN_CARD_CLASS,
      ].join(" ")}
    >
      <CardContent className="flex flex-1 flex-col px-0 py-3 sm:p-0">
        <ModuleStatusCardContent layoutProps={layoutProps} isSmMinWidth={isSmMinWidth} />
      </CardContent>
    </Card>
  );
}
