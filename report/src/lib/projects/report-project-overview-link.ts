import type { ReportModuleTabId } from "@/components/project/report/report-module-tabs";
import { REPORT_MODULE_TABS } from "@/components/project/report/report-module-tabs";

export type ReportOverviewModuleLinkId = "safety" | "schedule" | "cost" | "risk" | "overall";

const REPORT_OVERVIEW_MODULE_LINK_BY_LABEL: Record<string, ReportOverviewModuleLinkId> = {
  Safety: "safety",
  Schedule: "schedule",
  Cost: "cost",
  Risk: "risk",
  "Overall Status": "overall",
};

const REPORT_OVERVIEW_MODULE_LABEL_BY_LINK_ID: Record<ReportOverviewModuleLinkId, string> = {
  safety: "Safety",
  schedule: "Schedule",
  cost: "Cost",
  risk: "Risk",
  overall: "Overall Status",
};

export function getReportOverviewModuleLinkId(
  label: string,
): ReportOverviewModuleLinkId | undefined {
  return REPORT_OVERVIEW_MODULE_LINK_BY_LABEL[label];
}

const REPORT_OVERVIEW_MODULE_TAB_BY_LINK_ID: Record<
  ReportOverviewModuleLinkId,
  ReportModuleTabId
> = {
  safety: "project",
  schedule: "schedule",
  cost: "page-2",
  risk: "project",
  overall: "project",
};

const REPORT_OVERVIEW_CARD_TITLE_BY_LINK_ID: Record<ReportOverviewModuleLinkId, string> = {
  safety: "Safety",
  schedule: "Schedule",
  cost: "Cost",
  risk: "Key issues & risks",
  overall: "Project overview",
};

export function getReportOverviewModuleTabId(
  linkId: ReportOverviewModuleLinkId,
): ReportModuleTabId | undefined {
  return REPORT_OVERVIEW_MODULE_TAB_BY_LINK_ID[linkId];
}

export function getReportOverviewNavigateLabel(linkId: ReportOverviewModuleLinkId): string {
  const cardTitle = REPORT_OVERVIEW_CARD_TITLE_BY_LINK_ID[linkId];
  const tabId = getReportOverviewModuleTabId(linkId);
  const tabLabel = REPORT_MODULE_TABS.find((tab) => tab.id === tabId)?.label ?? "tab";
  return `View ${cardTitle} — open ${tabLabel} tab`;
}

export const REPORT_OVERVIEW_HIGHLIGHT_OUTLINE_CLASS =
  "outline outline-2 outline-offset-0 outline-[var(--ds-primary)]";

export const REPORT_OVERVIEW_NAVIGABLE_CARD_HOVER_CLASS =
  "cursor-pointer hover:bg-[var(--ds-surface-tile-hover)] hover:shadow-[var(--ds-elevation-tile-hover)]";

export function getReportOverviewCardClassName(
  highlighted: boolean,
  baseClassName: string,
  interactive = false,
): string {
  return [
    baseClassName,
    interactive
      ? `transition-[transform,outline-color,box-shadow,background-color] duration-200 ease-out ${REPORT_OVERVIEW_NAVIGABLE_CARD_HOVER_CLASS}`
      : "transition-[outline-color,box-shadow,background-color] duration-150 ease-out",
    highlighted ? `overflow-visible ${REPORT_OVERVIEW_HIGHLIGHT_OUTLINE_CLASS}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
