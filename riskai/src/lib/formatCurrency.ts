import type { ProjectCurrency } from "@/lib/projectContext";

/**
 * Format currency for dashboard display (e.g. $24.6M, $1.2K).
 * Used by Project Overview and Portfolio Overview.
 */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return `$${billions % 1 === 0 ? billions : billions.toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Use en-AU for AUD so compact amounts show as "$…" not "A$…" (en-US prefixes AUD to distinguish from USD). */
function intlLocaleForCurrency(currency: ProjectCurrency): string {
  return currency === "AUD" ? "en-AU" : "en-US";
}

export type FormatCurrencyCompactOptions = {
  /** Defaults to 2. Use 0 for portfolio donut center totals (nearest whole unit). */
  maximumFractionDigits?: number;
};

/** Compact currency label (respects AUD / USD / GBP). Used by portfolio KPI tiles and contingency tables. */
export function formatCurrencyCompact(
  amount: number,
  currency: ProjectCurrency,
  options?: FormatCurrencyCompactOptions
): string {
  if (!Number.isFinite(amount) || amount < 0) return "—";
  const maximumFractionDigits = options?.maximumFractionDigits ?? 2;
  try {
    return new Intl.NumberFormat(intlLocaleForCurrency(currency), {
      style: "currency",
      currency,
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits,
    }).format(amount);
  } catch {
    return "—";
  }
}

/**
 * Large-value shorthand for narrow UI: `$88.5M`, `£1.2M`, `$400K` (one decimal when the value is not whole).
 * USD and AUD use `$` without an `A` prefix; GBP uses `£`.
 */
export function formatCurrencyMagnitudeAbbreviated(amount: number, currency: ProjectCurrency): string {
  if (!Number.isFinite(amount) || amount < 0) return "—";
  const sym = currency === "GBP" ? "£" : "$";
  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    return `${sym}${billions % 1 === 0 ? billions : billions.toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${sym}${millions % 1 === 0 ? millions : millions.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `${sym}${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K`;
  }
  try {
    return new Intl.NumberFormat(intlLocaleForCurrency(currency), {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return "—";
  }
}

/** Format ratio for display (e.g. 1.28x, 0.92x). */
export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${ratio.toFixed(2)}x`;
}
