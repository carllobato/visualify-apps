"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CHART_HORIZONTAL_BAR_ROW_LABEL_CLASS,
  chartHorizontalBarFillWidthCss,
} from "@/components/dashboard/chartHorizontalBarFill";
import type { PortfolioRiskOwnerCount } from "@/lib/dashboard/projectTileServerData";

const CHART_SERIES = [
  "var(--ds-chart-series-1)",
  "var(--ds-chart-series-2)",
  "var(--ds-chart-series-3)",
  "var(--ds-chart-series-4)",
  "var(--ds-chart-series-5)",
  "var(--ds-chart-series-6)",
] as const;

const BAR_OPACITY = "var(--ds-chart-opacity-default)";
const COLLAPSED_ROW_LIMIT = 4;

export const PORTFOLIO_OWNER_BREAKDOWN_TRIGGER_ID = "portfolio-risk-owner-breakdown-trigger";
const BREAKDOWN_REGION_ID = "portfolio-risk-owner-breakdown";

export function PortfolioOwnerBreakdownTrigger({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      id={PORTFOLIO_OWNER_BREAKDOWN_TRIGGER_ID}
      className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--ds-radius-sm)] border border-transparent bg-transparent px-1.5 py-0.5 text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)] transition-colors hover:border-[color-mix(in_oklab,var(--ds-border)_80%,transparent)] hover:bg-[var(--ds-surface-inset)] hover:text-[var(--ds-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface)]"
      aria-expanded={open}
      aria-controls={BREAKDOWN_REGION_ID}
      onClick={onToggle}
    >
      <span>{open ? "Collapse" : "Show All"}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`pointer-events-none shrink-0 transition-transform duration-300 ease-in-out ${open ? "rotate-180" : ""}`}
        aria-hidden
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

const BAR_ANIMATION_BEGIN_S = 0.4;
const BAR_ANIMATION_DURATION_S = 1.5;
const BAR_ANIMATION_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const COUNT_REVEAL_DELAY_S = BAR_ANIMATION_BEGIN_S + BAR_ANIMATION_DURATION_S;
const COUNT_REVEAL_DURATION_S = 0.16;
const COUNT_HIDE_DURATION_S = 0.12;

function OwnerBarRow({
  owner,
  count,
  widthPct,
  colorIndex,
  expandDriven = false,
  expanded = true,
}: {
  owner: string;
  count: number;
  widthPct: number;
  colorIndex: number;
  expandDriven?: boolean;
  expanded?: boolean;
}) {
  const reduceMotion = useReducedMotion() === true;
  const instant = reduceMotion;
  const scaleTarget = instant ? 1 : expandDriven ? (expanded ? 1 : 0) : 1;
  const scaleInitial = instant ? 1 : 0;
  const transitionDelay =
    instant || (expandDriven && !expanded) ? 0 : BAR_ANIMATION_BEGIN_S;

  const labelHidden = instant ? false : expandDriven && !expanded;
  const opacityTarget = instant ? 1 : labelHidden ? 0 : 1;

  return (
    <div className="flex items-center gap-3">
      <span className={CHART_HORIZONTAL_BAR_ROW_LABEL_CLASS} title={owner}>
        {owner}
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
                backgroundColor: CHART_SERIES[colorIndex % CHART_SERIES.length],
                opacity: BAR_OPACITY,
                transformOrigin: "left center",
              }}
              initial={{ scaleX: scaleInitial }}
              animate={{ scaleX: scaleTarget }}
              transition={{
                duration: instant ? 0 : BAR_ANIMATION_DURATION_S,
                ease: BAR_ANIMATION_EASE,
                delay: transitionDelay,
              }}
              aria-hidden
            />
            <motion.span
              className="relative z-[1] shrink-0 text-[length:var(--ds-text-xs)] font-medium tabular-nums leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
              initial={instant ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: opacityTarget }}
              transition={
                instant
                  ? { opacity: { duration: 0 } }
                  : labelHidden
                    ? {
                        opacity: {
                          duration: COUNT_HIDE_DURATION_S,
                          delay: 0,
                          ease: BAR_ANIMATION_EASE,
                        },
                      }
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

type PortfolioRiskOwnerCountsTableProps = {
  rows: PortfolioRiskOwnerCount[];
  breakdownOpen: boolean;
  /**
   * When true, every owner row is shown (portfolio KPI modal). When false, dashboard card shows top four plus an
   * expandable remainder controlled by `breakdownOpen`.
   */
  showAllRows?: boolean;
};

/**
 * Horizontal bars for risk owner (archived excluded). Expand toggle in {@link DashboardCard} `headerActions`.
 */
export function PortfolioRiskOwnerCountsTable({
  rows,
  breakdownOpen,
  showAllRows = false,
}: PortfolioRiskOwnerCountsTableProps) {
  const { maxCount, topRows, rest, summaryText, sortedRows } = useMemo(() => {
    const s = [...rows].sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner));
    const max = Math.max(...s.map((r) => r.count), 1);
    const top = s.slice(0, COLLAPSED_ROW_LIMIT);
    const remainder = s.slice(COLLAPSED_ROW_LIMIT);
    const t = s.reduce((a, r) => a + r.count, 0);
    const summary =
      s.length === 0
        ? "No active risks in this portfolio."
        : `${s.map((r) => `${r.owner}: ${r.count}`).join(", ")}. Total ${t} active risks.`;
    return { maxCount: max, topRows: top, rest: remainder, summaryText: summary, sortedRows: s };
  }, [rows]);

  const widthPct = (count: number) => (count / maxCount) * 100;

  const breakdownRegionId = BREAKDOWN_REGION_ID;
  const breakdownRegionLabelledBy = PORTFOLIO_OWNER_BREAKDOWN_TRIGGER_ID;

  if (rows.length === 0) {
    return (
      <p className="m-0 text-sm text-[var(--ds-text-muted)]">
        No active risks to show by owner. Draft, closed, and archived risks are excluded.
      </p>
    );
  }

  if (showAllRows) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <p className="sr-only">{summaryText}</p>
        <div className="flex flex-col justify-start gap-2.5">
          {sortedRows.map((r, i) => (
            <OwnerBarRow
              key={r.owner}
              owner={r.owner}
              count={r.count}
              widthPct={widthPct(r.count)}
              colorIndex={i}
            />
          ))}
        </div>
      </div>
    );
  }

  const showBreakdownControl = rest.length > 0;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      <p className="sr-only">{summaryText}</p>

      <div className="flex flex-col justify-center gap-2.5">
        {topRows.map((r, i) => (
          <OwnerBarRow
            key={r.owner}
            owner={r.owner}
            count={r.count}
            widthPct={widthPct(r.count)}
            colorIndex={i}
          />
        ))}
      </div>

      {showBreakdownControl ? (
        <div
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${breakdownOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          aria-hidden={!breakdownOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              id={breakdownRegionId}
              role="region"
              aria-labelledby={breakdownRegionLabelledBy}
              className={`flex min-w-0 w-full flex-col gap-2.5 ${!breakdownOpen ? "pointer-events-none" : ""}`}
            >
              {rest.map((r, j) => (
                <OwnerBarRow
                  key={r.owner}
                  owner={r.owner}
                  count={r.count}
                  widthPct={widthPct(r.count)}
                  colorIndex={COLLAPSED_ROW_LIMIT + j}
                  expandDriven
                  expanded={breakdownOpen}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
