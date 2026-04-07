/** Defaults and allowed values for portfolio reporting fields (aligned with PATCH validation). */

export const DEFAULT_REPORTING_CURRENCY = "AUD";
export const DEFAULT_REPORTING_UNIT = "MILLIONS";

export const REPORTING_CURRENCY_OPTIONS = ["AUD", "USD", "GBP"] as const;
export const REPORTING_UNIT_OPTIONS = ["THOUSANDS", "MILLIONS", "BILLIONS"] as const;

export type ReportingCurrencyOption = (typeof REPORTING_CURRENCY_OPTIONS)[number];
export type ReportingUnitOption = (typeof REPORTING_UNIT_OPTIONS)[number];

/** Display labels for selects (stored values remain THOUSANDS | MILLIONS | BILLIONS). */
export const REPORTING_UNIT_LABELS: Record<ReportingUnitOption, string> = {
  THOUSANDS: "Thousands ($k)",
  MILLIONS: "Millions ($m)",
  BILLIONS: "Billions ($b)",
};
