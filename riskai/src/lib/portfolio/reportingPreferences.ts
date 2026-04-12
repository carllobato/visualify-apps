import type { ProjectCurrency } from "@/lib/projectContext";

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

const REPORTING_UNIT_DIVISORS: Record<ReportingUnitOption, number> = {
  THOUSANDS: 1_000,
  MILLIONS: 1_000_000,
  BILLIONS: 1_000_000_000,
};

const REPORTING_UNIT_SUFFIXES: Record<ReportingUnitOption, string> = {
  THOUSANDS: "k",
  MILLIONS: "m",
  BILLIONS: "b",
};

function intlLocaleForCurrency(currency: ProjectCurrency): string {
  return currency === "AUD" ? "en-AU" : "en-US";
}

export function asReportingUnit(raw: unknown): ReportingUnitOption {
  return typeof raw === "string" && REPORTING_UNIT_OPTIONS.includes(raw as ReportingUnitOption)
    ? (raw as ReportingUnitOption)
    : DEFAULT_REPORTING_UNIT;
}

function reportingUnitFractionDigits(scaledAmount: number): number {
  if (!Number.isFinite(scaledAmount) || scaledAmount === 0) return 0;
  if (Math.abs(scaledAmount) >= 100) return 0;
  if (Math.abs(scaledAmount) >= 10) return 1;
  if (Math.abs(scaledAmount) >= 1) return 2;
  return 3;
}

export function formatCurrencyInReportingUnit(
  amountAbs: number,
  currency: ProjectCurrency,
  reportingUnit: ReportingUnitOption,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  if (!Number.isFinite(amountAbs) || amountAbs < 0) return "—";
  const scaledAmount = amountAbs / REPORTING_UNIT_DIVISORS[reportingUnit];
  const maximumFractionDigits =
    options?.maximumFractionDigits ?? reportingUnitFractionDigits(scaledAmount);
  const minimumFractionDigits = Math.min(options?.minimumFractionDigits ?? 0, maximumFractionDigits);
  try {
    return `${new Intl.NumberFormat(intlLocaleForCurrency(currency), {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(scaledAmount)}${REPORTING_UNIT_SUFFIXES[reportingUnit]}`;
  } catch {
    return "—";
  }
}
