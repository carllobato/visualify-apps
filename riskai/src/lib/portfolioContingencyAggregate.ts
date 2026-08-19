import {
  PROJECT_CURRENCY_VALUES,
  type ProjectCurrency,
} from "@/lib/projectContext";

export function asProjectCurrency(raw: unknown): ProjectCurrency {
  return typeof raw === "string" && (PROJECT_CURRENCY_VALUES as readonly string[]).includes(raw)
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
