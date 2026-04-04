import type { ProjectCurrency } from "@/lib/projectContext";

/**
 * Format large currency values for portfolio dashboard (e.g. $124.5M).
 */
export function formatPortfolioCurrency(value: number): string {
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

/** Compact currency label for KPI tiles (respects AUD / USD / GBP). */
export function formatCurrencyCompact(amount: number, currency: ProjectCurrency): string {
  if (!Number.isFinite(amount) || amount < 0) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return "—";
  }
}

export function contingencyHeldTileCopy(
  byCurrency: Map<ProjectCurrency, number>,
  projectCount: number
): { primaryValue: string; subtext: string } {
  const totalM = [...byCurrency.values()].reduce((a, b) => a + b, 0);
  const nonzero = [...byCurrency.entries()].filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]);
  if (nonzero.length === 0) {
    if (byCurrency.size > 0 && totalM === 0) {
      const c = [...byCurrency.keys()][0];
      return {
        primaryValue: formatCurrencyCompact(0, c),
        subtext: projectCount === 1 ? "1 project" : `Sum across ${projectCount} projects`,
      };
    }
    return {
      primaryValue: "—",
      subtext:
        projectCount === 0 ? "No projects in portfolio" : "No contingency in project settings",
    };
  }
  const toAbs = (millions: number) => millions * 1_000_000;
  if (nonzero.length === 1) {
    const [c, m] = nonzero[0];
    return {
      primaryValue: formatCurrencyCompact(toAbs(m), c),
      subtext: projectCount === 1 ? "1 project" : `Sum across ${projectCount} projects`,
    };
  }
  const parts = nonzero.map(([c, m]) => formatCurrencyCompact(toAbs(m), c));
  return {
    primaryValue: "—",
    subtext: `${parts.join(" · ")} · not converted (multiple currencies)`,
  };
}
