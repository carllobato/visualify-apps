export const REPORT_MODULE_TABS = [
  { id: "overview", label: "Summary" },
  { id: "status-updates", label: "Status Updates" },
  { id: "risks-issues", label: "Risks & Issues" },
  { id: "financial", label: "Financial" },
  { id: "cashflow", label: "Cashflow" },
  { id: "uploads", label: "Uploads" },
  { id: "snapshots", label: "Snapshots" },
  { id: "settings", label: "Settings" },
] as const;

export type ReportModuleTabId = (typeof REPORT_MODULE_TABS)[number]["id"];

export const REPORT_COVER_TAB_IDS = [
  "overview",
  "status-updates",
  "risks-issues",
  "financial",
  "cashflow",
] as const satisfies readonly ReportModuleTabId[];

export type ReportCoverTabId = (typeof REPORT_COVER_TAB_IDS)[number];
