"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CHART_HORIZONTAL_BAR_ROW_LABEL_CLASS,
  chartHorizontalBarFillWidthCss,
} from "@/components/dashboard/chartHorizontalBarFill";
import type { PortfolioProjectRiskSeverityRow } from "@/lib/dashboard/projectTileServerData";

/** Low → Medium → High → Extreme (ascending severity). */
const SEVERITY_ORDER = [
  { key: "low" as const, name: "Low" },
  { key: "medium" as const, name: "Medium" },
  { key: "high" as const, name: "High" },
  { key: "extreme" as const, name: "Extreme" },
] as const;

/** Semantic fills: E/H danger, M warning, L success (distinct from categorical chart series). */
const SEVERITY_BAR_STYLE: Record<(typeof SEVERITY_ORDER)[number]["key"], { backgroundColor: string }> = {
  extreme: { backgroundColor: "var(--ds-status-danger-strong-bg)" },
  high: { backgroundColor: "var(--ds-status-danger)" },
  medium: { backgroundColor: "var(--ds-status-warning)" },
  low: { backgroundColor: "var(--ds-status-success)" },
};

/** Matches `PortfolioRiskCategoryCountsTable` animation constants. */
const BAR_ANIMATION_BEGIN_S = 0.4;
const BAR_ANIMATION_DURATION_S = 1.5;
const BAR_ANIMATION_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const COUNT_REVEAL_DELAY_S = BAR_ANIMATION_BEGIN_S + BAR_ANIMATION_DURATION_S;
const COUNT_REVEAL_DURATION_S = 0.16;

function SeverityBarRow({
  name,
  count,
  widthPct,
  barStyle,
}: {
  name: string;
  count: number;
  widthPct: number;
  barStyle: { backgroundColor: string };
}) {
  const reduceMotion = useReducedMotion() === true;
  const instant = reduceMotion;

  return (
    <div className="flex items-center gap-3">
      <span
        className={CHART_HORIZONTAL_BAR_ROW_LABEL_CLASS}
        title={`${name} — current register rating`}
      >
        {name}
      </span>
      <div
        className="flex h-6 min-w-0 flex-1 overflow-hidden rounded-[var(--ds-chart-bar-radius)] bg-[var(--ds-chart-surface)]"
        aria-hidden={count === 0}
      >
        {count === 0 ? (
          <div className="flex h-full w-full items-center justify-start px-1.5">
            <span className="shrink-0 text-[length:var(--ds-text-xs)] font-medium tabular-nums leading-none text-[var(--ds-text-muted)]">
              0
            </span>
          </div>
        ) : (
          <div
            className="relative flex h-full shrink-0 items-center justify-end overflow-hidden rounded-[var(--ds-chart-bar-radius)] pr-1.5"
            style={{ width: chartHorizontalBarFillWidthCss(widthPct) }}
          >
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-[var(--ds-chart-bar-radius)]"
              style={{
                ...barStyle,
                opacity: "var(--ds-chart-opacity-default)",
                transformOrigin: "left center",
              }}
              initial={{ scaleX: instant ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: instant ? 0 : BAR_ANIMATION_DURATION_S,
                ease: BAR_ANIMATION_EASE,
                delay: instant ? 0 : BAR_ANIMATION_BEGIN_S,
              }}
              aria-hidden
            />
            <motion.span
              className="relative z-[1] shrink-0 text-[length:var(--ds-text-xs)] font-medium tabular-nums leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
              initial={instant ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={
                instant
                  ? { opacity: { duration: 0 } }
                  : {
                      opacity: {
                        duration: COUNT_REVEAL_DURATION_S,
                        delay: COUNT_REVEAL_DELAY_S,
                        ease: BAR_ANIMATION_EASE,
                      },
                    }
              }
            >
              {count}
            </motion.span>
          </div>
        )}
      </div>
    </div>
  );
}

export type PortfolioRiskSeverityCountsTableProps = {
  /** Per-project current-rating buckets; aggregated to portfolio totals (active risks only). */
  activeRiskSummaryRows: PortfolioProjectRiskSeverityRow[];
};

/**
 * Horizontal bars for the same current rating shown in the risk register.
 */
export function PortfolioRiskSeverityCountsTable({ activeRiskSummaryRows }: PortfolioRiskSeverityCountsTableProps) {
  const { totals, maxCount, summaryText } = useMemo(() => {
    const totals = { low: 0, medium: 0, high: 0, extreme: 0 };
    for (const row of activeRiskSummaryRows) {
      totals.low += row.low;
      totals.medium += row.medium;
      totals.high += row.high;
      totals.extreme += row.extreme;
    }
    const t = totals.low + totals.medium + totals.high + totals.extreme;
    const max = Math.max(totals.low, totals.medium, totals.high, totals.extreme, 1);
    const summary =
      t === 0
        ? "No active risks with current ratings in this portfolio."
        : `Low: ${totals.low}, Medium: ${totals.medium}, High: ${totals.high}, Extreme: ${totals.extreme}. Total ${t} active risks by current register rating.`;
    return { totals, maxCount: max, summaryText: summary };
  }, [activeRiskSummaryRows]);

  const widthPct = (count: number) => (count / maxCount) * 100;

  const totalActive =
    totals.low + totals.medium + totals.high + totals.extreme;

  if (totalActive === 0) {
    return (
      <p className="m-0 text-sm text-[var(--ds-text-muted)]">
        No active risks in this portfolio yet. Current rating counts (Low, Medium, High, Extreme) appear here once
        risks are recorded.
      </p>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      <p className="sr-only">{summaryText}</p>
      <div className="flex flex-col justify-center gap-2.5">
        {SEVERITY_ORDER.map((s) => (
          <SeverityBarRow
            key={s.key}
            name={s.name}
            count={totals[s.key]}
            widthPct={widthPct(totals[s.key])}
            barStyle={SEVERITY_BAR_STYLE[s.key]}
          />
        ))}
      </div>
    </div>
  );
}
