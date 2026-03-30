"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Button,
  Callout,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
} from "@visualify/design-system";
import { usePathname, useRouter } from "next/navigation";
import { useRiskRegister } from "@/store/risk-register.store";
import {
  getLatestSnapshot,
  setSnapshotAsReportingVersion,
  type SimulationSnapshotRow,
  type SimulationSnapshotRowDb,
} from "@/lib/db/snapshots";
import { listRisks, DEFAULT_PROJECT_ID } from "@/lib/db/risks";
import { fetchPublicProfile, formatTriggeredByLabel } from "@/lib/profiles/profileDb";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { useProjectPermissions } from "@/contexts/ProjectPermissionsContext";
import { DASHBOARD_PATH, projectIdFromAppPathname, riskaiPath } from "@/lib/routes";
import {
  getNeutralSummary,
  getNeutralSamples,
  getNeutralTimeSamples,
  getNeutralTimeSummary,
} from "@/store/selectors";
import { loadProjectContext, formatMoneyMillions, isProjectContextComplete } from "@/lib/projectContext";
import {
  formatDurationDays,
  formatDurationDaysBarLabel,
  formatDurationWholeDays,
} from "@/lib/formatDuration";
import {
  costAtPercentile,
  distributionToCostCdf,
  distributionToTimeCdf,
  binSamplesIntoHistogram,
  binSamplesIntoTimeHistogram,
  deriveCostHistogramFromPercentiles,
  deriveTimeHistogramFromPercentiles,
  percentileAtCost,
  percentileAtTime,
  timeAtPercentile,
  type CostCdfPoint,
  type TimeCdfPoint,
} from "@/lib/simulationDisplayUtils";
import {
  SimulationSection,
  type SimulationSectionBaseline,
  type CostResults,
  type TimeResults,
} from "@/components/simulation/SimulationSection";
import {
  StatusPositionCard,
  type StatusPositionTone,
} from "@/components/dashboard/StatusPositionCard";
import type { SimulationRiskSnapshot } from "@/domain/simulation/simulation.types";
import {
  isRiskStatusArchived,
  isRiskStatusClosed,
  isRiskStatusDraft,
} from "@/domain/risk/riskFieldSemantics";

const DISTRIBUTION_BIN_COUNT = 28;

/** Stable empty array for snapshot risks to avoid new [] identity every render. */
const EMPTY_SNAPSHOT_RISKS: SimulationRiskSnapshot[] = [];

function formatDash<T>(value: T | undefined | null, formatter: (v: T) => string): string {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return "—";
  return formatter(value as T);
}

/** Parse risk appetite e.g. "P80" -> 80. */
function riskAppetiteToPercent(riskAppetite: string): number {
  const n = parseInt(riskAppetite.replace(/^P/, ""), 10);
  return Number.isFinite(n) ? n : 50;
}

/** Used by schedule gantt bar track height scaling (same visual weight as the former baseline donut ring). */
const BASELINE_DONUT_STROKE = 10;
const BASELINE_DONUT_RING_THICKNESS_FRAC = BASELINE_DONUT_STROKE / 100;

type CostGanttHover =
  | "programme"
  | "works"
  | "contingency"
  | "requiredContingency"
  | "simulationOutcome"
  | null;

/** Treat near-zero cost deltas as matched for RAG (floating dollars). */
const COST_CONTINGENCY_GAP_EPS = 0.01;

function forecastCostValueClassFromGap(gapDollars: number | null): string {
  if (gapDollars == null || !Number.isFinite(gapDollars)) return "text-[var(--ds-text-muted)]";
  if (gapDollars > COST_CONTINGENCY_GAP_EPS) return "text-[var(--ds-status-danger-fg)]";
  if (gapDollars < -COST_CONTINGENCY_GAP_EPS) return "text-[var(--ds-status-success-fg)]";
  return "text-[var(--ds-status-warning-fg)]";
}

function forecastCostRagFromGap(gapDollars: number | null): {
  bandClass: string;
  dotClass: string;
  a11y: string;
} {
  if (gapDollars == null || !Number.isFinite(gapDollars)) {
    return {
      bandClass: "bg-[var(--ds-border)]",
      dotClass: "bg-[var(--ds-text-muted)]",
      a11y: "RAG not available: run or complete simulation to rate forecast cost versus contingency.",
    };
  }
  if (gapDollars > COST_CONTINGENCY_GAP_EPS) {
    return {
      bandClass: "bg-[var(--ds-status-danger)]",
      dotClass: "bg-[var(--ds-status-danger)]",
      a11y: "Red RAG: simulated cost at target P exceeds current contingency allowance.",
    };
  }
  if (gapDollars < -COST_CONTINGENCY_GAP_EPS) {
    return {
      bandClass: "bg-[var(--ds-status-success)]",
      dotClass: "bg-[var(--ds-status-success)]",
      a11y: "Green RAG: contingency headroom versus simulated cost at target P.",
    };
  }
  return {
    bandClass: "bg-[var(--ds-status-warning)]",
    dotClass: "bg-[var(--ds-status-warning)]",
    a11y: "Amber RAG: simulated cost at target P matches current contingency.",
  };
}

/**
 * Cost & contingency: Gantt-style bars aligned with the schedule card (total, works, current contingency, adjustment).
 *
 * Cost CDF values are usually incremental risk $ (same axis as contingency $). Like schedule (works + risk delay),
 * we compose simulated **total** as works + CDF when CDF is below works (incremental risk); otherwise CDF is treated as full total cost.
 */
function ProjectValueContingencyMetricCard({
  projectValueDisplay,
  contingencyDisplay,
  projectValue_m,
  contingencyValue_m,
  targetPLabel,
  costGapDisplay,
  simulatedTotalCostDollars,
  costContingencyGapDollars,
  breakdownOpen,
  setBreakdownOpen,
}: {
  projectValueDisplay: string;
  contingencyDisplay: string;
  projectValue_m: number | undefined;
  contingencyValue_m: number | undefined;
  targetPLabel: string;
  /** Same copy as cost position tile: required / surplus vs contingency at target P. */
  costGapDisplay: string;
  /** Simulated total cost (dollars) at target P from cost CDF. */
  simulatedTotalCostDollars: number | null;
  /** Simulated cost at target P minus contingency (dollars); drives footer RAG vs Cost position tile. */
  costContingencyGapDollars: number | null;
  breakdownOpen: boolean;
  setBreakdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [ganttHover, setGanttHover] = useState<CostGanttHover>(null);

  const pvOk = projectValue_m != null && Number.isFinite(projectValue_m) && projectValue_m > 0;
  const projectValueDollars = pvOk ? projectValue_m! * 1e6 : 0;

  const contingencyRawDollars =
    contingencyValue_m != null && Number.isFinite(contingencyValue_m)
      ? Math.max(0, contingencyValue_m * 1e6)
      : 0;
  const contingencyDollars = pvOk ? Math.min(contingencyRawDollars, projectValueDollars) : contingencyRawDollars;
  const worksDollars = pvOk ? Math.max(0, projectValueDollars - contingencyDollars) : 0;

  const worksDisplay = formatDash(
    pvOk ? worksDollars / 1e6 : null,
    (m) => formatMoneyMillions(m)
  );

  const simFromCdfDollars =
    simulatedTotalCostDollars != null && Number.isFinite(simulatedTotalCostDollars) && simulatedTotalCostDollars >= 0
      ? simulatedTotalCostDollars
      : null;

  /**
   * Simulated total cost at target P on the same $ scale as project value / works / contingency.
   * Incremental CDF: total = works + risk-at-P. Total CDF: value is already full project cost (≥ works).
   */
  const simulationResultTotalDollars =
    pvOk && simFromCdfDollars != null
      ? simFromCdfDollars >= worksDollars
        ? simFromCdfDollars
        : worksDollars + simFromCdfDollars
      : null;

  const programmeScaleDollars = pvOk ? projectValueDollars : 0;
  const simTotalDollars = simulationResultTotalDollars;

  const ganttMaxDollars =
    pvOk && programmeScaleDollars > 0
      ? Math.max(programmeScaleDollars, simTotalDollars ?? 0, 1e-9)
      : 0;

  /** Simulated contingency need above works (schedule: risk delay at P). */
  const totalContingencyRequiredDollars =
    simTotalDollars != null && Number.isFinite(simTotalDollars)
      ? Math.max(0, simTotalDollars - worksDollars)
      : null;

  /**
   * Row 3 extent + title (schedule parity): (simulated contingency need) − current contingency allowance.
   * Matches duration card’s (risk delay at P) − schedule contingency when CDF is incremental.
   */
  const contingencyGapDollars =
    totalContingencyRequiredDollars != null && Number.isFinite(totalContingencyRequiredDollars)
      ? totalContingencyRequiredDollars - contingencyDollars
      : null;

  const plannedPct =
    pvOk && ganttMaxDollars > 0 ? (programmeScaleDollars / ganttMaxDollars) * 100 : 0;
  const simResultPct =
    pvOk && ganttMaxDollars > 0 && simTotalDollars != null && Number.isFinite(simTotalDollars)
      ? (simTotalDollars / ganttMaxDollars) * 100
      : plannedPct;

  const worksPctScaled =
    pvOk && ganttMaxDollars > 0 ? (worksDollars / ganttMaxDollars) * 100 : 0;
  const contingencyPctScaled =
    pvOk && ganttMaxDollars > 0 ? (contingencyDollars / ganttMaxDollars) * 100 : 0;
  const programmeEndPct = worksPctScaled + contingencyPctScaled;

  const topOutcomeExtensionPct =
    simTotalDollars != null &&
    Number.isFinite(simTotalDollars) &&
    simTotalDollars > programmeScaleDollars &&
    ganttMaxDollars > 0
      ? simResultPct - plannedPct
      : 0;

  const topOutcomePullbackPct =
    simTotalDollars != null &&
    Number.isFinite(simTotalDollars) &&
    simTotalDollars < programmeScaleDollars &&
    ganttMaxDollars > 0
      ? plannedPct - simResultPct
      : 0;
  const topOutcomePullbackLeftPct = simResultPct;

  const row3PositiveAdj =
    contingencyGapDollars != null &&
    Number.isFinite(contingencyGapDollars) &&
    contingencyGapDollars > COST_CONTINGENCY_GAP_EPS &&
    ganttMaxDollars > 0;
  const row3NegativeAdj =
    contingencyGapDollars != null &&
    Number.isFinite(contingencyGapDollars) &&
    contingencyGapDollars < -COST_CONTINGENCY_GAP_EPS &&
    ganttMaxDollars > 0;

  const row3RedLeftPct = programmeEndPct;
  const row3RedWidthPct = row3PositiveAdj ? (contingencyGapDollars! / ganttMaxDollars) * 100 : 0;

  const row3GreenWidthPct = row3NegativeAdj ? (Math.abs(contingencyGapDollars!) / ganttMaxDollars) * 100 : 0;
  const row3GreenLeftPct =
    row3NegativeAdj && simTotalDollars != null && Number.isFinite(simTotalDollars) && ganttMaxDollars > 0
      ? (simTotalDollars / ganttMaxDollars) * 100
      : 0;

  const adjustmentMagnitudeBarLabel =
    contingencyGapDollars != null &&
    Number.isFinite(contingencyGapDollars) &&
    Math.abs(contingencyGapDollars) > COST_CONTINGENCY_GAP_EPS
      ? formatMoneyMillions(Math.abs(contingencyGapDollars) / 1e6)
      : "";

  const headlineOverUnderBarLabel =
    simTotalDollars != null &&
    Number.isFinite(simTotalDollars) &&
    programmeScaleDollars > 0 &&
    Math.abs(simTotalDollars - programmeScaleDollars) > COST_CONTINGENCY_GAP_EPS
      ? formatMoneyMillions(Math.abs(simTotalDollars - programmeScaleDollars) / 1e6)
      : "";

  const contingencyAdjustmentRowTitle =
    contingencyGapDollars != null && Number.isFinite(contingencyGapDollars) && contingencyGapDollars > COST_CONTINGENCY_GAP_EPS
      ? "Contingency shortfall"
      : contingencyGapDollars != null &&
          Number.isFinite(contingencyGapDollars) &&
          contingencyGapDollars < -COST_CONTINGENCY_GAP_EPS
        ? "Contingency Opportunity"
        : "Contingency adjustment";

  const simulationTotalDisplay = formatDash(simTotalDollars, (d) => formatMoneyMillions(d / 1e6));

  const plannedBarLabel =
    pvOk && programmeScaleDollars > 0 ? formatMoneyMillions(programmeScaleDollars / 1e6) : "—";
  const worksBarLabel = pvOk ? formatMoneyMillions(worksDollars / 1e6) : "—";
  const contingencyBarLabel =
    contingencyValue_m != null && Number.isFinite(contingencyValue_m)
      ? formatMoneyMillions(Math.max(0, contingencyValue_m))
      : "—";

  const additionalContingencyRequiredDollars =
    totalContingencyRequiredDollars != null &&
    Number.isFinite(totalContingencyRequiredDollars) &&
    programmeScaleDollars > 0
      ? Math.max(0, totalContingencyRequiredDollars - contingencyDollars)
      : null;

  const opacityFor = (seg: CostGanttHover) => {
    if (!ganttHover) {
      if (seg === "works" || seg === "contingency" || seg === "requiredContingency") {
        return 0.6;
      }
      return 0.92;
    }

    if (ganttHover === "programme") {
      if (seg === "programme" || seg === "works" || seg === "contingency") return 1;
    }
    if (ganttHover === "works") {
      if (seg === "works" || seg === "programme") return 1;
      return 0.38;
    }
    if (ganttHover === "contingency") {
      if (seg === "contingency" || seg === "programme") return 1;
      return 0.38;
    }

    const simAdjSeg = seg === "simulationOutcome" || seg === "requiredContingency";
    const hoverSimAdj =
      ganttHover === "simulationOutcome" || ganttHover === "requiredContingency";
    if (hoverSimAdj && simAdjSeg) return 1;

    return ganttHover === seg ? 1 : 0.38;
  };

  const contingencyGapDisplayForSummary = (() => {
    if (contingencyGapDollars == null || !Number.isFinite(contingencyGapDollars)) return "—";
    if (Math.abs(contingencyGapDollars) < COST_CONTINGENCY_GAP_EPS) return "matched to current contingency";
    const mag = formatMoneyMillions(Math.abs(contingencyGapDollars) / 1e6);
    if (contingencyGapDollars > COST_CONTINGENCY_GAP_EPS) return `${mag} additional contingency required`;
    return `${mag} contingency surplus`;
  })();

  const chartSummary = pvOk
    ? `Forecast total cost at ${targetPLabel}: project value ${projectValueDisplay}, simulated total ${simulationTotalDisplay}. Breakdown: works ${worksDisplay}, current contingency ${contingencyDisplay}. Adjustment: ${contingencyGapDisplayForSummary}. Cost position vs contingency: ${costGapDisplay}.`
    : `Cost bars not shown. Project value ${projectValueDisplay}.`;

  const ganttHeadlineTrackHeightStyle: React.CSSProperties = {
    // minHeight: if `cqw`/clamp is unsupported, invalid `height` must not collapse the track (mobile Safari / older browsers).
    minHeight: "0.75rem",
    height: `clamp(0.75rem, calc(${BASELINE_DONUT_RING_THICKNESS_FRAC * 2.2} * min(24rem, max(6rem, 22cqw))), 2.75rem)`,
    minWidth: 0,
  };
  const ganttTrackHeightStyle: React.CSSProperties = {
    minHeight: "0.5rem",
    height: `clamp(0.5rem, calc(${BASELINE_DONUT_RING_THICKNESS_FRAC * 1.4} * min(24rem, max(6rem, 22cqw))), 1.75rem)`,
    minWidth: 0,
  };

  const ganttSegmentRadius: React.CSSProperties = {
    borderTopLeftRadius: "var(--ds-chart-bar-radius)",
    borderTopRightRadius: "var(--ds-chart-bar-radius)",
    borderBottomLeftRadius: "var(--ds-chart-bar-radius)",
    borderBottomRightRadius: "var(--ds-chart-bar-radius)",
  };

  const ganttBarLabelClassName =
    "pointer-events-none absolute inset-y-0 z-[1] flex min-w-0 flex-col justify-center overflow-hidden px-1 text-[length:var(--ds-text-xs)] font-semibold leading-none tabular-nums text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]";

  const forecastCostValueClass = forecastCostValueClassFromGap(costContingencyGapDollars);
  const forecastCostRag = forecastCostRagFromGap(costContingencyGapDollars);

  const ganttRowHeaderClass =
    "mb-1 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5";
  const ganttRowLabelClass =
    "m-0 min-w-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]";
  const ganttRowValueClass =
    "m-0 shrink-0 text-[length:var(--ds-text-sm)] font-semibold tabular-nums text-[var(--ds-text-primary)]";

  const trackShellClassName =
    "relative z-[1] min-h-0 w-full min-w-0 overflow-hidden rounded-[var(--ds-chart-bar-radius)] border border-[var(--ds-border)] bg-[var(--ds-surface-inset)]";
  const trackShellClassNameNoBorder =
    "relative z-[1] min-h-0 w-full min-w-0 overflow-hidden rounded-[var(--ds-chart-bar-radius)] bg-[var(--ds-surface-inset)]";

  return (
    <Card
      variant="inset"
      className="flex w-full min-w-0 flex-col border-0 text-[var(--ds-text-secondary)]"
    >
      <CardContent className="flex w-full min-w-0 flex-col p-4">
        <div
          className="flex w-full min-w-0 flex-col gap-3"
          role="group"
          aria-label="Project value and cost contingency"
          onPointerLeave={(e) => {
            const next = e.relatedTarget as Node | null;
            if (!next || !e.currentTarget.contains(next)) setGanttHover(null);
          }}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="m-0 min-w-0 flex-1 text-center text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)] sm:text-left">
              Cost & contingency
            </p>
            {pvOk ? (
              <button
                type="button"
                id="cost-contingency-breakdown-trigger"
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--ds-radius-sm)] border border-transparent bg-transparent px-1.5 py-0.5 text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)] transition-colors hover:border-[color-mix(in_oklab,var(--ds-border)_80%,transparent)] hover:bg-[var(--ds-surface-inset)] hover:text-[var(--ds-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface)]"
                aria-expanded={breakdownOpen}
                aria-controls="cost-contingency-breakdown"
                onClick={() => setBreakdownOpen((o) => !o)}
              >
                <span>{breakdownOpen ? "Hide" : "Show"} breakdown</span>
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
                  className={`pointer-events-none shrink-0 transition-transform duration-300 ease-in-out ${breakdownOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            ) : null}
          </div>
          <div
            className={`flex w-full min-w-0 flex-col ${breakdownOpen ? "gap-3" : "gap-0"}`}
          >
            {pvOk ? (
              <div
                className={`flex w-full max-w-full min-w-0 flex-col gap-2.5${breakdownOpen ? " sm:min-h-[5.25rem]" : ""}`}
                role="img"
                aria-label={`${chartSummary}`}
              >
                <div className="min-w-0">
                  <div className={ganttRowHeaderClass}>
                    <p className={ganttRowLabelClass}>
                      Total <span className="normal-case tracking-normal">({targetPLabel})</span>
                    </p>
                    <p className={ganttRowValueClass}>{simulationTotalDisplay}</p>
                  </div>
                  <div className={trackShellClassName} style={ganttHeadlineTrackHeightStyle}>
                    {plannedPct > 0 && (
                      <>
                        <button
                          type="button"
                          className="absolute inset-y-0 left-0 z-[1] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                          style={{
                            width: `${plannedPct}%`,
                            backgroundColor: "var(--ds-chart-series-1)",
                            opacity: opacityFor("programme"),
                            ...ganttSegmentRadius,
                          }}
                          onPointerEnter={() => setGanttHover("programme")}
                          aria-label={`Project value ${projectValueDisplay}`}
                        />
                        <span
                          className={ganttBarLabelClassName}
                          style={{ left: 0, width: `${plannedPct}%` }}
                          aria-hidden
                        >
                          <span className="block min-w-0 w-full truncate text-center">{plannedBarLabel}</span>
                        </span>
                      </>
                    )}
                    {topOutcomeExtensionPct > 0 && (
                      <button
                        type="button"
                        className="absolute inset-y-0 z-[2] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                        style={{
                          left: `${plannedPct}%`,
                          width: `${topOutcomeExtensionPct}%`,
                          backgroundColor: "var(--ds-status-danger)",
                          opacity: opacityFor("simulationOutcome"),
                          ...ganttSegmentRadius,
                        }}
                        onPointerEnter={() => setGanttHover("simulationOutcome")}
                        aria-label={`Simulated cost exceeds project value by ${formatMoneyMillions((simTotalDollars! - programmeScaleDollars) / 1e6)}`}
                      />
                    )}
                    {topOutcomePullbackPct > 0 && (
                      <button
                        type="button"
                        className="absolute inset-y-0 z-[2] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                        style={{
                          left: `${topOutcomePullbackLeftPct}%`,
                          width: `${topOutcomePullbackPct}%`,
                          backgroundColor: "color-mix(in oklab, var(--ds-status-success) 52%, var(--ds-surface-inset))",
                          opacity: opacityFor("simulationOutcome"),
                          ...ganttSegmentRadius,
                        }}
                        onPointerEnter={() => setGanttHover("simulationOutcome")}
                        aria-label={`Simulated cost under project value by ${formatMoneyMillions((programmeScaleDollars - simTotalDollars!) / 1e6)}`}
                      />
                    )}
                    {plannedPct > 0 ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 z-[2] min-w-0"
                        style={{
                          width: `${plannedPct}%`,
                          opacity: opacityFor("programme"),
                          boxShadow: "inset 0 0 0 2px var(--ds-primary-hover)",
                          ...ganttSegmentRadius,
                        }}
                      />
                    ) : null}
                    {topOutcomeExtensionPct > 0 && headlineOverUnderBarLabel !== "" ? (
                      <span
                        className={ganttBarLabelClassName}
                        style={{
                          left: `${plannedPct}%`,
                          width: `${topOutcomeExtensionPct}%`,
                          zIndex: 3,
                        }}
                        aria-hidden
                      >
                        <span className="block min-w-0 w-full truncate text-center">
                          {headlineOverUnderBarLabel}
                        </span>
                      </span>
                    ) : null}
                    {topOutcomePullbackPct > 0 && headlineOverUnderBarLabel !== "" ? (
                      <span
                        className={ganttBarLabelClassName}
                        style={{
                          left: `${topOutcomePullbackLeftPct}%`,
                          width: `${topOutcomePullbackPct}%`,
                          zIndex: 3,
                        }}
                        aria-hidden
                      >
                        <span className="block min-w-0 w-full truncate text-center">
                          {headlineOverUnderBarLabel}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${breakdownOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  aria-hidden={!breakdownOpen}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      id="cost-contingency-breakdown"
                      role="region"
                      aria-labelledby="cost-contingency-breakdown-trigger"
                      className={`flex min-w-0 w-full flex-col gap-2.5 border-t border-[var(--ds-border)] pt-2.5 ${!breakdownOpen ? "pointer-events-none" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className={ganttRowHeaderClass}>
                          <p className={ganttRowLabelClass}>Works</p>
                        </div>
                        <div className={trackShellClassNameNoBorder} style={ganttTrackHeightStyle}>
                          {worksPctScaled > 0 && (
                            <>
                              <button
                                type="button"
                                className="absolute inset-y-0 left-0 z-0 min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                                style={{
                                  width: `${worksPctScaled}%`,
                                  backgroundColor: "var(--ds-chart-series-1)",
                                  opacity: opacityFor("works"),
                                  ...ganttSegmentRadius,
                                }}
                                onPointerEnter={() => setGanttHover("works")}
                                aria-label={`Works ${worksDisplay}`}
                              />
                              <span
                                className={ganttBarLabelClassName}
                                style={{ left: 0, width: `${worksPctScaled}%`, opacity: opacityFor("works") }}
                                aria-hidden
                              >
                                <span className="block min-w-0 w-full truncate text-center">{worksBarLabel}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className={ganttRowHeaderClass}>
                          <p className={ganttRowLabelClass}>Current contingency</p>
                        </div>
                        <div className={trackShellClassNameNoBorder} style={ganttTrackHeightStyle}>
                          {contingencyPctScaled > 0 && (
                            <>
                              <button
                                type="button"
                                className="absolute inset-y-0 z-0 min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                                style={{
                                  left: `${worksPctScaled}%`,
                                  width: `${contingencyPctScaled}%`,
                                  backgroundColor: "var(--ds-status-warning)",
                                  opacity: opacityFor("contingency"),
                                  ...ganttSegmentRadius,
                                }}
                                onPointerEnter={() => setGanttHover("contingency")}
                                aria-label={`Current contingency ${contingencyDisplay}`}
                              />
                              <span
                                className={ganttBarLabelClassName}
                                style={{
                                  left: `${worksPctScaled}%`,
                                  width: `${contingencyPctScaled}%`,
                                  opacity: opacityFor("contingency"),
                                }}
                                aria-hidden
                              >
                                <span className="block min-w-0 w-full truncate text-center">{contingencyBarLabel}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className={ganttRowHeaderClass}>
                          <p className={ganttRowLabelClass}>
                            {contingencyAdjustmentRowTitle}{" "}
                            <span className="normal-case tracking-normal">({targetPLabel})</span>
                          </p>
                        </div>
                        <div className={trackShellClassNameNoBorder} style={ganttTrackHeightStyle}>
                          {simFromCdfDollars == null ? (
                            <span className="pointer-events-none flex h-full w-full items-center px-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                              Run simulation to compare at {targetPLabel}
                            </span>
                          ) : (
                            <div className="relative min-h-0 h-full w-full">
                              {row3RedWidthPct > 0 && (
                                <>
                                  <button
                                    type="button"
                                    className="absolute inset-y-0 z-[1] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                                    style={{
                                      left: `${row3RedLeftPct}%`,
                                      width: `${row3RedWidthPct}%`,
                                      backgroundColor: "var(--ds-status-danger)",
                                      opacity: opacityFor("requiredContingency"),
                                      ...ganttSegmentRadius,
                                    }}
                                    onPointerEnter={() => setGanttHover("requiredContingency")}
                                    aria-label={`Additional contingency required beyond current allowance ${formatMoneyMillions((additionalContingencyRequiredDollars ?? 0) / 1e6)}`}
                                  />
                                  {adjustmentMagnitudeBarLabel !== "" && (
                                    <span
                                      className={ganttBarLabelClassName}
                                      style={{
                                        left: `${row3RedLeftPct}%`,
                                        width: `${row3RedWidthPct}%`,
                                        zIndex: 2,
                                        opacity: opacityFor("requiredContingency"),
                                      }}
                                      aria-hidden
                                    >
                                      <span className="block min-w-0 w-full truncate text-center">
                                        {adjustmentMagnitudeBarLabel}
                                      </span>
                                    </span>
                                  )}
                                </>
                              )}
                              {row3GreenWidthPct > 0 && (
                                <>
                                  <button
                                    type="button"
                                    className="absolute inset-y-0 z-[1] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                                    style={{
                                      left: `${row3GreenLeftPct}%`,
                                      width: `${row3GreenWidthPct}%`,
                                      backgroundColor: "color-mix(in oklab, var(--ds-status-success) 55%, var(--ds-surface-inset))",
                                      opacity: opacityFor("requiredContingency"),
                                      ...ganttSegmentRadius,
                                    }}
                                    onPointerEnter={() => setGanttHover("requiredContingency")}
                                    aria-label={`Contingency surplus ${formatMoneyMillions(Math.abs(contingencyGapDollars!) / 1e6)}`}
                                  />
                                  {adjustmentMagnitudeBarLabel !== "" && (
                                    <span
                                      className={ganttBarLabelClassName}
                                      style={{
                                        left: `${row3GreenLeftPct}%`,
                                        width: `${row3GreenWidthPct}%`,
                                        zIndex: 2,
                                        opacity: opacityFor("requiredContingency"),
                                      }}
                                      aria-hidden
                                    >
                                      <span className="block min-w-0 w-full truncate text-center">
                                        {adjustmentMagnitudeBarLabel}
                                      </span>
                                    </span>
                                  )}
                                </>
                              )}
                              {contingencyGapDollars != null &&
                                Number.isFinite(contingencyGapDollars) &&
                                Math.abs(contingencyGapDollars) < COST_CONTINGENCY_GAP_EPS && (
                                  <span className="pointer-events-none flex h-full w-full items-center px-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                                    Matched to current contingency
                                  </span>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="flex min-h-[5rem] w-full flex-col items-center justify-center gap-1 rounded-[var(--ds-radius-md)] border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-inset)] px-2 text-center"
                role="img"
                aria-label={`${chartSummary}`}
              >
                <span className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Project value
                </span>
                <span className="text-[length:var(--ds-text-base)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
                  {projectValueDisplay}
                </span>
              </div>
            )}

            <div
              className={`w-full max-w-full border-t border-[var(--ds-border)] ${breakdownOpen ? "pt-3" : "pt-2.5"}`}
              role="group"
              aria-label={`Forecast cost at ${targetPLabel}: ${costGapDisplay}. ${forecastCostRag.a11y}`}
            >
              <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                Forecast cost <span className="normal-case tracking-normal">({targetPLabel})</span>
              </p>
              <div
                className={`mt-2 h-1 w-full shrink-0 rounded-full ${forecastCostRag.bandClass}`}
                aria-hidden
              />
              <div className="mt-2 flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${forecastCostRag.dotClass}`}
                  aria-hidden
                />
                <p
                  className={`m-0 min-w-0 text-[length:var(--ds-text-lg)] font-semibold leading-snug tabular-nums ${forecastCostValueClass}`}
                >
                  {costGapDisplay}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ScheduleGanttHover =
  | "programme"
  | "works"
  | "contingency"
  | "requiredContingency"
  | "simulationOutcome"
  | null;

/**
 * Duration & schedule contingency: headline bar (forecast programme duration vs planned) plus three Gantt rows
 * (works, current contingency, contingency adjustment vs simulation).
 */
function ScheduleDurationContingencyGanttCard({
  plannedDurationDays,
  scheduleContingencyDays,
  simulationRiskDelayDays,
  targetPLabel,
  scheduleVsContingencyText: _scheduleVsContingencyText,
  forecastCompletionDateDisplay,
  breakdownOpen,
  setBreakdownOpen,
}: {
  plannedDurationDays: number | undefined;
  scheduleContingencyDays: number | null;
  /** Risk delay days at target P from the schedule simulation CDF (same axis as schedule contingency). */
  simulationRiskDelayDays: number | null | undefined;
  targetPLabel: string;
  /** Simulated risk delay at target P minus schedule contingency: "X required" or "X buffer". */
  scheduleVsContingencyText: string;
  /** Target completion date shifted by (risk delay at P − schedule contingency days), formatted. */
  forecastCompletionDateDisplay: string;
  breakdownOpen: boolean;
  setBreakdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  void _scheduleVsContingencyText;
  const [ganttHover, setGanttHover] = useState<ScheduleGanttHover>(null);

  const plannedOk =
    plannedDurationDays != null && Number.isFinite(plannedDurationDays) && plannedDurationDays > 0;
  const contingencyRaw =
    scheduleContingencyDays != null && Number.isFinite(scheduleContingencyDays)
      ? Math.max(0, scheduleContingencyDays)
      : 0;
  const contingencyDays = plannedOk ? Math.min(contingencyRaw, plannedDurationDays!) : contingencyRaw;
  const worksDays = plannedOk ? Math.max(0, plannedDurationDays! - contingencyDays) : 0;

  const plannedDisplay = formatDash(plannedDurationDays, formatDurationDays);
  const worksDisplay = plannedOk ? formatDurationDays(worksDays) : "—";
  const contingencyDisplay =
    scheduleContingencyDays != null && Number.isFinite(scheduleContingencyDays)
      ? formatDurationWholeDays(Math.max(0, scheduleContingencyDays))
      : "—";
  const simulationDisplay = formatDash(simulationRiskDelayDays, formatDurationDays);

  const worksBarLabel = plannedOk ? formatDurationDaysBarLabel(worksDays) : "—";
  const contingencyBarLabel =
    scheduleContingencyDays != null && Number.isFinite(scheduleContingencyDays)
      ? formatDurationDaysBarLabel(Math.max(0, scheduleContingencyDays))
      : "—";

  /** Risk delay (days) at target P from the schedule CDF — same axis as schedule contingency, not full programme length. */
  const simulationDays =
    simulationRiskDelayDays != null && Number.isFinite(simulationRiskDelayDays) && simulationRiskDelayDays >= 0
      ? simulationRiskDelayDays
      : null;

  /** Simulated programme duration at target P (works + risk delay at P). */
  const simulationResultTotalDays =
    plannedOk && simulationDays != null ? worksDays + simulationDays : null;

  /** Total contingency implied by simulation at target P: simulation result minus works (same as risk delay at P). */
  const totalContingencyRequiredDays =
    plannedOk && simulationResultTotalDays != null
      ? Math.max(0, simulationResultTotalDays - worksDays)
      : null;

  const contingencyGapDays =
    totalContingencyRequiredDays != null && Number.isFinite(totalContingencyRequiredDays)
      ? totalContingencyRequiredDays - contingencyDays
      : null;

  const contingencyGapDisplay = (() => {
    if (contingencyGapDays == null || !Number.isFinite(contingencyGapDays)) return "—";
    if (contingencyGapDays === 0) return "Matched to current contingency";
    const mag = formatDurationDays(Math.abs(contingencyGapDays));
    if (mag === "—") return "—";
    if (contingencyGapDays > 0) return `${mag} additional contingency required`;
    return `${mag} contingency surplus`;
  })();

  /** Baseline programme duration (days). */
  const programmeScaleDays = plannedOk ? plannedDurationDays! : 0;

  const plannedBarLabel = plannedOk ? formatDurationDaysBarLabel(programmeScaleDays) : "—";

  const additionalContingencyRequiredDays =
    totalContingencyRequiredDays != null &&
    Number.isFinite(totalContingencyRequiredDays) &&
    programmeScaleDays > 0
      ? Math.max(0, totalContingencyRequiredDays - contingencyDays)
      : null;

  const simTotalDays = simulationResultTotalDays;

  const ganttMaxDays =
    plannedOk && programmeScaleDays > 0
      ? Math.max(programmeScaleDays, simTotalDays ?? 0, 1e-9)
      : 0;

  const plannedPct =
    plannedOk && ganttMaxDays > 0 ? (programmeScaleDays / ganttMaxDays) * 100 : 0;
  const simResultPct =
    plannedOk && ganttMaxDays > 0 && simTotalDays != null && Number.isFinite(simTotalDays)
      ? (simTotalDays / ganttMaxDays) * 100
      : plannedPct;

  const worksPctScaled =
    plannedOk && ganttMaxDays > 0 ? (worksDays / ganttMaxDays) * 100 : 0;
  const contingencyPctScaled =
    plannedOk && ganttMaxDays > 0 ? (contingencyDays / ganttMaxDays) * 100 : 0;
  const programmeEndPct = worksPctScaled + contingencyPctScaled;

  /** Headline: simulated duration beyond programme (light stress). */
  const topOutcomeExtensionPct =
    simTotalDays != null &&
    Number.isFinite(simTotalDays) &&
    simTotalDays > programmeScaleDays &&
    ganttMaxDays > 0
      ? simResultPct - plannedPct
      : 0;

  /** Headline: simulated total short of programme (pullback / buffer). */
  const topOutcomePullbackPct =
    simTotalDays != null &&
    Number.isFinite(simTotalDays) &&
    simTotalDays < programmeScaleDays &&
    ganttMaxDays > 0
      ? plannedPct - simResultPct
      : 0;
  const topOutcomePullbackLeftPct = simResultPct;

  const adjGap = contingencyGapDays;
  const row3PositiveAdj =
    adjGap != null && Number.isFinite(adjGap) && adjGap > 0 && ganttMaxDays > 0;
  const row3NegativeAdj =
    adjGap != null && Number.isFinite(adjGap) && adjGap < 0 && ganttMaxDays > 0;

  /** Adjustment row: anchor at end of current contingency (end of planned composition). */
  const row3RedLeftPct = programmeEndPct;
  const row3RedWidthPct = row3PositiveAdj ? (adjGap / ganttMaxDays) * 100 : 0;

  const row3GreenWidthPct = row3NegativeAdj ? (Math.abs(adjGap) / ganttMaxDays) * 100 : 0;
  const row3GreenLeftPct =
    row3NegativeAdj && totalContingencyRequiredDays != null && Number.isFinite(totalContingencyRequiredDays)
      ? ((worksDays + totalContingencyRequiredDays) / ganttMaxDays) * 100
      : 0;

  const adjustmentMagnitudeBarLabel =
    adjGap != null && Number.isFinite(adjGap) && adjGap !== 0
      ? formatDurationDaysBarLabel(Math.abs(adjGap))
      : "";

  const contingencyAdjustmentRowTitle =
    adjGap != null && Number.isFinite(adjGap) && adjGap > 0
      ? "Contingency shortfall"
      : adjGap != null && Number.isFinite(adjGap) && adjGap < 0
        ? "Contingency Opportunity"
        : "Contingency adjustment";

  const simulationTotalDisplay = formatDash(simTotalDays, formatDurationDays);

  const opacityFor = (seg: ScheduleGanttHover) => {
    if (!ganttHover) {
      if (seg === "works" || seg === "contingency" || seg === "requiredContingency") {
        return 0.6;
      }
      return 0.92;
    }

    /** Headline programme bar links to both breakdown rows. */
    if (ganttHover === "programme") {
      if (seg === "programme" || seg === "works" || seg === "contingency") return 1;
    }
    /** Breakdown hovers light that segment plus the headline programme bar, not the sibling breakdown. */
    if (ganttHover === "works") {
      if (seg === "works" || seg === "programme") return 1;
      return 0.38;
    }
    if (ganttHover === "contingency") {
      if (seg === "contingency" || seg === "programme") return 1;
      return 0.38;
    }

    const simAdjSeg = seg === "simulationOutcome" || seg === "requiredContingency";
    const hoverSimAdj =
      ganttHover === "simulationOutcome" || ganttHover === "requiredContingency";
    if (hoverSimAdj && simAdjSeg) return 1;

    return ganttHover === seg ? 1 : 0.38;
  };

  const chartSummary = plannedOk
    ? `Forecast programme duration at ${targetPLabel}: planned ${plannedDisplay}, simulated total ${simulationTotalDisplay}. Breakdown: works ${worksDisplay}, current contingency ${contingencyDisplay}. Adjustment: ${contingencyGapDisplay}.`
    : `Schedule bars not shown. Simulation at ${targetPLabel}: ${simulationDisplay}.`;

  /** Bar track height scales with this card column width (`container-type: inline-size` on the grid column wrapper). */
  const ganttHeadlineTrackHeightStyle: React.CSSProperties = {
    // minHeight: if `cqw`/clamp is unsupported, invalid `height` must not collapse the track (mobile Safari / older browsers).
    minHeight: "0.75rem",
    height: `clamp(0.75rem, calc(${BASELINE_DONUT_RING_THICKNESS_FRAC * 2.2} * min(24rem, max(6rem, 22cqw))), 2.75rem)`,
    minWidth: 0,
  };
  const ganttTrackHeightStyle: React.CSSProperties = {
    minHeight: "0.5rem",
    height: `clamp(0.5rem, calc(${BASELINE_DONUT_RING_THICKNESS_FRAC * 1.4} * min(24rem, max(6rem, 22cqw))), 1.75rem)`,
    minWidth: 0,
  };

  const ganttSegmentRadius: React.CSSProperties = {
    borderTopLeftRadius: "var(--ds-chart-bar-radius)",
    borderTopRightRadius: "var(--ds-chart-bar-radius)",
    borderBottomLeftRadius: "var(--ds-chart-bar-radius)",
    borderBottomRightRadius: "var(--ds-chart-bar-radius)",
  };

  const ganttBarLabelClassName =
    "pointer-events-none absolute inset-y-0 z-[1] flex min-w-0 flex-col justify-center overflow-hidden px-1 text-[length:var(--ds-text-xs)] font-semibold leading-none tabular-nums text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]";

  const forecastCompletionValueClass = (() => {
    if (contingencyGapDays == null || !Number.isFinite(contingencyGapDays)) return "text-[var(--ds-text-muted)]";
    if (contingencyGapDays > 0) return "text-[var(--ds-status-danger-fg)]";
    if (contingencyGapDays < 0) return "text-[var(--ds-status-success-fg)]";
    return "text-[var(--ds-status-warning-fg)]";
  })();

  const forecastCompletionRag: { bandClass: string; dotClass: string; a11y: string } = (() => {
    if (contingencyGapDays == null || !Number.isFinite(contingencyGapDays)) {
      return {
        bandClass: "bg-[var(--ds-border)]",
        dotClass: "bg-[var(--ds-text-muted)]",
        a11y: "RAG not available: run or complete simulation to rate forecast versus contingency.",
      };
    }
    if (contingencyGapDays > 0) {
      return {
        bandClass: "bg-[var(--ds-status-danger)]",
        dotClass: "bg-[var(--ds-status-danger)]",
        a11y: "Red RAG: contingency shortfall versus current allowance at target P.",
      };
    }
    if (contingencyGapDays < 0) {
      return {
        bandClass: "bg-[var(--ds-status-success)]",
        dotClass: "bg-[var(--ds-status-success)]",
        a11y: "Green RAG: contingency surplus at target P.",
      };
    }
    return {
      bandClass: "bg-[var(--ds-status-warning)]",
      dotClass: "bg-[var(--ds-status-warning)]",
      a11y: "Amber RAG: matched to current contingency at target P.",
    };
  })();

  const ganttRowHeaderClass =
    "mb-1 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5";
  const ganttRowLabelClass =
    "m-0 min-w-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]";
  const ganttRowValueClass =
    "m-0 shrink-0 text-[length:var(--ds-text-sm)] font-semibold tabular-nums text-[var(--ds-text-primary)]";

  const trackShellClassName =
    "relative z-[1] min-h-0 w-full min-w-0 overflow-hidden rounded-[var(--ds-chart-bar-radius)] border border-[var(--ds-border)] bg-[var(--ds-surface-inset)]";
  const trackShellClassNameNoBorder =
    "relative z-[1] min-h-0 w-full min-w-0 overflow-hidden rounded-[var(--ds-chart-bar-radius)] bg-[var(--ds-surface-inset)]";

  return (
    <Card
      variant="inset"
      className="flex w-full min-w-0 flex-col border-0 text-[var(--ds-text-secondary)]"
    >
      <CardContent className="flex w-full min-w-0 flex-col p-4">
        <div
          className="flex w-full min-w-0 flex-col gap-3"
          role="group"
          aria-label="Planned duration and schedule contingency"
          onPointerLeave={(e) => {
            const next = e.relatedTarget as Node | null;
            if (!next || !e.currentTarget.contains(next)) setGanttHover(null);
          }}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="m-0 min-w-0 flex-1 text-center text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)] sm:text-left">
              Duration & schedule contingency
            </p>
            {plannedOk ? (
              <button
                type="button"
                id="schedule-duration-breakdown-trigger"
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--ds-radius-sm)] border border-transparent bg-transparent px-1.5 py-0.5 text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)] transition-colors hover:border-[color-mix(in_oklab,var(--ds-border)_80%,transparent)] hover:bg-[var(--ds-surface-inset)] hover:text-[var(--ds-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface)]"
                aria-expanded={breakdownOpen}
                aria-controls="schedule-duration-breakdown"
                onClick={() => setBreakdownOpen((o) => !o)}
              >
                <span>{breakdownOpen ? "Hide" : "Show"} breakdown</span>
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
                  className={`pointer-events-none shrink-0 transition-transform duration-300 ease-in-out ${breakdownOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            ) : null}
          </div>
          <div
            className={`flex w-full min-w-0 flex-col ${breakdownOpen ? "gap-3" : "gap-0"}`}
          >
            {plannedOk ? (
              <div
                className={`flex w-full max-w-full min-w-0 flex-col gap-2.5${breakdownOpen ? " sm:min-h-[5.25rem]" : ""}`}
                role="img"
                aria-label={`${chartSummary} Forecast completion ${forecastCompletionDateDisplay}.`}
              >
                <div className="min-w-0">
                  <div className={ganttRowHeaderClass}>
                    <p className={ganttRowLabelClass}>
                      Forecast programme duration{" "}
                      <span className="normal-case tracking-normal">({targetPLabel})</span>
                    </p>
                    <p className={ganttRowValueClass}>{simulationTotalDisplay}</p>
                  </div>
                  <div className={trackShellClassName} style={ganttHeadlineTrackHeightStyle}>
                    {plannedPct > 0 && (
                      <>
                        <button
                          type="button"
                          className="absolute inset-y-0 left-0 z-[1] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                          style={{
                            width: `${plannedPct}%`,
                            backgroundColor: "var(--ds-chart-series-1)",
                            opacity: opacityFor("programme"),
                            ...ganttSegmentRadius,
                          }}
                          onPointerEnter={() => setGanttHover("programme")}
                          aria-label={`Current programme ${plannedDisplay}`}
                        />
                        <span
                          className={ganttBarLabelClassName}
                          style={{ left: 0, width: `${plannedPct}%` }}
                          aria-hidden
                        >
                          <span className="block min-w-0 w-full truncate text-center">{plannedBarLabel}</span>
                        </span>
                      </>
                    )}
                    {topOutcomeExtensionPct > 0 && (
                      <>
                        <button
                          type="button"
                          className="absolute inset-y-0 z-[2] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                          style={{
                            left: `${plannedPct}%`,
                            width: `${topOutcomeExtensionPct}%`,
                            backgroundColor: "var(--ds-status-danger)",
                            opacity: opacityFor("simulationOutcome"),
                            ...ganttSegmentRadius,
                          }}
                          onPointerEnter={() => setGanttHover("simulationOutcome")}
                          aria-label={`Simulated duration exceeds programme by ${formatDurationDays(simTotalDays! - programmeScaleDays)}`}
                        />
                        {adjustmentMagnitudeBarLabel !== "" && (
                          <span
                            className={ganttBarLabelClassName}
                            style={{
                              left: `${plannedPct}%`,
                              width: `${topOutcomeExtensionPct}%`,
                              zIndex: 3,
                            }}
                            aria-hidden
                          >
                            <span className="block min-w-0 w-full truncate text-center">
                              {adjustmentMagnitudeBarLabel}
                            </span>
                          </span>
                        )}
                      </>
                    )}
                    {topOutcomePullbackPct > 0 && (
                      <>
                        <button
                          type="button"
                          className="absolute inset-y-0 z-[2] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                          style={{
                            left: `${topOutcomePullbackLeftPct}%`,
                            width: `${topOutcomePullbackPct}%`,
                            backgroundColor: "color-mix(in oklab, var(--ds-status-success) 52%, var(--ds-surface-inset))",
                            opacity: opacityFor("simulationOutcome"),
                            ...ganttSegmentRadius,
                          }}
                          onPointerEnter={() => setGanttHover("simulationOutcome")}
                          aria-label={`Simulated duration under programme by ${formatDurationDays(programmeScaleDays - simTotalDays!)}`}
                        />
                        {adjustmentMagnitudeBarLabel !== "" && (
                          <span
                            className={ganttBarLabelClassName}
                            style={{
                              left: `${topOutcomePullbackLeftPct}%`,
                              width: `${topOutcomePullbackPct}%`,
                              zIndex: 3,
                            }}
                            aria-hidden
                          >
                            <span className="block min-w-0 w-full truncate text-center">
                              {adjustmentMagnitudeBarLabel}
                            </span>
                          </span>
                        )}
                      </>
                    )}
                    {plannedPct > 0 ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 z-[2] min-w-0"
                        style={{
                          width: `${plannedPct}%`,
                          opacity: opacityFor("programme"),
                          boxShadow: "inset 0 0 0 2px var(--ds-primary-hover)",
                          ...ganttSegmentRadius,
                        }}
                      />
                    ) : null}
                  </div>
                </div>

                <div
                  className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${breakdownOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  aria-hidden={!breakdownOpen}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      id="schedule-duration-breakdown"
                      role="region"
                      aria-labelledby="schedule-duration-breakdown-trigger"
                      className={`flex min-w-0 w-full flex-col gap-2.5 border-t border-[var(--ds-border)] pt-2.5 ${!breakdownOpen ? "pointer-events-none" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className={ganttRowHeaderClass}>
                          <p className={ganttRowLabelClass}>Works</p>
                        </div>
                        <div className={trackShellClassNameNoBorder} style={ganttTrackHeightStyle}>
                          {worksPctScaled > 0 && (
                            <>
                              <button
                                type="button"
                                className="absolute inset-y-0 left-0 z-0 min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                                style={{
                                  width: `${worksPctScaled}%`,
                                  backgroundColor: "var(--ds-chart-series-1)",
                                  opacity: opacityFor("works"),
                                  ...ganttSegmentRadius,
                                }}
                                onPointerEnter={() => setGanttHover("works")}
                                aria-label={`Works ${worksDisplay}`}
                              />
                              <span
                                className={ganttBarLabelClassName}
                                style={{ left: 0, width: `${worksPctScaled}%`, opacity: opacityFor("works") }}
                                aria-hidden
                              >
                                <span className="block min-w-0 w-full truncate text-center">{worksBarLabel}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className={ganttRowHeaderClass}>
                          <p className={ganttRowLabelClass}>Current contingency</p>
                        </div>
                        <div className={trackShellClassNameNoBorder} style={ganttTrackHeightStyle}>
                          {contingencyPctScaled > 0 && (
                            <>
                              <button
                                type="button"
                                className="absolute inset-y-0 z-0 min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                                style={{
                                  left: `${worksPctScaled}%`,
                                  width: `${contingencyPctScaled}%`,
                                  backgroundColor: "var(--ds-status-warning)",
                                  opacity: opacityFor("contingency"),
                                  ...ganttSegmentRadius,
                                }}
                                onPointerEnter={() => setGanttHover("contingency")}
                                aria-label={`Current contingency ${contingencyDisplay}`}
                              />
                              <span
                                className={ganttBarLabelClassName}
                                style={{
                                  left: `${worksPctScaled}%`,
                                  width: `${contingencyPctScaled}%`,
                                  opacity: opacityFor("contingency"),
                                }}
                                aria-hidden
                              >
                                <span className="block min-w-0 w-full truncate text-center">{contingencyBarLabel}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className={ganttRowHeaderClass}>
                          <p className={ganttRowLabelClass}>
                            {contingencyAdjustmentRowTitle}{" "}
                            <span className="normal-case tracking-normal">({targetPLabel})</span>
                          </p>
                        </div>
                        <div className={trackShellClassNameNoBorder} style={ganttTrackHeightStyle}>
                          {simulationDays == null ? (
                            <span className="pointer-events-none flex h-full w-full items-center px-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                              Run simulation to compare at {targetPLabel}
                            </span>
                          ) : (
                            <div className="relative min-h-0 h-full w-full">
                              {row3RedWidthPct > 0 && (
                                <>
                                  <button
                                    type="button"
                                    className="absolute inset-y-0 z-[1] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                                    style={{
                                      left: `${row3RedLeftPct}%`,
                                      width: `${row3RedWidthPct}%`,
                                      backgroundColor: "var(--ds-status-danger)",
                                      opacity: opacityFor("requiredContingency"),
                                      ...ganttSegmentRadius,
                                    }}
                                    onPointerEnter={() => setGanttHover("requiredContingency")}
                                    aria-label={`Additional contingency required beyond current allowance ${formatDurationDays(Math.max(0, additionalContingencyRequiredDays ?? 0))}`}
                                  />
                                  {adjustmentMagnitudeBarLabel !== "" && (
                                    <span
                                      className={ganttBarLabelClassName}
                                      style={{
                                        left: `${row3RedLeftPct}%`,
                                        width: `${row3RedWidthPct}%`,
                                        zIndex: 2,
                                        opacity: opacityFor("requiredContingency"),
                                      }}
                                      aria-hidden
                                    >
                                      <span className="block min-w-0 w-full truncate text-center">
                                        {adjustmentMagnitudeBarLabel}
                                      </span>
                                    </span>
                                  )}
                                </>
                              )}
                              {row3GreenWidthPct > 0 && (
                                <>
                                  <button
                                    type="button"
                                    className="absolute inset-y-0 z-[1] min-w-0 cursor-pointer border-0 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)]"
                                    style={{
                                      left: `${row3GreenLeftPct}%`,
                                      width: `${row3GreenWidthPct}%`,
                                      backgroundColor: "color-mix(in oklab, var(--ds-status-success) 55%, var(--ds-surface-inset))",
                                      opacity: opacityFor("requiredContingency"),
                                      ...ganttSegmentRadius,
                                    }}
                                    onPointerEnter={() => setGanttHover("requiredContingency")}
                                    aria-label={`Contingency surplus ${formatDurationDays(Math.abs(adjGap!))}`}
                                  />
                                  {adjustmentMagnitudeBarLabel !== "" && (
                                    <span
                                      className={ganttBarLabelClassName}
                                      style={{
                                        left: `${row3GreenLeftPct}%`,
                                        width: `${row3GreenWidthPct}%`,
                                        zIndex: 2,
                                        opacity: opacityFor("requiredContingency"),
                                      }}
                                      aria-hidden
                                    >
                                      <span className="block min-w-0 w-full truncate text-center">
                                        {adjustmentMagnitudeBarLabel}
                                      </span>
                                    </span>
                                  )}
                                </>
                              )}
                              {contingencyGapDays === 0 && (
                                <span className="pointer-events-none flex h-full w-full items-center px-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                                  Matched to current contingency
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="flex min-h-[5rem] w-full flex-col items-center justify-center gap-1 rounded-[var(--ds-radius-md)] border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-inset)] px-2 text-center"
                role="img"
                aria-label={`${chartSummary}`}
              >
                <span className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Planned duration
                </span>
                <span className="text-[length:var(--ds-text-base)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
                  {plannedDisplay}
                </span>
              </div>
            )}

            <div
              className={`w-full max-w-full border-t border-[var(--ds-border)] ${breakdownOpen ? "pt-3" : "pt-2.5"}`}
              aria-label={`Forecast completion at ${targetPLabel}: ${forecastCompletionDateDisplay}. ${forecastCompletionRag.a11y}`}
            >
              <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                Forecast Completion <span className="normal-case tracking-normal">({targetPLabel})</span>
              </p>
              <div
                className={`mt-2 h-1 w-full shrink-0 rounded-full ${forecastCompletionRag.bandClass}`}
                aria-hidden
              />
              <div className="mt-2 flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${forecastCompletionRag.dotClass}`}
                  aria-hidden
                />
                <p
                  className={`m-0 min-w-0 text-[length:var(--ds-text-lg)] font-semibold leading-snug tabular-nums ${forecastCompletionValueClass}`}
                >
                  {forecastCompletionDateDisplay}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function overallStatusToTone(status: string): StatusPositionTone {
  if (status === "On Track") return "on_track";
  if (status === "At Risk") return "at_risk";
  if (status === "Off Track") return "off_track";
  return "neutral";
}

const linkSecondaryClassName =
  "inline-flex h-9 items-center justify-center rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-4 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)] no-underline transition-all duration-150 hover:bg-[var(--ds-surface-muted)]";

const ACTIVE_PROJECT_KEY = "activeProjectId";

/**
 * `app/(protected)/template.tsx` remounts pages on client navigation while the risk-register
 * store persists. Without this, every simulation mount clears the store and refetches even for
 * the same project — visible as a wipe → “Loading…” → charts popping back in.
 */
let lastSimulationBootstrapProjectId: string | undefined;

/** Build YYYY-MM for a given date. */
function toMonthYearKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Format YYYY-MM as "March 2025". */
function formatReportingMonthYear(ym: string | null | undefined): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "—";
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Parse YYYY-MM-DD from project settings as a local calendar date. */
function parseProjectDay(isoDay: string): Date | null {
  const t = isoDay.trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    const d = new Date(y, mo - 1, da);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addCalendarDaysLocal(d: Date, days: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + days);
  return out;
}

function formatForecastCompletionDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Options for reporting month/year: current month and next 11 months. */
function getReportingMonthYearOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const start = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    options.push({ value: toMonthYearKey(d), label: formatReportingMonthYear(toMonthYearKey(d)) });
  }
  return options;
}

export type SimulationPageProps = { projectId?: string | null };

type ProjectPositionMetricChip = {
  id: string;
  label: string;
  value: string;
  signal: "favorable" | "unfavorable";
};

/** After load: we know whether this project has a snapshot. Only show results when hasSnapshot is true. */
type SnapshotState = { projectId: string; hasSnapshot: boolean } | null;

export default function SimulationPage({ projectId: urlProjectId }: SimulationPageProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { risks, simulation, runSimulation, clearSimulationHistory, hasDraftRisks, invalidRunnableCount, setRisks, hydrateSimulationFromDbSnapshot } = useRiskRegister();
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [runBlockedInvalidCount, setRunBlockedInvalidCount] = useState<number | null>(null);
  const [projectContext, setProjectContext] = useState<ReturnType<typeof loadProjectContext>>(null);
  const [gateChecked, setGateChecked] = useState(false);
  /** If non-null and projectId matches current project: hasSnapshot true = show results, false = show Run simulation only. */
  const [snapshotForProject, setSnapshotForProject] = useState<SnapshotState>(null);
  const effectiveProjectIdRef = useRef<string | undefined>(undefined);
  const hydrateRef = useRef(hydrateSimulationFromDbSnapshot);
  hydrateRef.current = hydrateSimulationFromDbSnapshot;
  const clearRef = useRef(clearSimulationHistory);
  clearRef.current = clearSimulationHistory;
  const setRisksRef = useRef(setRisks);
  setRisksRef.current = setRisks;
  const simulationRef = useRef(simulation);
  simulationRef.current = simulation;

  const [activeProjectIdFromStorage, setActiveProjectIdFromStorage] = useState<string | null>(null);
  const projectIdFromPath = useMemo(() => projectIdFromAppPathname(pathname), [pathname]);
  /** UUID for DB/API: URL or storage when in project routes; in legacy mode use DEFAULT_PROJECT_ID (projectContext.projectName is a display name, not a UUID). */
  const effectiveProjectId =
    urlProjectId ??
    projectIdFromPath ??
    activeProjectIdFromStorage ??
    (projectContext ? DEFAULT_PROJECT_ID : undefined);
  effectiveProjectIdRef.current = effectiveProjectId;

  const projectPerms = useProjectPermissions();
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  const simulationReadOnly =
    Boolean(urlProjectId) &&
    (projectPerms == null || !projectPerms.canEditContent);

  const [reportingSnapshotRow, setReportingSnapshotRow] = useState<SimulationSnapshotRow>(null);
  const reportingDbRow = reportingSnapshotRow as SimulationSnapshotRowDb | null;
  const [latestSnapshotRow, setLatestSnapshotRow] = useState<SimulationSnapshotRow>(null);
  const [setReportingModalOpen, setSetReportingModalOpen] = useState(false);
  const [reportingNote, setReportingNote] = useState("");
  const [reportingMonthYear, setReportingMonthYear] = useState(() => toMonthYearKey(new Date()));
  const [setReportingSaving, setSetReportingSaving] = useState(false);
  const [triggeredBy, setTriggeredBy] = useState<string | null>(null);
  const [driversView, setDriversView] = useState<"cost" | "schedule">("cost");
  /** Shared expand/collapse for Cost & contingency and Duration & schedule contingency breakdown rows. */
  const [projectPositionBreakdownOpen, setProjectPositionBreakdownOpen] = useState(true);

  const reportingMonthYearOptions = useMemo(() => getReportingMonthYearOptions(), []);

  useEffect(() => {
    if (invalidRunnableCount === 0) setRunBlockedInvalidCount(null);
  }, [invalidRunnableCount]);

  useEffect(() => {
    if (simulationReadOnly && process.env.NODE_ENV === "development") {
      console.log("[project-access] simulation UI read-only", { projectId: urlProjectId });
    }
  }, [simulationReadOnly, urlProjectId]);

  useEffect(() => {
    const supabase = supabaseBrowserClient();
    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!user) {
          setTriggeredBy(null);
          return;
        }
        const profile = await fetchPublicProfile(supabase, user.id);
        setTriggeredBy(formatTriggeredByLabel(user, profile));
      })
      .catch(() => setTriggeredBy(null));
  }, []);
  const setupRedirectPath = urlProjectId ? riskaiPath(`/projects/${urlProjectId}`) : DASHBOARD_PATH;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setActiveProjectIdFromStorage(window.localStorage.getItem(ACTIVE_PROJECT_KEY));
    } catch {
      // localStorage unavailable (e.g. private browsing)
    }
  }, []);

  // Gate: redirect to setup only in legacy mode (no urlProjectId). When accessing via URL, global context is not required.
  useEffect(() => {
    const ctx = loadProjectContext();
    setProjectContext(ctx);
    setGateChecked(true);
  }, []);
  useEffect(() => {
    if (!gateChecked) return;
    if (urlProjectId) return;
    if (!isProjectContextComplete(projectContext)) {
      router.replace(setupRedirectPath);
      return;
    }
  }, [gateChecked, projectContext, router, setupRedirectPath, urlProjectId]);

  // When project changes: clear store, then load risks + snapshot for this project. Only show results if snapshot exists for this project.
  useEffect(() => {
    if (!gateChecked) return;
    if (!isProjectContextComplete(projectContext) && !urlProjectId) return;
    if (!effectiveProjectId) return;
    const projectIdWeAreLoading = effectiveProjectId;
    const projectSwitched = lastSimulationBootstrapProjectId !== projectIdWeAreLoading;
    if (projectSwitched) {
      lastSimulationBootstrapProjectId = projectIdWeAreLoading;
      setLastRun(null);
      setSnapshotForProject(null);
      setLatestSnapshotRow(null);
      clearRef.current();
    } else {
      const sim = simulationRef.current;
      const cur = sim.current;
      const hasPersistedDbRun = !!(cur?.id && !cur.id.startsWith("sim_"));
      const hasNeutralRun = (sim.neutral?.iterationCount ?? 0) > 0;
      if (hasPersistedDbRun || hasNeutralRun) {
        setSnapshotForProject({ projectId: projectIdWeAreLoading, hasSnapshot: true });
        if (cur?.timestampIso) setLastRun(cur.timestampIso);
      } else {
        setSnapshotForProject({ projectId: projectIdWeAreLoading, hasSnapshot: false });
      }
    }
    listRisks(projectIdWeAreLoading)
      .then((loaded) => {
        if (effectiveProjectIdRef.current !== projectIdWeAreLoading) return;
        setRisksRef.current(loaded);
      })
      .catch((err) => console.error("[simulation] load risks", err));
    getLatestSnapshot(projectIdWeAreLoading)
      .then((snapshot) => {
        if (effectiveProjectIdRef.current !== projectIdWeAreLoading) return;
        const hasSnapshot = !!(snapshot?.created_at);
        setSnapshotForProject({ projectId: projectIdWeAreLoading, hasSnapshot });
        setLatestSnapshotRow(snapshot ?? null);
        if (hasSnapshot && snapshot) {
          setLastRun(snapshot.created_at ?? null);
        }
      })
      .catch((err) => {
        if (effectiveProjectIdRef.current !== projectIdWeAreLoading) return;
        setSnapshotForProject({ projectId: projectIdWeAreLoading, hasSnapshot: false });
        setLatestSnapshotRow(null);
        console.error("[simulation] load snapshot", err);
      });
  }, [gateChecked, projectContext, urlProjectId, effectiveProjectId]);

  const isCurrentRunPersisted = simulation.current?.id && !simulation.current.id.startsWith("sim_");
  const persistedRunId = simulation.current?.id;
  useEffect(() => {
    if (!effectiveProjectId || !persistedRunId || persistedRunId.startsWith("sim_")) return;
    getLatestSnapshot(effectiveProjectId)
      .then((row) => {
        if (row?.id === persistedRunId) setReportingSnapshotRow(row);
        else setReportingSnapshotRow(null);
      })
      .catch(() => setReportingSnapshotRow(null));
  }, [effectiveProjectId, persistedRunId]);

  const analysisState = useMemo(
    () => ({ risks, simulation: { ...simulation } }),
    [risks, simulation]
  );

  const neutralSummary = useMemo(() => getNeutralSummary(analysisState), [analysisState]);
  const costSamples = useMemo(() => getNeutralSamples(analysisState), [analysisState]);
  const timeSamples = useMemo(() => getNeutralTimeSamples(analysisState), [analysisState]);
  const timeSummary = useMemo(() => getNeutralTimeSummary(analysisState), [analysisState]);

  const iterationCount = simulation.neutral?.iterationCount ?? 0;
  const snapshotRisks = simulation.current?.risks ?? EMPTY_SNAPSHOT_RISKS;

  const hasData = neutralSummary != null;
  /** Only show results when we've loaded for this project and it has a snapshot; else show Run simulation. Legacy: no effectiveProjectId but hasSnapshot. */
  const currentProjectHasSnapshot =
    (snapshotForProject?.projectId === effectiveProjectId && snapshotForProject?.hasSnapshot) ||
    (effectiveProjectId == null && (snapshotForProject?.hasSnapshot ?? false));
  const showResults = currentProjectHasSnapshot && hasData;
  const showRunOnly =
    (snapshotForProject?.projectId === effectiveProjectId && !snapshotForProject?.hasSnapshot) ||
    (effectiveProjectId == null && !(snapshotForProject?.hasSnapshot ?? false));
  const loadingSnapshot = effectiveProjectId != null && snapshotForProject?.projectId !== effectiveProjectId;
  const showChooseRunAction = currentProjectHasSnapshot && !hasData && !loadingSnapshot;

  // Prefer project-specific context for display; fall back to gate (global) context
  const displayContext = useMemo(
    () => loadProjectContext(effectiveProjectId ?? null) ?? projectContext,
    [effectiveProjectId, projectContext]
  );

  const baseline: SimulationSectionBaseline | null = useMemo(() => {
    const targetPNumeric = displayContext
      ? riskAppetiteToPercent(displayContext.riskAppetite)
      : 80;
    const targetPLabel = displayContext?.riskAppetite ?? "P80";
    return {
      targetPNumeric,
      targetPLabel,
      approvedValue: 0,
    };
  }, [displayContext]);

  const costCdf = useMemo((): CostCdfPoint[] | null => {
    if (!hasData) return null;
    if (costSamples != null && costSamples.length > 0) {
      const dist = binSamplesIntoHistogram(costSamples, DISTRIBUTION_BIN_COUNT);
      return distributionToCostCdf(dist);
    }
    if (neutralSummary) {
      const dist = deriveCostHistogramFromPercentiles(
        {
          p20Cost: neutralSummary.p20Cost,
          p50Cost: neutralSummary.p50Cost,
          p80Cost: neutralSummary.p80Cost,
          p90Cost: neutralSummary.p90Cost,
        },
        DISTRIBUTION_BIN_COUNT
      );
      return distributionToCostCdf(dist);
    }
    return null;
  }, [hasData, costSamples, neutralSummary]);

  const timeCdf = useMemo((): TimeCdfPoint[] | null => {
    if (!timeSummary) return null;
    if (timeSamples != null && timeSamples.length > 0) {
      const dist = binSamplesIntoTimeHistogram(timeSamples, DISTRIBUTION_BIN_COUNT);
      return distributionToTimeCdf(dist);
    }
    const dist = deriveTimeHistogramFromPercentiles(timeSummary, DISTRIBUTION_BIN_COUNT);
    return distributionToTimeCdf(dist);
  }, [timeSummary, timeSamples]);

  /** Risk delay (days) at target P from schedule simulation — same metric as the schedule CDF chart. */
  const scheduleSimulationRiskDelayAtTargetP = useMemo(() => {
    if (!baseline || !timeCdf?.length) return null;
    const v = timeAtPercentile(timeCdf, baseline.targetPNumeric);
    return v != null && Number.isFinite(v) ? v : null;
  }, [baseline, timeCdf]);

  const approvedBudgetBase = useMemo(() => {
    if (!displayContext) return null;
    return displayContext.approvedBudget_m * 1e6;
  }, [displayContext]);

  const plannedDurationDays = useMemo(() => {
    if (!displayContext) return null;
    return (displayContext.plannedDuration_months * 365) / 12;
  }, [displayContext]);

  /** Schedule contingency in days (same axis as simulation time samples: risk delay days). */
  const scheduleContingencyDays = useMemo(() => {
    if (!displayContext) return null;
    const w = displayContext.scheduleContingency_weeks;
    if (!Number.isFinite(w) || w < 0) return null;
    return w * 7;
  }, [displayContext]);

  const costBaseline: SimulationSectionBaseline | null = useMemo(() => {
    if (!baseline) return null;
    return { ...baseline, approvedValue: approvedBudgetBase ?? 0 };
  }, [baseline, approvedBudgetBase]);

  const timeBaseline: SimulationSectionBaseline | null = useMemo(() => {
    if (!baseline) return null;
    return { ...baseline, approvedValue: plannedDurationDays ?? 0 };
  }, [baseline, plannedDurationDays]);

  const costResults: CostResults = useMemo(
    () => ({
      samples: costSamples ?? null,
      summary: neutralSummary
        ? {
            p20Cost: neutralSummary.p20Cost,
            p50Cost: neutralSummary.p50Cost,
            p80Cost: neutralSummary.p80Cost,
            p90Cost: neutralSummary.p90Cost,
          }
        : null,
      iterationCount,
      risks: snapshotRisks,
    }),
    [costSamples, neutralSummary, iterationCount, snapshotRisks]
  );

  const timeResults: TimeResults = useMemo(
    () => ({
      samples: timeSamples ?? null,
      summary: timeSummary,
      iterationCount,
      risks: snapshotRisks,
    }),
    [timeSamples, timeSummary, iterationCount, snapshotRisks]
  );

  /** Simulated total cost (dollars) at target P from the cost CDF. */
  const simulatedTotalCostAtTargetPDollars = useMemo(() => {
    if (!baseline || !costCdf?.length) return null;
    const v = costAtPercentile(costCdf, baseline.targetPNumeric);
    return v != null && Number.isFinite(v) ? v : null;
  }, [baseline, costCdf]);

  /** Simulated total cost at target P minus contingency (dollars); same basis as cost position tile. */
  const costContingencyGapDollars = useMemo(() => {
    const valueAtTargetP = simulatedTotalCostAtTargetPDollars;
    const contingencyValueDollars =
      displayContext != null && Number.isFinite(displayContext.contingencyValue_m)
        ? displayContext.contingencyValue_m * 1e6
        : null;
    if (valueAtTargetP == null || contingencyValueDollars == null || !Number.isFinite(contingencyValueDollars)) {
      return null;
    }
    return valueAtTargetP - contingencyValueDollars;
  }, [simulatedTotalCostAtTargetPDollars, displayContext]);

  /** Same delta as SimulationSection "Funding Position vs Target": (value at target P) − contingency. */
  const projectPositionCostGapText = useMemo(() => {
    if (costContingencyGapDollars == null || !Number.isFinite(costContingencyGapDollars)) return "—";
    const formatted = formatMoneyMillions(Math.abs(costContingencyGapDollars) / 1e6);
    return costContingencyGapDollars > 0 ? `${formatted} required` : `${formatted} surplus`;
  }, [costContingencyGapDollars]);

  /** Same schedule vs contingency delta as `projectPositionScheduleGapText`; shared for metric chips. */
  const projectPositionScheduleGapModel = useMemo(() => {
    if (!baseline || !timeCdf?.length) return null;
    const valueAtTargetP = timeAtPercentile(timeCdf, baseline.targetPNumeric);
    if (valueAtTargetP == null || scheduleContingencyDays == null || !Number.isFinite(scheduleContingencyDays)) {
      return null;
    }
    const delta = valueAtTargetP - scheduleContingencyDays;
    const formatted = formatDurationDays(Math.abs(delta));
    if (formatted === "—") return null;
    return {
      formatted,
      kind: delta > 0 ? ("required" as const) : ("buffer" as const),
    };
  }, [baseline, timeCdf, scheduleContingencyDays]);

  const projectPositionScheduleGapText = useMemo(() => {
    const m = projectPositionScheduleGapModel;
    if (!m) return "—";
    return m.kind === "required" ? `${m.formatted} required` : `${m.formatted} buffer`;
  }, [projectPositionScheduleGapModel]);

  /**
   * Target completion from project settings, shifted by the same net slip as schedule gap:
   * (risk delay days at target P) − schedule contingency days.
   */
  const forecastCompletionDateDisplay = useMemo(() => {
    const raw = displayContext?.targetCompletionDate?.trim();
    if (!raw) return "—";
    const plannedEnd = parseProjectDay(raw);
    if (!plannedEnd) return "—";
    if (
      scheduleSimulationRiskDelayAtTargetP == null ||
      !Number.isFinite(scheduleSimulationRiskDelayAtTargetP) ||
      scheduleContingencyDays == null ||
      !Number.isFinite(scheduleContingencyDays)
    ) {
      return "—";
    }
    const deltaDays = Math.round(scheduleSimulationRiskDelayAtTargetP - scheduleContingencyDays);
    return formatForecastCompletionDate(addCalendarDaysLocal(plannedEnd, deltaDays));
  }, [displayContext?.targetCompletionDate, scheduleSimulationRiskDelayAtTargetP, scheduleContingencyDays]);

  /**
   * Same P-at-reference logic as SimulationSection `currentPValue`; exposes per-dimension line status
   * for executive copy without changing thresholds or inputs.
   */
  const projectPositionMetrics = useMemo(() => {
    type LineSeverity = "on" | "risk" | "off";
    if (!baseline) {
      return {
        overallStatus: "—" as const,
        costLine: null as LineSeverity | null,
        timeLine: null as LineSeverity | null,
      };
    }
    const target = baseline.targetPNumeric;

    const contingencyValueDollars =
      displayContext != null && Number.isFinite(displayContext.contingencyValue_m)
        ? displayContext.contingencyValue_m * 1e6
        : null;
    const costRef =
      contingencyValueDollars != null && Number.isFinite(contingencyValueDollars)
        ? contingencyValueDollars
        : approvedBudgetBase;
    let costCurrentP: number | null = null;
    if (costCdf?.length && costRef != null && costRef > 0) {
      const p = percentileAtCost(costCdf, costRef);
      costCurrentP = p != null ? Math.round(p) : null;
    }

    const timeRef =
      scheduleContingencyDays != null && Number.isFinite(scheduleContingencyDays)
        ? scheduleContingencyDays
        : plannedDurationDays;
    let timeCurrentP: number | null = null;
    if (timeCdf?.length && timeRef != null && timeRef > 0) {
      const p = percentileAtTime(timeCdf, timeRef);
      timeCurrentP = p != null ? Math.round(p) : null;
    }

    const lineStatus = (current: number | null): LineSeverity | null => {
      if (current == null) return null;
      if (current >= target) return "on";
      if (current >= target - 10) return "risk";
      return "off";
    };

    const c = lineStatus(costCurrentP);
    const t = lineStatus(timeCurrentP);
    const severities: LineSeverity[] = [];
    if (c != null) severities.push(c);
    if (t != null) severities.push(t);
    if (severities.length === 0) {
      return { overallStatus: "—" as const, costLine: c, timeLine: t };
    }

    let worstRank = 2;
    for (const s of severities) {
      const r = s === "off" ? 0 : s === "risk" ? 1 : 2;
      if (r < worstRank) worstRank = r;
    }
    const overallStatus =
      worstRank === 0 ? ("Off Track" as const) : worstRank === 1 ? ("At Risk" as const) : ("On Track" as const);
    return { overallStatus, costLine: c, timeLine: t };
  }, [
    baseline,
    costCdf,
    timeCdf,
    displayContext,
    approvedBudgetBase,
    plannedDurationDays,
    scheduleContingencyDays,
  ]);

  const projectPositionExecutiveSummary = useMemo(() => {
    const { overallStatus, costLine, timeLine } = projectPositionMetrics;
    const pLabel = baseline?.targetPLabel ?? "target P";
    const schedModel = projectPositionScheduleGapModel;

    const buildMetricChips = (): ProjectPositionMetricChip[] => {
      const chips: ProjectPositionMetricChip[] = [];
      if (costContingencyGapDollars != null && Number.isFinite(costContingencyGapDollars)) {
        const formatted = formatMoneyMillions(Math.abs(costContingencyGapDollars) / 1e6);
        if (costContingencyGapDollars > 0) {
          chips.push({
            id: "cost",
            label: "Cost",
            value: `${formatted} required`,
            signal: "unfavorable",
          });
        } else {
          chips.push({
            id: "cost",
            label: "Cost",
            value: `+${formatted} surplus`,
            signal: "favorable",
          });
        }
      }
      if (schedModel) {
        if (schedModel.kind === "required") {
          chips.push({
            id: "schedule",
            label: "Schedule",
            value: `+${schedModel.formatted} required`,
            signal: "unfavorable",
          });
        } else {
          chips.push({
            id: "schedule",
            label: "Schedule",
            value: `+${schedModel.formatted} buffer`,
            signal: "favorable",
          });
        }
      }
      return chips;
    };

    if (overallStatus === "—") {
      return {
        mode: "unavailable" as const,
        mainMessage: "Position unavailable",
        supportingLine: "Run simulation and ensure project funding and schedule inputs are set.",
        chips: [] as ProjectPositionMetricChip[],
      };
    }

    const chips = buildMetricChips();
    const supportingFallback =
      chips.length === 0 ? (`Risk appetite reference is ${pLabel}.` as const) : null;

    if (overallStatus === "On Track") {
      return {
        mode: "ok" as const,
        mainMessage: "On Track",
        supportingLine: supportingFallback,
        chips,
      };
    }

    if (overallStatus === "At Risk") {
      const costRisk = costLine === "risk";
      const schedRisk = timeLine === "risk";
      let mainMessage: string;
      if (costRisk && schedRisk) {
        mainMessage = "At Risk – cost and schedule pressure";
      } else if (costRisk) {
        mainMessage = "At Risk – driven by cost";
      } else if (schedRisk) {
        mainMessage = "At Risk – driven by schedule";
      } else {
        mainMessage = "At Risk";
      }
      return { mode: "ok" as const, mainMessage, supportingLine: supportingFallback, chips };
    }

    const costOff = costLine === "off";
    const schedOff = timeLine === "off";
    let mainMessage: string;
    if (costOff && schedOff) {
      mainMessage = "Off Track – cost and schedule below target";
    } else if (costOff && !schedOff) {
      mainMessage = "Off Track – driven by cost";
    } else if (schedOff && !costOff) {
      mainMessage = "Off Track – driven by schedule";
    } else {
      mainMessage = "Off Track";
    }
    return { mode: "ok" as const, mainMessage, supportingLine: supportingFallback, chips };
  }, [projectPositionMetrics, baseline?.targetPLabel, costContingencyGapDollars, projectPositionScheduleGapModel]);

  /**
   * MVP: same runnable scope as `invalidRunnableCount` (non-draft, non-closed, non-archived).
   * Drafts block re-run; treat as Low alongside invalid runnable or empty runnable set.
   */
  const projectPositionDataConfidence = useMemo(() => {
    const runnable = risks.filter(
      (r) =>
        !isRiskStatusDraft(r.status) &&
        !isRiskStatusClosed(r.status) &&
        !isRiskStatusArchived(r.status)
    );
    if (invalidRunnableCount > 0 || hasDraftRisks || runnable.length === 0) return "Low";
    return "High";
  }, [risks, invalidRunnableCount, hasDraftRisks]);

  const dataConfidenceIssuesAndActions = useMemo(() => {
    const runnable = risks.filter(
      (r) =>
        !isRiskStatusDraft(r.status) &&
        !isRiskStatusClosed(r.status) &&
        !isRiskStatusArchived(r.status)
    );
    const issues: string[] = [];
    const actions: string[] = [];
    if (hasDraftRisks) {
      issues.push("Draft risks block simulation");
      actions.push("Complete draft risks");
    }
    if (invalidRunnableCount > 0) {
      issues.push("Some active risks have incomplete inputs");
      actions.push("Fix invalid risks");
    }
    if (runnable.length === 0) {
      issues.push("No active risks in simulation scope");
      actions.push("Add validated active risks");
    }
    return { issues: issues.slice(0, 4), actions: actions.slice(0, 4) };
  }, [risks, invalidRunnableCount, hasDraftRisks]);

  const driversCostRanked = useMemo(() => {
    const items = snapshotRisks
      .map((r) => ({
        id: r.id,
        title: r.title,
        value: r.simMeanCost ?? r.expectedCost ?? 0,
      }))
      .filter((x) => x.value > 0);
    const sum = items.reduce((s, x) => s + x.value, 0);
    const top = [...items].sort((a, b) => b.value - a.value).slice(0, 10);
    const rows = top.map((r) => ({
      ...r,
      contributionPct: sum > 0 ? (r.value / sum) * 100 : 0,
    }));
    const top3ConcentrationPct = rows.slice(0, 3).reduce((s, r) => s + r.contributionPct, 0);
    return { rows, top3ConcentrationPct, hasAny: items.length > 0 };
  }, [snapshotRisks]);

  const driversScheduleRanked = useMemo(() => {
    const items = snapshotRisks
      .map((r) => ({
        id: r.id,
        title: r.title,
        value: r.simMeanDays ?? r.expectedDays ?? 0,
      }))
      .filter((x) => x.value > 0);
    const sum = items.reduce((s, x) => s + x.value, 0);
    const top = [...items].sort((a, b) => b.value - a.value).slice(0, 10);
    const rows = top.map((r) => ({
      ...r,
      contributionPct: sum > 0 ? (r.value / sum) * 100 : 0,
    }));
    const top3ConcentrationPct = rows.slice(0, 3).reduce((s, r) => s + r.contributionPct, 0);
    return { rows, top3ConcentrationPct, hasAny: items.length > 0 };
  }, [snapshotRisks]);

  const driversActive =
    driversView === "cost" ? driversCostRanked : driversScheduleRanked;

  const simulationHeaderActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          onClick={async () => {
            if (simulationReadOnly) return;
            try {
              const result = await runSimulation(10000, effectiveProjectId ?? undefined);
              if (!result.ran && result.blockReason === "invalid") {
                setRunBlockedInvalidCount(result.invalidCount);
                return;
              }
              if (result.ran) {
                const now = new Date().toISOString();
                setLastRun(now);
                setSnapshotForProject({
                  projectId: effectiveProjectId ?? "legacy",
                  hasSnapshot: true,
                });
              }
            } catch {
              // Snapshot insert failed; do not update timestamp
            }
          }}
          disabled={simulationReadOnly || hasDraftRisks || invalidRunnableCount > 0}
          variant="secondary"
        >
          Run Simulation
        </Button>
        <Button
          type="button"
          onClick={() => clearSimulationHistory()}
          disabled={simulationReadOnly}
          variant="secondary"
        >
          Clear History
        </Button>
        {showResults &&
          isCurrentRunPersisted &&
          effectiveProjectId &&
          !reportingDbRow?.locked_for_reporting && (
            <Button
              type="button"
              onClick={() => !simulationReadOnly && setSetReportingModalOpen(true)}
              disabled={simulationReadOnly}
              variant="secondary"
            >
              Set as reporting version
            </Button>
          )}
      </div>
    ),
    [
      simulationReadOnly,
      hasDraftRisks,
      invalidRunnableCount,
      runSimulation,
      effectiveProjectId,
      clearSimulationHistory,
      showResults,
      isCurrentRunPersisted,
      reportingDbRow?.locked_for_reporting,
    ]
  );

  useEffect(() => {
    if (!urlProjectId || !setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "Simulation", end: simulationHeaderActions });
    return () => setPageHeaderExtras(null);
  }, [urlProjectId, setPageHeaderExtras, simulationHeaderActions]);

  return (
    <main className="p-6">
      {hasDraftRisks && (
        <Callout status="warning" className="mt-2 text-right" role="status">
          Review and save all draft risks in the Risk Register before running simulation.
        </Callout>
      )}
      {invalidRunnableCount > 0 && (
        <Callout status="warning" className="mt-2 text-right" role="status">
          Fix {invalidRunnableCount} risk{invalidRunnableCount !== 1 ? "s" : ""} to run simulation.
        </Callout>
      )}
      {runBlockedInvalidCount != null && runBlockedInvalidCount > 0 && (
        <Callout status="warning" className="mt-2 font-medium" role="alert">
          Simulation blocked: fix {runBlockedInvalidCount} risk{runBlockedInvalidCount !== 1 ? "s" : ""} to run simulation.
        </Callout>
      )}
      {simulationReadOnly && (
        <Callout status="info" className="mt-2" role="status">
          View-only access: you cannot run or change simulations for this project.
        </Callout>
      )}

      {loadingSnapshot && (
        <Card variant="inset" className="mt-0 p-6" aria-busy="true" aria-live="polite">
          <div className="mx-auto max-w-md animate-pulse space-y-3">
            <div className="mx-auto h-4 w-3/4 max-w-sm rounded bg-[var(--ds-surface-muted)]" />
            <div className="mx-auto h-4 w-1/2 max-w-xs rounded bg-[var(--ds-surface-muted)]" />
            <div className="mx-auto h-4 w-2/3 max-w-56 rounded bg-[var(--ds-surface-muted)]" />
          </div>
          <span className="sr-only">Loading simulation data</span>
        </Card>
      )}

      {showRunOnly && (
        <Card variant="inset" className="mt-0 p-6 text-center">
          <p className="m-0 font-medium text-[var(--ds-text-primary)]">
            No simulation run for this project yet. Run a simulation to see results.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              onClick={async () => {
                if (simulationReadOnly) return;
                try {
                  const result = await runSimulation(10000, effectiveProjectId ?? undefined);
                  if (!result.ran && result.blockReason === "invalid") {
                    setRunBlockedInvalidCount(result.invalidCount);
                    return;
                  }
                  if (result.ran) {
                    const now = new Date().toISOString();
                    setLastRun(now);
                    setSnapshotForProject({
                      projectId: effectiveProjectId ?? "legacy",
                      hasSnapshot: true,
                    });
                  }
                } catch {
                  // Snapshot insert failed; do not update timestamp
                }
              }}
              disabled={simulationReadOnly || hasDraftRisks || invalidRunnableCount > 0}
              variant="secondary"
            >
              Run simulation
            </Button>
            {effectiveProjectId && (
              <Link
                href={riskaiPath(`/projects/${effectiveProjectId}/run-data`)}
                className={linkSecondaryClassName}
              >
                Go to Run Data
              </Link>
            )}
          </div>
        </Card>
      )}

      {showChooseRunAction && (
        <Card variant="inset" className="mt-0 p-6 text-center">
          <p className="m-0 font-medium text-[var(--ds-text-primary)]">
            This project has an existing simulation run.
          </p>
          <p className="mt-2 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
            Choose whether to run a new simulation now or load the latest saved run.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              onClick={async () => {
                if (simulationReadOnly) return;
                try {
                  const result = await runSimulation(10000, effectiveProjectId ?? undefined);
                  if (!result.ran && result.blockReason === "invalid") {
                    setRunBlockedInvalidCount(result.invalidCount);
                    return;
                  }
                  if (result.ran) {
                    const now = new Date().toISOString();
                    setLastRun(now);
                    setSnapshotForProject({
                      projectId: effectiveProjectId ?? "legacy",
                      hasSnapshot: true,
                    });
                  }
                } catch {
                  // Snapshot insert failed; do not update timestamp
                }
              }}
              disabled={simulationReadOnly || hasDraftRisks || invalidRunnableCount > 0}
              variant="secondary"
            >
              Re-run simulation
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!latestSnapshotRow) return;
                hydrateRef.current(latestSnapshotRow);
                if (latestSnapshotRow?.created_at) setLastRun(latestSnapshotRow.created_at);
              }}
              disabled={!latestSnapshotRow}
              variant="secondary"
            >
              Load last run
            </Button>
          </div>
        </Card>
      )}

      {showResults && (
        <>
          <section
            className="mt-0 flex min-w-0 flex-col gap-3 sm:gap-4"
            aria-label="Project position"
          >
            <StatusPositionCard
              className="min-w-0"
              contentClassName="!px-4 !py-3"
              tone={overallStatusToTone(projectPositionMetrics.overallStatus)}
              label="Overall position"
              primaryText={projectPositionExecutiveSummary.mainMessage}
              secondaryText={
                projectPositionExecutiveSummary.mode === "unavailable"
                  ? projectPositionExecutiveSummary.supportingLine
                  : projectPositionExecutiveSummary.chips.length === 0
                    ? (projectPositionExecutiveSummary.supportingLine ?? undefined)
                    : undefined
              }
              supportingSlot={
                projectPositionExecutiveSummary.mode === "ok" &&
                projectPositionExecutiveSummary.chips.length > 0 ? (
                  <div className="flex min-w-0 flex-wrap gap-2">
                    {projectPositionExecutiveSummary.chips.map((c) => {
                      const shell =
                        c.signal === "favorable"
                          ? "bg-[var(--ds-status-success-subtle-bg)]"
                          : "bg-[var(--ds-status-danger-subtle-bg)]";
                      const valueClass =
                        c.signal === "favorable"
                          ? "text-[var(--ds-status-success-fg)]"
                          : "text-[var(--ds-status-danger-fg)]";
                      return (
                        <span
                          key={c.id}
                          className={`inline-flex min-w-0 max-w-full items-baseline gap-1.5 rounded-[var(--ds-radius-sm)] px-2 py-0.5 text-[length:var(--ds-text-xs)] ${shell}`}
                        >
                          <span className="shrink-0 font-medium text-[var(--ds-text-muted)]">{c.label}</span>
                          <span className="text-[var(--ds-text-muted)]" aria-hidden>
                            →
                          </span>
                          <span
                            className={`min-w-0 font-semibold tabular-nums leading-snug ${valueClass}`}
                          >
                            {c.value}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                ) : undefined
              }
              primaryClassName="!text-[length:var(--ds-text-2xl)] sm:!text-[length:var(--ds-text-3xl)]"
            />
            <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:items-start">
              <div
                className="flex min-h-0 min-w-0 w-full flex-col"
                style={{ containerType: "inline-size" }}
              >
                <ProjectValueContingencyMetricCard
                  projectValueDisplay={formatDash(displayContext?.projectValue_m, (m) => formatMoneyMillions(m))}
                  contingencyDisplay={formatDash(displayContext?.contingencyValue_m, (m) => formatMoneyMillions(m))}
                  projectValue_m={displayContext?.projectValue_m}
                  contingencyValue_m={displayContext?.contingencyValue_m}
                  targetPLabel={baseline.targetPLabel}
                  costGapDisplay={projectPositionCostGapText}
                  simulatedTotalCostDollars={simulatedTotalCostAtTargetPDollars}
                  costContingencyGapDollars={costContingencyGapDollars}
                  breakdownOpen={projectPositionBreakdownOpen}
                  setBreakdownOpen={setProjectPositionBreakdownOpen}
                />
              </div>
              <div
                className="flex min-h-0 min-w-0 w-full flex-col"
                style={{ containerType: "inline-size" }}
              >
                <ScheduleDurationContingencyGanttCard
                  plannedDurationDays={plannedDurationDays ?? undefined}
                  scheduleContingencyDays={scheduleContingencyDays}
                  simulationRiskDelayDays={scheduleSimulationRiskDelayAtTargetP}
                  targetPLabel={baseline.targetPLabel}
                  scheduleVsContingencyText={projectPositionScheduleGapText}
                  forecastCompletionDateDisplay={forecastCompletionDateDisplay}
                  breakdownOpen={projectPositionBreakdownOpen}
                  setBreakdownOpen={setProjectPositionBreakdownOpen}
                />
              </div>
            </div>
          </section>

          {/* Group 2 & 3 — Cost (left) and Schedule (right) side by side */}
          <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {costBaseline && (
              <SimulationSection
                title="Cost Simulation"
                mode="cost"
                baseline={costBaseline}
                results={costResults}
                costCdf={costCdf}
                formatCostValue={displayContext ? (dollars) => formatMoneyMillions(dollars / 1e6) : undefined}
                contingencyValueDollars={displayContext ? displayContext.contingencyValue_m * 1e6 : undefined}
                settingsHref={effectiveProjectId ? riskaiPath(`/projects/${effectiveProjectId}/settings`) : undefined}
              />
            )}
            {timeBaseline && (
              <SimulationSection
                title="Schedule Simulation"
                mode="time"
                baseline={timeBaseline}
                results={timeResults}
                timeCdf={timeCdf}
                contingencyTimeDays={scheduleContingencyDays ?? undefined}
                settingsHref={effectiveProjectId ? riskaiPath(`/projects/${effectiveProjectId}/settings`) : undefined}
              />
            )}
          </section>

          <Card variant="inset" className="mt-8 overflow-hidden">
            <CardHeader className="border-b border-[var(--ds-border)] px-4 py-3">
              <CardTitle className="text-[length:var(--ds-text-base)]">Risk Drivers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={driversView === "cost" ? "primary" : "secondary"}
                  onClick={() => setDriversView("cost")}
                >
                  Cost
                </Button>
                <Button
                  type="button"
                  variant={driversView === "schedule" ? "primary" : "secondary"}
                  onClick={() => setDriversView("schedule")}
                >
                  Schedule
                </Button>
              </div>
              <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                {driversView === "cost"
                  ? driversActive.hasAny
                    ? `Top 3 risks account for ${driversActive.top3ConcentrationPct.toFixed(1)}% of total cost exposure`
                    : "Top 3 risks account for — of total cost exposure"
                  : driversActive.hasAny
                    ? `Top 3 risks account for ${driversActive.top3ConcentrationPct.toFixed(1)}% of total schedule exposure`
                    : "Top 3 risks account for — of total schedule exposure"}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className="py-2 pl-3 pr-3 text-left normal-case tracking-normal">
                        Rank
                      </TableHeaderCell>
                      <TableHeaderCell className="py-2 pl-3 pr-3 text-left normal-case tracking-normal">
                        Risk
                      </TableHeaderCell>
                      <TableHeaderCell className="py-2 pl-3 pr-3 text-right normal-case tracking-normal">
                        {driversView === "cost" ? "Cost Impact" : "Schedule Impact"}
                      </TableHeaderCell>
                      <TableHeaderCell className="py-2 pl-3 pr-3 text-right normal-case tracking-normal">
                        Contribution
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {driversActive.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-4 text-center text-[var(--ds-text-muted)]">
                          {driversView === "cost"
                            ? "No cost drivers available for this simulation."
                            : "No schedule drivers available for this simulation."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      driversActive.rows.map((row, i) => (
                        <TableRow
                          key={row.id}
                          className="hover:bg-[color-mix(in_oklab,var(--ds-muted)_35%,transparent)]"
                        >
                          <TableCell className="py-2.5 pl-3 pr-3 text-[var(--ds-text-muted)]">{i + 1}</TableCell>
                          <TableCell
                            className="max-w-[200px] truncate py-2.5 pl-3 pr-3 text-[var(--ds-text-primary)]"
                            title={row.title}
                          >
                            {row.title}
                          </TableCell>
                          <TableCell className="py-2.5 pl-3 pr-3 text-right font-medium text-[var(--ds-text-primary)]">
                            {driversView === "cost"
                              ? displayContext
                                ? formatMoneyMillions(row.value / 1e6)
                                : new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(row.value)
                              : formatDurationDays(row.value)}
                          </TableCell>
                          <TableCell className="py-2.5 pl-3 pr-3 text-right font-medium text-[var(--ds-text-primary)]">
                            {`${row.contributionPct.toFixed(1)}%`}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card variant="inset" className="mt-8 overflow-hidden">
            <CardHeader className="border-b border-[var(--ds-border)] px-4 py-3">
              <CardTitle className="text-[length:var(--ds-text-base)]">Data Confidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4">
              <div>
                <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Status
                </div>
                <div className="mt-1 text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
                  {projectPositionDataConfidence}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Key issues
                </div>
                {dataConfidenceIssuesAndActions.issues.length === 0 ? (
                  <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                    Active risk inputs are complete.
                  </p>
                ) : (
                  <ul className="m-0 list-disc space-y-2 pl-5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                    {dataConfidenceIssuesAndActions.issues.map((item) => (
                      <li key={item} className="pl-0.5">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-2 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Recommended actions
                </div>
                {dataConfidenceIssuesAndActions.actions.length === 0 ? (
                  <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                    No action needed.
                  </p>
                ) : (
                  <ul className="m-0 list-disc space-y-2 pl-5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                    {dataConfidenceIssuesAndActions.actions.map((item) => (
                      <li key={item} className="pl-0.5">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {currentProjectHasSnapshot && lastRun && (
        <footer className="mt-8 border-t border-[var(--ds-border)] pt-4">
          <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
            Last simulation run: {new Date(lastRun).toLocaleString()}
          </p>
        </footer>
      )}

      {setReportingModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="set-reporting-version-dialog-title"
          onClick={(e) => e.target === e.currentTarget && (setSetReportingModalOpen(false), setReportingNote(""), setReportingMonthYear(toMonthYearKey(new Date())))}
        >
          <div
            style={{ width: "90vw", maxWidth: 400 }}
            className="flex shrink-0 flex-col overflow-hidden rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] shadow-[var(--ds-shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ds-border)] px-4 py-3 sm:px-6">
              <h2 id="set-reporting-version-dialog-title" className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">
                Set as reporting version
              </h2>
              <button
                type="button"
                onClick={() => { setSetReportingModalOpen(false); setReportingNote(""); setReportingMonthYear(toMonthYearKey(new Date())); }}
                className="rounded-[var(--ds-radius-md)] border border-transparent p-2 text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-6">
              <div>
                <Label htmlFor="reporting-month-year-select" className="mb-1 block">
                  Reporting month / year
                </Label>
                <select
                  id="reporting-month-year-select"
                  value={reportingMonthYear}
                  onChange={(e) => setReportingMonthYear(e.target.value)}
                  className="w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
                >
                  {reportingMonthYearOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="mt-0.5 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Locked once confirmed</p>
              </div>
              <div className="space-y-1.5 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-2.5 text-[length:var(--ds-text-sm)]">
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ds-text-muted)]">Reporting version</span>
                  <span className="font-medium text-[var(--ds-text-muted)]">Yes</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ds-text-muted)]">Reporting month / year</span>
                  <span className="text-[var(--ds-text-muted)]">{formatReportingMonthYear(reportingMonthYear)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ds-text-muted)]">Locked by</span>
                  <span className="truncate text-[var(--ds-text-muted)]">{triggeredBy ?? "Not available"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ds-text-muted)]">Locked on</span>
                  <span className="text-[var(--ds-text-muted)]">{new Date().toLocaleString()}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="shrink-0 text-[var(--ds-text-muted)]">Reporting note</span>
                  <span className="min-w-0 text-right text-[var(--ds-text-muted)]">
                    {reportingNote.trim() || "—"}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="reporting-note-input-sim" className="mb-1 block">
                  Reporting note
                </Label>
                <Textarea
                  id="reporting-note-input-sim"
                  placeholder="Why is this the reporting version?"
                  value={reportingNote}
                  onChange={(e) => setReportingNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--ds-border)] px-4 py-4 sm:px-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setSetReportingModalOpen(false); setReportingNote(""); setReportingMonthYear(toMonthYearKey(new Date())); }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={setReportingSaving}
                onClick={async () => {
                  const snapshotId = simulation.current?.id;
                  if (!snapshotId || !effectiveProjectId) return;
                  setSetReportingSaving(true);
                  try {
                    const supabase = supabaseBrowserClient();
                    const {
                      data: { user },
                      error: authErr,
                    } = await supabase.auth.getUser();
                    if (authErr) {
                      console.error("[simulation] set reporting version auth", authErr);
                      throw authErr;
                    }
                    const userId = user?.id;
                    if (!userId) {
                      const err = new Error("Not authenticated: cannot set reporting version.");
                      console.error("[simulation] set reporting version", err);
                      throw err;
                    }

                    await setSnapshotAsReportingVersion(snapshotId, {
                      userId,
                      note: reportingNote,
                      reportingMonthYear,
                      projectId: effectiveProjectId,
                    });
                    const row = await getLatestSnapshot(effectiveProjectId);
                    if (row?.id === snapshotId) setReportingSnapshotRow(row);
                    setSetReportingModalOpen(false);
                    setReportingNote("");
                    setReportingMonthYear(toMonthYearKey(new Date()));
                  } catch (e) {
                    console.error("[simulation] set reporting version failed", e);
                    throw e;
                  } finally {
                    setSetReportingSaving(false);
                  }
                }}
                variant="primary"
              >
                {setReportingSaving ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
