export const COST_MODULE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "budget", label: "Budget" },
  { id: "commitments", label: "Commitments" },
  { id: "forecast", label: "Forecast" },
  { id: "changes", label: "Changes" },
  { id: "cashflow", label: "Cashflow" },
] as const;

export type CostModuleTabId = (typeof COST_MODULE_TABS)[number]["id"];
