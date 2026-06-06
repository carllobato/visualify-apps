export const REPORT_MODULE_TABS = [
  { id: "page-1", label: "Overview" },
  { id: "project", label: "Project" },
  { id: "page-2", label: "Cost" },
  { id: "schedule", label: "Schedule" },
  { id: "upload", label: "Upload" },
  { id: "settings", label: "Settings" },
] as const;

export type ReportModuleTabId = (typeof REPORT_MODULE_TABS)[number]["id"];

export const REPORT_MODULE_TABS_WITH_STAGE_STEPPER = [
  "page-1",
  "project",
  "page-2",
  "schedule",
] as const satisfies readonly ReportModuleTabId[];

export function reportModuleTabShowsStageStepper(tabId: ReportModuleTabId): boolean {
  return (REPORT_MODULE_TABS_WITH_STAGE_STEPPER as readonly ReportModuleTabId[]).includes(tabId);
}
