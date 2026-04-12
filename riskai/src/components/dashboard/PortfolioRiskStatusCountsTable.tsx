"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CHART_HORIZONTAL_BAR_ROW_LABEL_CLASS } from "@/components/dashboard/chartHorizontalBarFill";
import type { PortfolioRiskStatusCount } from "@/lib/dashboard/projectTileServerData";

/** Open → Monitoring → Mitigating (active risks only). */
const STATUS_BAR_STYLE: Record<
  PortfolioRiskStatusCount["statusKey"],
  { backgroundColor: string }
> = {
  open: { backgroundColor: "var(--ds-chart-series-1)" },
  monitoring: { backgroundColor: "var(--ds-status-warning)" },
  mitigating: { backgroundColor: "var(--ds-status-success)" },
};

const BAR_ANIMATION_BEGIN_S = 0.4;
const BAR_ANIMATION_DURATION_S = 1.5;
const BAR_ANIMATION_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const COUNT_REVEAL_DELAY_S = BAR_ANIMATION_BEGIN_S + BAR_ANIMATION_DURATION_S;
const COUNT_REVEAL_DURATION_S = 0.16;

function StatusBarRow({
  label,
  count,
  widthPct,
  barStyle,
}: {
  label: string;
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
        title={label}
      >
        {label}
      </span>
      <div className="flex h-6 min-w-0 flex-1 overflow-hidden rounded-[var(--ds-chart-bar-radius)] bg-[var(--ds-chart-surface)]">
        <div
          className="relative flex h-full min-w-0 shrink-0 items-center justify-end overflow-hidden rounded-[var(--ds-chart-bar-radius)] pr-1.5"
          style={{ width: `${widthPct}%` }}
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
      </div>
    </div>
  );
}

export type PortfolioRiskStatusCountsTableProps = {
  rows: PortfolioRiskStatusCount[];
};

/**
 * Horizontal bars for active lifecycle status (Open, Monitoring, Mitigating only).
 */
export function PortfolioRiskStatusCountsTable({ rows }: PortfolioRiskStatusCountsTableProps) {
  const { maxCount, summaryText } = useMemo(() => {
    const max = Math.max(...rows.map((r) => r.count), 1);
    const t = rows.reduce((a, r) => a + r.count, 0);
    const summary =
      rows.length === 0
        ? "No active risks in this portfolio."
        : `${rows.map((r) => `${r.label}: ${r.count}`).join(", ")}. Total ${t} active risks.`;
    return { maxCount: max, summaryText: summary };
  }, [rows]);

  const widthPct = (count: number) => (count / maxCount) * 100;

  if (rows.length === 0) {
    return (
      <p className="m-0 text-sm text-[var(--ds-text-muted)]">
        No active risks to show by status. Draft, closed, and archived risks are excluded.
      </p>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      <p className="sr-only">{summaryText}</p>
      <div className="flex flex-col justify-center gap-2.5">
        {rows.map((r) => (
          <StatusBarRow
            key={r.statusKey}
            label={r.label}
            count={r.count}
            widthPct={widthPct(r.count)}
            barStyle={STATUS_BAR_STYLE[r.statusKey]}
          />
        ))}
      </div>
    </div>
  );
}
