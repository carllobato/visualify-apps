export const REPORT_MODULE_TABS = [
  { id: "page-1", label: "Overview" },
  { id: "page-2", label: "Cost" },
  { id: "schedule", label: "Schedule" },
  { id: "upload", label: "Upload" },
  { id: "settings", label: "Settings" },
] as const;

export type ReportModuleTabId = (typeof REPORT_MODULE_TABS)[number]["id"];
