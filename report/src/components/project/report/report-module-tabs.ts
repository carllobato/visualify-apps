export const REPORT_MODULE_TABS = [
  { id: "page-1", label: "Overview" },
  { id: "project", label: "Project" },
  { id: "page-2", label: "Cost" },
  { id: "schedule", label: "Schedule" },
  { id: "upload", label: "Upload" },
  { id: "settings", label: "Settings" },
] as const;

export type ReportModuleTabId = (typeof REPORT_MODULE_TABS)[number]["id"];

/** Hidden from the tab bar until the view is ready to ship. */
export const REPORT_MODULE_HIDDEN_TAB_IDS = ["schedule"] as const satisfies readonly ReportModuleTabId[];

export function isReportModuleTabVisible(tabId: ReportModuleTabId): boolean {
  return !(REPORT_MODULE_HIDDEN_TAB_IDS as readonly ReportModuleTabId[]).includes(tabId);
}

export const REPORT_MODULE_MORE_TAB_IDS = ["upload", "settings"] as const satisfies readonly ReportModuleTabId[];

export const REPORT_MODULE_PRIMARY_TABS = REPORT_MODULE_TABS.filter(
  (tab) =>
    !(REPORT_MODULE_MORE_TAB_IDS as readonly string[]).includes(tab.id) &&
    isReportModuleTabVisible(tab.id),
);

export const REPORT_MODULE_MORE_TABS = REPORT_MODULE_TABS.filter(
  (tab) =>
    (REPORT_MODULE_MORE_TAB_IDS as readonly string[]).includes(tab.id) &&
    isReportModuleTabVisible(tab.id),
);

export const REPORT_MODULE_TABS_WITH_STAGE_STEPPER = [
  "page-1",
  "project",
  "page-2",
] as const satisfies readonly ReportModuleTabId[];

export function reportModuleTabShowsStageStepper(tabId: ReportModuleTabId): boolean {
  return (REPORT_MODULE_TABS_WITH_STAGE_STEPPER as readonly ReportModuleTabId[]).includes(tabId);
}
