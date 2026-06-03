export const COST_MODULE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "cost-report", label: "Cost Report" },
  { id: "budget", label: "Budget" },
  { id: "funding", label: "Funding" },
  { id: "commitments", label: "Commitments" },
  { id: "actuals", label: "Actuals" },
] as const;

export type CostModuleTabId = (typeof COST_MODULE_TABS)[number]["id"];
