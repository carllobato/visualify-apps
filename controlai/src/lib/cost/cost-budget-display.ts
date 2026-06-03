import type {
  CostBudgetDisplayRow,
  CostBudgetTableRow,
  CostBudgetWbsOption,
} from "@/lib/cost/cost-budget-types";

const ROLLUP_NOTES_LABEL = "Roll-up";

function parseBudgetAmount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBudgetAmountGrouped(
  value: string | number,
  emptyDisplay: string,
): string {
  const trimmed = typeof value === "number" ? String(value) : value.trim();
  if (!trimmed) return emptyDisplay;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return trimmed;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parsed);
}

/** Table row amounts (direct, roll-up, edit) — grouped digits, no currency symbol. */
export function formatBudgetAmountRow(value: string | number): string {
  return formatBudgetAmountGrouped(value, "—");
}

/** Project total and other summary totals — grouped with USD symbol. */
export function formatBudgetAmountDisplay(value: string | number): string {
  const trimmed = typeof value === "number" ? String(value) : value.trim();
  if (!trimmed) return "—";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return trimmed;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parsed);
}

/** Canonical digits-only string for persistence and validation. */
export function parseBudgetAmountInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/[^0-9]/g, "");
}

/** Comma-grouped amount for inline budget cell editing (empty stays blank). */
export function formatBudgetAmountEdit(value: string): string {
  const canonical = parseBudgetAmountInput(value);
  if (!canonical) return "";
  return formatBudgetAmountGrouped(canonical, "");
}

function formatRollupAmount(total: number): string {
  return String(total);
}

export function isDescendantWbsCode(ancestorCode: string, descendantCode: string): boolean {
  return descendantCode.startsWith(`${ancestorCode}.`);
}

/** Display WBS codes with two-digit numeric segments (e.g. 1 → 01, 9.1 → 09.01). */
export function formatWbsCodeDisplay(code: string): string {
  return code
    .split(".")
    .map((segment) => (/^\d+$/.test(segment) ? segment.padStart(2, "0") : segment))
    .join(".");
}

export function buildParentWbsIdMap(
  wbsOptions: CostBudgetWbsOption[],
): Map<string, string | null> {
  return new Map(wbsOptions.map((option) => [option.id, option.parentWbsId ?? null]));
}

/** True when another visible table row exists under this WBS code. */
export function displayRowHasVisibleDescendants(
  row: CostBudgetDisplayRow,
  allRows: CostBudgetDisplayRow[],
): boolean {
  return allRows.some(
    (other) => other.wbsId !== row.wbsId && isDescendantWbsCode(row.wbsCode, other.wbsCode),
  );
}

/** Hidden when any ancestor WBS in the hierarchy is collapsed. */
export function isBudgetDisplayRowVisible(
  row: CostBudgetDisplayRow,
  collapsedWbsIds: ReadonlySet<string>,
  parentByWbsId: Map<string, string | null>,
): boolean {
  let parentId = parentByWbsId.get(row.wbsId) ?? null;
  const visited = new Set<string>();

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    if (collapsedWbsIds.has(parentId)) return false;
    parentId = parentByWbsId.get(parentId) ?? null;
  }

  return true;
}

export function filterVisibleBudgetDisplayRows(
  rows: CostBudgetDisplayRow[],
  collapsedWbsIds: ReadonlySet<string>,
  parentByWbsId: Map<string, string | null>,
): CostBudgetDisplayRow[] {
  return rows.filter((row) => isBudgetDisplayRowVisible(row, collapsedWbsIds, parentByWbsId));
}

function collectAncestorWbsIds(
  wbsId: string,
  parentByWbsId: Map<string, string | null>,
): string[] {
  const ancestors: string[] = [];
  let parentId = parentByWbsId.get(wbsId) ?? null;
  const visited = new Set<string>();

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    ancestors.push(parentId);
    parentId = parentByWbsId.get(parentId) ?? null;
  }

  return ancestors;
}

function wbsDepth(wbsId: string, parentByWbsId: Map<string, string | null>): number {
  let depth = 0;
  let parentId = parentByWbsId.get(wbsId) ?? null;
  const visited = new Set<string>();

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    depth += 1;
    parentId = parentByWbsId.get(parentId) ?? null;
  }

  return depth;
}

function sumDirectBudgetsForAncestor(
  ancestorCode: string,
  directBudgetRows: CostBudgetTableRow[],
): number {
  return directBudgetRows.reduce((sum, row) => {
    if (isDescendantWbsCode(ancestorCode, row.wbsCode)) {
      return sum + parseBudgetAmount(row.budgetAmount);
    }
    return sum;
  }, 0);
}

function compareDisplayRows(a: CostBudgetDisplayRow, b: CostBudgetDisplayRow): number {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.wbsCode.localeCompare(b.wbsCode, undefined, { numeric: true });
}

/**
 * Builds the hierarchical Budget table: ancestor roll-up rows plus direct budget rows.
 * Does not create or imply persisted parent budgets.
 */
export function buildBudgetDisplayRows(
  wbsOptions: CostBudgetWbsOption[],
  directBudgetRows: CostBudgetTableRow[],
): CostBudgetDisplayRow[] {
  if (directBudgetRows.length === 0 || wbsOptions.length === 0) {
    return [];
  }

  const wbsById = new Map(wbsOptions.map((option) => [option.id, option]));
  const parentByWbsId = buildParentWbsIdMap(wbsOptions);
  const directByWbsId = new Map(directBudgetRows.map((row) => [row.wbsId, row]));

  const displayWbsIds = new Set<string>();
  for (const direct of directBudgetRows) {
    displayWbsIds.add(direct.wbsId);
    for (const ancestorId of collectAncestorWbsIds(direct.wbsId, parentByWbsId)) {
      displayWbsIds.add(ancestorId);
    }
  }

  const rows: CostBudgetDisplayRow[] = [];

  for (const wbsId of displayWbsIds) {
    const wbs = wbsById.get(wbsId);
    if (!wbs) continue;

    const depth = wbsDepth(wbsId, parentByWbsId);
    const direct = directByWbsId.get(wbsId);

    if (direct) {
      rows.push({
        rowKey: direct.id,
        kind: "direct",
        wbsId: wbs.id,
        wbsCode: wbs.code,
        wbsDescription: wbs.description,
        depth,
        sortOrder: wbs.sortOrder,
        budgetAmount: direct.budgetAmount,
        notes: direct.notes,
        budgetId: direct.id,
      });
      continue;
    }

    rows.push({
      rowKey: `rollup:${wbsId}`,
      kind: "rollup",
      wbsId: wbs.id,
      wbsCode: wbs.code,
      wbsDescription: wbs.description,
      depth,
      sortOrder: wbs.sortOrder,
      budgetAmount: formatRollupAmount(sumDirectBudgetsForAncestor(wbs.code, directBudgetRows)),
      notes: ROLLUP_NOTES_LABEL,
    });
  }

  rows.sort(compareDisplayRows);
  return rows;
}

/** Sum of persisted direct budget lines (excludes roll-up rows). */
export function sumDirectBudgetAmounts(directBudgetRows: CostBudgetTableRow[]): number {
  return directBudgetRows.reduce((sum, row) => sum + parseBudgetAmount(row.budgetAmount), 0);
}
