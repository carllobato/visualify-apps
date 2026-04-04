import { computeValueM, type FinancialUnit, type ProjectCurrency } from "@/lib/projectContext";

const FINANCIAL_UNITS: FinancialUnit[] = ["THOUSANDS", "MILLIONS", "BILLIONS"];
const PROJECT_CURRENCIES: ProjectCurrency[] = ["AUD", "USD", "GBP"];

function asFinancialUnit(raw: unknown): FinancialUnit {
  return typeof raw === "string" && FINANCIAL_UNITS.includes(raw as FinancialUnit)
    ? (raw as FinancialUnit)
    : "MILLIONS";
}

function asProjectCurrency(raw: unknown): ProjectCurrency {
  return typeof raw === "string" && PROJECT_CURRENCIES.includes(raw as ProjectCurrency)
    ? (raw as ProjectCurrency)
    : "AUD";
}

export type ProjectSettingsContingencyRow = {
  contingency_value_input: unknown;
  financial_unit: unknown;
  currency: unknown;
};

/** Contingency in millions of the project’s currency (same semantics as `ProjectContext.contingencyValue_m`). */
export function contingencyMillionsFromSettingsRow(row: ProjectSettingsContingencyRow): number {
  const input =
    typeof row.contingency_value_input === "number" && Number.isFinite(row.contingency_value_input)
      ? row.contingency_value_input
      : 0;
  return computeValueM(input, asFinancialUnit(row.financial_unit));
}

/** Sum normalized contingency per ISO currency (no FX — amounts in each currency are not combined). */
export function sumContingencyByCurrency(rows: ProjectSettingsContingencyRow[]): Map<ProjectCurrency, number> {
  const map = new Map<ProjectCurrency, number>();
  for (const row of rows) {
    const c = asProjectCurrency(row.currency);
    const m = contingencyMillionsFromSettingsRow(row);
    map.set(c, (map.get(c) ?? 0) + m);
  }
  return map;
}
