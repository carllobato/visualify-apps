export const TIME_MODULE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "programme", label: "Programme" },
  { id: "milestones", label: "Milestones" },
  { id: "critical-path", label: "Critical Path" },
  { id: "progress", label: "Progress" },
  { id: "delays", label: "Delays" },
] as const;

export type TimeModuleTabId = (typeof TIME_MODULE_TABS)[number]["id"];
