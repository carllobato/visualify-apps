import {
  isReportModuleTabVisible,
  REPORT_MODULE_TABS,
  type ReportModuleTabId,
} from "@/components/project/report/report-module-tabs";

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
  const tabId = REPORT_OVERVIEW_MODULE_TAB_BY_LINK_ID[linkId];
  if (tabId == null || !isReportModuleTabVisible(tabId)) {
    return undefined;
  }
  return tabId;
}

export function getReportOverviewNavigateLabel(linkId: ReportOverviewModuleLinkId): string {
  const cardTitle = REPORT_OVERVIEW_CARD_TITLE_BY_LINK_ID[linkId];
  const tabId = getReportOverviewModuleTabId(linkId);
  const tabLabel = REPORT_MODULE_TABS.find((tab) => tab.id === tabId)?.label ?? "tab";
  return `View ${cardTitle} — open ${tabLabel} tab`;
}

export const REPORT_OVERVIEW_HIGHLIGHT_OUTLINE_CLASS =
  "outline outline-2 outline-offset-0 outline-[var(--ds-primary)]";

/** Shared value row for overview metric cards — keeps RAG dots and trend arrows aligned. */
export const REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS =
  "m-0 inline-flex min-w-0 items-center justify-end gap-2 text-[length:var(--ds-text-sm)] leading-none";

/** Dot size paired with {@link REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS} indicator slots. */
export const REPORT_OVERVIEW_METRIC_DOT_CLASS = "size-[0.75em]";

/** Em-based slot so variance dots and trend arrows align and scale with row text. */
export const REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS =
  "inline-flex w-[1.25em] shrink-0 items-center justify-center self-center";

/**
 * Mobile tile shadow — diffuse lift only. Skips inset + outer top hairlines from
 * `--ds-elevation-tile` (double rim when cards use `overflow-visible` for lateral blur).
 */
export const REPORT_OVERVIEW_MOBILE_CARD_SHADOW_CLASS =
  "max-md:!shadow-[0_2px_6px_color-mix(in_oklab,var(--ds-scrim-ink)_5%,transparent),0_8px_24px_color-mix(in_oklab,var(--ds-scrim-ink)_6%,transparent)]";

export const REPORT_OVERVIEW_MOBILE_FLATTEN_CARD_CLASS = [
  "max-md:overflow-visible",
  "max-md:border max-md:border-transparent",
  "max-md:!bg-[var(--ds-surface-tile)]",
  REPORT_OVERVIEW_MOBILE_CARD_SHADOW_CLASS,
].join(" ");

export const REPORT_OVERVIEW_NAVIGABLE_CARD_HOVER_CLASS = [
  "cursor-pointer",
  "hover:bg-[var(--ds-surface-tile-hover)]",
  "hover:shadow-[var(--ds-elevation-tile-hover)]",
  "max-md:hover:!shadow-[0_4px_10px_color-mix(in_oklab,var(--ds-scrim-ink)_6.5%,transparent),0_12px_28px_color-mix(in_oklab,var(--ds-scrim-ink)_8%,transparent)]",
].join(" ");

/** Row highlight used on the Project tab list and table rows. */
export const REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS =
  "transition-[background-color] duration-200 ease-out hover:bg-[var(--ds-surface-hover)]";

export function getReportOverviewCardClassName(
  highlighted: boolean,
  baseClassName: string,
  interactive = false,
): string {
  return [
    baseClassName,
    REPORT_OVERVIEW_MOBILE_FLATTEN_CARD_CLASS,
    interactive
      ? `transition-[transform,outline-color,box-shadow,background-color] duration-200 ease-out ${REPORT_OVERVIEW_NAVIGABLE_CARD_HOVER_CLASS}`
      : "transition-[outline-color,box-shadow,background-color] duration-150 ease-out",
    highlighted ? `overflow-visible ${REPORT_OVERVIEW_HIGHLIGHT_OUTLINE_CLASS}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
