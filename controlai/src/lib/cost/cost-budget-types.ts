/** Serializable budget tab payload (server → client). */

export type CostBudgetWbsOption = {
  id: string;
  code: string;
  description: string;
  parentWbsId: string | null;
  sortOrder: number | null;
};

export type CostBudgetDisplayRowKind = "rollup" | "direct";

/** Budget tab table row — direct (persisted) or calculated ancestor roll-up. */
export type CostBudgetDisplayRow = {
  rowKey: string;
  kind: CostBudgetDisplayRowKind;
  wbsId: string;
  wbsCode: string;
  wbsDescription: string;
  depth: number;
  sortOrder: number | null;
  budgetAmount: string;
  notes: string;
  /** Persisted budget id; only set for direct rows. */
  budgetId?: string;
};

export type CostBudgetTableRow = {
  id: string;
  wbsId: string;
  wbsCode: string;
  wbsDescription: string;
  budgetAmount: string;
  notes: string;
};

export type CostModuleBudgetData = {
  wbsOptions: CostBudgetWbsOption[];
  budgetRows: CostBudgetTableRow[];
};
