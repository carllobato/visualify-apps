import type { ProjectCurrency } from "@/lib/projectContext";
import { formatCurrencyCompact } from "@/lib/formatCurrency";
import { formatDurationDays } from "@/lib/formatDuration";

export type CoverageRatioTileCopy = { primaryValue: string; subtext: string };

export { formatCurrencyCompact };

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

/**
 * Formats the coverage ratio KPI tile copy.
 * Ratio values are decimals, e.g. 1.25 = 125%.
 * - Single currency with data: shows "125%" with a human-readable multiplier subtext.
 * - Multiple currencies: shows "—" with per-currency percentages.
 * - No data (no exposure to compare against): shows "—".
 */
function formatScheduleWeeksHeldLabel(weeks: number): string {
  if (!Number.isFinite(weeks) || weeks <= 0) return "";
  if (weeks === 1) return "1 week schedule reserve";
  return `${weeks} weeks schedule reserve`;
}

/**
 * @param scheduleCoverageRatio — schedule contingency weeks ÷ schedule exposure (weeks); omit when unknown.
 */
export function coverageRatioTileCopy(
  ratioByCurrency: Map<ProjectCurrency, number>,
  scheduleCoverageRatio?: number | null
): CoverageRatioTileCopy {
  const entries = [...ratioByCurrency.entries()].filter(([, r]) => Number.isFinite(r) && r >= 0);
  const schedulePart =
    scheduleCoverageRatio != null &&
    Number.isFinite(scheduleCoverageRatio) &&
    scheduleCoverageRatio >= 0
      ? ` · Schedule reserve ${scheduleCoverageRatio.toFixed(2)}× expected delay`
      : "";

  if (entries.length === 0) {
    const base = "No cost exposure data";
    return {
      primaryValue: "—",
      subtext: schedulePart !== "" ? `${base}${schedulePart}` : base,
    };
  }
  if (entries.length === 1) {
    const [, ratio] = entries[0];
    const pct = Math.round(ratio * 100);
    return {
      primaryValue: `${pct}%`,
      subtext: `Contingency covers ${ratio.toFixed(2)}× cost exposure${schedulePart}`,
    };
  }
  const parts = entries.map(([currency, ratio]) => `${currency} ${Math.round(ratio * 100)}%`);
  return {
    primaryValue: "—",
    subtext: `${parts.join(" · ")}${schedulePart}`,
  };
}

/** Semantic colour for the coverage % figure when exactly one currency applies (aligned with Coverage Ratio modal bands). */
export function coverageRatioSemanticClassName(
  ratioByCurrency: Map<ProjectCurrency, number>
): string | undefined {
  const entries = [...ratioByCurrency.entries()].filter(([, r]) => Number.isFinite(r) && r >= 0);
  if (entries.length !== 1) return undefined;
  const [, ratio] = entries[0];
  if (ratio < 0.8) return "text-[var(--ds-status-danger-fg)]";
  if (ratio < 1.0) return "text-[var(--ds-status-warning-fg)]";
  return "text-[var(--ds-status-success-fg)]";
}

const CONTINGENCY_HELD_TILE_SUBTEXT = "Contingency held in this portfolio";

const COST_EXPOSURE_TILE_SUBTEXT = "Forward cost exposure (12-month expected value)";

/**
 * KPI tile for total portfolio forward cost exposure — same units as Coverage Ratio denominator (millions per currency).
 */
export function costExposureTileCopy(
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
        subtext: COST_EXPOSURE_TILE_SUBTEXT,
      };
    }
    return {
      primaryValue: "—",
      subtext: projectCount === 0 ? "No projects in portfolio" : "No cost exposure data",
    };
  }
  const toAbs = (millions: number) => millions * 1_000_000;
  if (nonzero.length === 1) {
    const [c, m] = nonzero[0];
    return {
      primaryValue: formatCurrencyCompact(toAbs(m), c),
      subtext: COST_EXPOSURE_TILE_SUBTEXT,
    };
  }
  const parts = nonzero.map(([c, m]) => formatCurrencyCompact(toAbs(m), c));
  return {
    primaryValue: "—",
    subtext: `${parts.join(" · ")} · not converted (multiple currencies)`,
  };
}

/**
 * @param totalScheduleContingencyWeeks — sum of schedule contingency from project settings (weeks).
 * @param scheduleCoverageRatio — weeks held ÷ exposure (weeks); shown when exposure > 0.
 */
export function scheduleExposureTileCopy(
  totalDays: number,
  totalScheduleContingencyWeeks?: number,
  scheduleCoverageRatio?: number | null
): { primaryValue: string; subtext: string } {
  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    const held = formatScheduleWeeksHeldLabel(totalScheduleContingencyWeeks ?? 0);
    return {
      primaryValue: "—",
      subtext:
        held !== ""
          ? `No schedule exposure data · ${held}`
          : "No schedule exposure data",
    };
  }
  const held = formatScheduleWeeksHeldLabel(totalScheduleContingencyWeeks ?? 0);
  const ratioPart =
    scheduleCoverageRatio != null &&
    Number.isFinite(scheduleCoverageRatio) &&
    scheduleCoverageRatio >= 0
      ? ` · Reserve covers ${scheduleCoverageRatio.toFixed(2)}× expected delay`
      : "";
  const base = "Expected schedule exposure across all projects";
  const subtext =
    held !== "" ? `${base} · ${held}${ratioPart}` : `${base}${ratioPart}`;
  return {
    primaryValue: formatDurationDays(totalDays, { weekDecimals: 1 }),
    subtext,
  };
}

/** Sum of schedule contingency weeks — for schedule metrics panels beside the donut. */
export function scheduleContingencyHeldDisplayValue(totalWeeks: number): string {
  if (!Number.isFinite(totalWeeks) || totalWeeks <= 0) return "—";
  const w = Math.round(totalWeeks);
  return w === 1 ? "1 week" : `${w} weeks`;
}

/** Schedule reserve ÷ expected delay as a percentage (same ratio as tile subtext multiplier). */
export function scheduleCoverageRatioDisplayValue(ratio: number | null): string {
  if (ratio == null || !Number.isFinite(ratio) || ratio < 0) return "—";
  return `${Math.round(ratio * 100)}%`;
}

export function scheduleCoverageRatioSemanticClassName(ratio: number | null): string | undefined {
  if (ratio == null || !Number.isFinite(ratio)) return undefined;
  if (ratio < 0.8) return "text-[var(--ds-status-danger-fg)]";
  if (ratio < 1.0) return "text-[var(--ds-status-warning-fg)]";
  return "text-[var(--ds-status-success-fg)]";
}

export function needsAttentionTileCopy(count: number): {
  primaryValue: string;
  subtext: string;
  primaryValueClassName?: string;
} {
  return {
    primaryValue: String(count),
    subtext:
      count === 0
        ? "No high or extreme risks need attention"
        : "High / Extreme with no owner or no mitigation plan",
    primaryValueClassName: count > 0 ? "text-[var(--ds-status-danger)]" : undefined,
  };
}

function appendScheduleHeldToSubtext(subtext: string, totalScheduleContingencyWeeks: number): string {
  const held = formatScheduleWeeksHeldLabel(totalScheduleContingencyWeeks);
  if (held === "") return subtext;
  return `${subtext} · ${held}`;
}

/**
 * @param totalScheduleContingencyWeeks — sum of `schedule_contingency_weeks` across projects (whole weeks).
 */
export function contingencyHeldTileCopy(
  byCurrency: Map<ProjectCurrency, number>,
  projectCount: number,
  totalScheduleContingencyWeeks = 0
): { primaryValue: string; subtext: string } {
  const totalM = [...byCurrency.values()].reduce((a, b) => a + b, 0);
  const nonzero = [...byCurrency.entries()].filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]);
  if (nonzero.length === 0) {
    if (byCurrency.size > 0 && totalM === 0) {
      const c = [...byCurrency.keys()][0];
      return {
        primaryValue: formatCurrencyCompact(0, c),
        subtext: appendScheduleHeldToSubtext(CONTINGENCY_HELD_TILE_SUBTEXT, totalScheduleContingencyWeeks),
      };
    }
    return {
      primaryValue: "—",
      subtext: appendScheduleHeldToSubtext(
        projectCount === 0 ? "No projects in portfolio" : "No contingency in project settings",
        totalScheduleContingencyWeeks
      ),
    };
  }
  const toAbs = (millions: number) => millions * 1_000_000;
  if (nonzero.length === 1) {
    const [c, m] = nonzero[0];
    return {
      primaryValue: formatCurrencyCompact(toAbs(m), c),
      subtext: appendScheduleHeldToSubtext(CONTINGENCY_HELD_TILE_SUBTEXT, totalScheduleContingencyWeeks),
    };
  }
  const parts = nonzero.map(([c, m]) => formatCurrencyCompact(toAbs(m), c));
  return {
    primaryValue: "—",
    subtext: appendScheduleHeldToSubtext(
      `${parts.join(" · ")} · not converted (multiple currencies)`,
      totalScheduleContingencyWeeks
    ),
  };
}
