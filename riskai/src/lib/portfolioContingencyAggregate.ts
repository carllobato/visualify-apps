import { computeValueM, type FinancialUnit, type ProjectCurrency } from "@/lib/projectContext";

const FINANCIAL_UNITS: FinancialUnit[] = ["THOUSANDS", "MILLIONS", "BILLIONS"];
const PROJECT_CURRENCIES: ProjectCurrency[] = ["AUD", "USD", "GBP"];

function asFinancialUnit(raw: unknown): FinancialUnit {
  return typeof raw === "string" && FINANCIAL_UNITS.includes(raw as FinancialUnit)
    ? (raw as FinancialUnit)
    : "MILLIONS";
}

export function asProjectCurrency(raw: unknown): ProjectCurrency {
  return typeof raw === "string" && PROJECT_CURRENCIES.includes(raw as ProjectCurrency)
    ? (raw as ProjectCurrency)
    : "AUD";
}

export type ProjectSettingsContingencyRow = {
  contingency_value_input: unknown;
  financial_unit: unknown;
  currency: unknown;
  /** 2 = major currency in `contingency_value_input`; omitted/1 = legacy scaled per `financial_unit`. */
  financial_inputs_version?: unknown;
};

/** Contingency in millions of the project’s currency (same semantics as `ProjectContext.contingencyValue_m`). */
export function contingencyMillionsFromSettingsRow(row: ProjectSettingsContingencyRow): number {
  const input =
    typeof row.contingency_value_input === "number" && Number.isFinite(row.contingency_value_input)
      ? row.contingency_value_input
      : 0;
  if (row.financial_inputs_version === 2) {
    return input / 1e6;
  }
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

/**
 * Coverage ratio per currency: contingency held ÷ forward cost exposure.
 * Both inputs must be in the same unit (millions). Returns a ratio, e.g. 1.25 = 125%.
 * Only currencies with positive exposure are included (no division by zero).
 */
export function computeCoverageRatioByCurrency(
  contingencyByCurrency: Map<ProjectCurrency, number>,
  exposureByCurrency: Map<ProjectCurrency, number>
): Map<ProjectCurrency, number> {
  const ratios = new Map<ProjectCurrency, number>();
  for (const [currency, contingencyM] of contingencyByCurrency) {
    const exposureM = exposureByCurrency.get(currency) ?? 0;
    if (exposureM > 0 && Number.isFinite(contingencyM) && Number.isFinite(exposureM)) {
      ratios.set(currency, contingencyM / exposureM);
    }
  }
  return ratios;
}
