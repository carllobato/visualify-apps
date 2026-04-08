"use client";

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Callout,
  DashboardTileKpi,
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
  clearProjectSnapshots,
  getLatestLockedSnapshot,
  getSnapshotById,
  setSnapshotAsReportingVersion,
  type SimulationSnapshotRow,
  type SimulationSnapshotRowDb,
} from "@/lib/db/snapshots";
import { listRisks } from "@/lib/db/risks";
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
import {
  loadProjectContext,
  formatMoneyMillions,
  isProjectContextComplete,
  parseProjectContext,
  type ProjectContext,
} from "@/lib/projectContext";
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
import { NeutralRiskaiLoading } from "@/components/NeutralRiskaiLoading";
import type { SimulationRiskSnapshot } from "@/domain/simulation/simulation.types";
import type { Risk } from "@/domain/risk/risk.schema";
import { probability01FromScale } from "@/domain/risk/risk.logic";
import {
  isRiskStatusArchived,
  isRiskStatusClosed,
  isRiskStatusDraft,
  isRiskStatusExcludedFromSimulation,
} from "@/domain/risk/riskFieldSemantics";

const DISTRIBUTION_BIN_COUNT = 100;

/** Match project/portfolio overview main padding. */
const simulationPageMainClass =
  "min-h-full w-full bg-transparent text-[var(--ds-text-primary)] px-4 sm:px-6 py-8";

/** Same chrome as `SummaryTile` (document tile + hover). */
const simulationDocumentTileClass = "ds-document-tile-panel ds-document-tile-panel--interactive";

/** Titled sections: same shell as `DashboardCard` base tile (no hover lift — long forms / tables). */
const simulationDocumentSectionClass = "ds-document-tile-panel overflow-hidden";

/** Stable empty array for snapshot risks to avoid new [] identity every render. */
const EMPTY_SNAPSHOT_RISKS: SimulationRiskSnapshot[] = [];

function formatDash<T>(value: T | undefined | null, formatter: (v: T) => string): string {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return "—";
  return formatter(value as T);
}

/** Aligns with `getEffectiveRiskInputs` / Monte Carlo: full post-mitigation = mitigation text + post cost + post time ML. */
function hasFullPostMitigation(risk: Risk): boolean {
  const hasMitigation = Boolean(risk.mitigation?.trim());
  const postCost = risk.postMitigationCostML;
  const postTime = risk.postMitigationTimeML;
  return (
    hasMitigation &&
    typeof postCost === "number" &&
    Number.isFinite(postCost) &&
    postCost >= 0 &&
    typeof postTime === "number" &&
    Number.isFinite(postTime) &&
    postTime >= 0
  );
}

function isPresentNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/** Schedule cap matches `monteCarlo` / simulation. */
const MITIGATION_SCHEDULE_CAP_DAYS = 30;

function costMLPre(risk: Risk): number {
  const preCost = risk.preMitigationCostML;
  if (isPresentNum(preCost)) return preCost;
  const c = risk.inherentRating?.consequence;
  const cons = typeof c === "number" ? c : Number(c);
  if (!Number.isFinite(cons)) return 0;
  const cc = Math.max(1, Math.min(5, Math.round(cons)));
  const map: Record<number, number> = {
    1: 25_000,
    2: 100_000,
    3: 300_000,
    4: 750_000,
    5: 1_500_000,
  };
  return map[cc] ?? 0;
}

function costMLPost(risk: Risk): number {
  const postCost = risk.postMitigationCostML;
  if (isPresentNum(postCost)) return postCost;
  return costMLPre(risk);
}

function timeMLPre(risk: Risk): number {
  const preTime = risk.preMitigationTimeML;
  if (isPresentNum(preTime)) return Math.min(preTime, MITIGATION_SCHEDULE_CAP_DAYS);
  return 0;
}

function timeMLPost(risk: Risk, timePre: number): number {
  const postTime = risk.postMitigationTimeML;
  if (isPresentNum(postTime)) return Math.min(postTime, MITIGATION_SCHEDULE_CAP_DAYS);
  return timePre;
}

function probPre(risk: Risk): number {
  if (
    typeof risk.probability === "number" &&
    Number.isFinite(risk.probability) &&
    risk.probability >= 0 &&
    risk.probability <= 1
  ) {
    return risk.probability;
  }
  return probability01FromScale(risk.inherentRating.probability);
}

function probPost(risk: Risk): number {
  if (!hasFullPostMitigation(risk)) return probPre(risk);
  if (
    typeof risk.probability === "number" &&
    Number.isFinite(risk.probability) &&
    risk.probability >= 0 &&
    risk.probability <= 1
  ) {
    return risk.probability;
  }
  return probability01FromScale(risk.residualRating.probability);
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

type LineSeverity = "on" | "risk" | "off";

function forecastValueClass(
  gapPositive: boolean | null,
  lineSeverity: LineSeverity | null,
): string {
  if (gapPositive == null) return "text-[var(--ds-text-muted)]";
  if (gapPositive) return "text-[var(--ds-status-danger-fg)]";
  if (lineSeverity === "risk") return "text-[var(--ds-status-warning-fg)]";
  return "text-[var(--ds-status-success-fg)]";
}

function forecastRag(
  gapPositive: boolean | null,
  lineSeverity: LineSeverity | null,
  context: "cost" | "schedule",
): { bandClass: string; dotClass: string; a11y: string } {
  if (gapPositive == null) {
    return {
      bandClass: "bg-[var(--ds-border)]",
      dotClass: "bg-[var(--ds-text-muted)]",
      a11y: `RAG not available: run or complete simulation to rate forecast ${context} versus contingency.`,
    };
  }
  if (gapPositive) {
    return {
      bandClass: "bg-[var(--ds-status-danger)]",
      dotClass: "bg-[var(--ds-status-danger)]",
      a11y: `Red RAG: ${context === "cost" ? "simulated cost at target P exceeds current contingency allowance" : "contingency shortfall versus current allowance at target P"}.`,
    };
  }
  if (lineSeverity === "risk") {
    return {
      bandClass: "bg-[var(--ds-status-warning)]",
      dotClass: "bg-[var(--ds-status-warning)]",
      a11y: `Amber RAG: ${context} within tolerance but close to target threshold.`,
    };
  }
  return {
    bandClass: "bg-[var(--ds-status-success)]",
    dotClass: "bg-[var(--ds-status-success)]",
    a11y: `Green RAG: ${context === "cost" ? "contingency headroom versus simulated cost at target P" : "contingency surplus at target P"}.`,
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
  costLineSeverity,
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
  costLineSeverity: LineSeverity | null;
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

  const costGapPositive: boolean | null =
    costContingencyGapDollars != null && Number.isFinite(costContingencyGapDollars)
      ? costContingencyGapDollars > COST_CONTINGENCY_GAP_EPS
      : null;
  const forecastCostValueClass = forecastValueClass(costGapPositive, costLineSeverity);
  const forecastCostRag = forecastRag(costGapPositive, costLineSeverity, "cost");

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
    <div
      className={`${simulationDocumentTileClass} flex min-h-0 w-full min-w-0 flex-col p-4 text-[var(--ds-text-secondary)]`}
    >
        <div
          className="flex w-full min-w-0 flex-col gap-3"
          role="group"
          aria-label="Project value and cost contingency"
          onPointerLeave={(e) => {
            const next = e.relatedTarget;
            if (!(next instanceof Node) || !e.currentTarget.contains(next)) {
              setGanttHover(null);
            }
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
    </div>
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
  timeLineSeverity,
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
  timeLineSeverity: LineSeverity | null;
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

  const schedGapPositive: boolean | null =
    contingencyGapDays != null && Number.isFinite(contingencyGapDays)
      ? contingencyGapDays > 0
      : null;
  const forecastCompletionValueClass = forecastValueClass(schedGapPositive, timeLineSeverity);
  const forecastCompletionRag = forecastRag(schedGapPositive, timeLineSeverity, "schedule");

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
    <div
      className={`${simulationDocumentTileClass} flex min-h-0 w-full min-w-0 flex-col p-4 text-[var(--ds-text-secondary)]`}
    >
        <div
          className="flex w-full min-w-0 flex-col gap-3"
          role="group"
          aria-label="Planned duration and schedule contingency"
          onPointerLeave={(e) => {
            const next = e.relatedTarget;
            if (!(next instanceof Node) || !e.currentTarget.contains(next)) {
              setGanttHover(null);
            }
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
    </div>
  );
}

function overallStatusToTone(status: string): StatusPositionTone {
  if (status === "On Track") return "on_track";
  if (status === "At Risk") return "at_risk";
  if (status === "Off Track") return "off_track";
  return "neutral";
}

const ACTIVE_PROJECT_KEY = "activeProjectId";

/** Map DB `target_completion_date` to `YYYY-MM-DD` for project context parsing. */
function targetCompletionDateFromDb(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return "";
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  return "";
}

function projectContextFromSettingsRow(row: Record<string, unknown>): ProjectContext | null {
  const raw = {
    projectName: typeof row.project_name === "string" ? row.project_name : "",
    location:
      row.location !== undefined && row.location !== null && typeof row.location === "string"
        ? row.location.trim()
        : undefined,
    plannedDuration_months: row.planned_duration_months,
    targetCompletionDate: targetCompletionDateFromDb(row.target_completion_date),
    scheduleContingency_weeks: row.schedule_contingency_weeks,
    riskAppetite: row.risk_appetite,
    currency: row.currency,
    financialUnit: row.financial_unit,
    projectValue_input: row.project_value_input,
    contingencyValue_input: row.contingency_value_input,
  };
  return parseProjectContext(raw);
}

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
  signal: "favorable" | "warning" | "unfavorable";
};

export default function SimulationPage({ projectId: urlProjectId }: SimulationPageProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { risks, simulation, runSimulation, clearSimulationHistory, hasDraftRisks, invalidRunnableCount, setRisks, hydrateSimulationFromDbSnapshot } = useRiskRegister();
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [runBlockedInvalidCount, setRunBlockedInvalidCount] = useState<number | null>(null);
  const [snapshotPersistWarning, setSnapshotPersistWarning] = useState<string | null>(null);
  const [projectContext, setProjectContext] = useState<ReturnType<typeof loadProjectContext>>(null);
  /** Resolved display context for project-scoped routes (Supabase first, then localStorage). */
  const [scopedDisplayContext, setScopedDisplayContext] = useState<ProjectContext | null>(null);
  const [scopedDisplayContextReady, setScopedDisplayContextReady] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);
  const [initializingProjectRun, setInitializingProjectRun] = useState(true);
  const effectiveProjectIdRef = useRef<string | undefined>(undefined);
  const hydrateRef = useRef(hydrateSimulationFromDbSnapshot);
  hydrateRef.current = hydrateSimulationFromDbSnapshot;
  const clearRef = useRef(clearSimulationHistory);
  clearRef.current = clearSimulationHistory;
  const setRisksRef = useRef(setRisks);
  setRisksRef.current = setRisks;
  const hasInitializedForProjectRef = useRef<string | null>(null);

  const [activeProjectIdFromStorage, setActiveProjectIdFromStorage] = useState<string | null>(null);
  const projectIdFromPath = useMemo(() => projectIdFromAppPathname(pathname), [pathname]);
  /** UUID for DB/API: URL segment, parsed pathname, or activeProjectId from storage — never a default project. */
  const effectiveProjectId =
    urlProjectId ?? projectIdFromPath ?? activeProjectIdFromStorage ?? undefined;
  effectiveProjectIdRef.current = effectiveProjectId;

  const projectPerms = useProjectPermissions();
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  const simulationReadOnly =
    Boolean(urlProjectId) &&
    (projectPerms == null || !projectPerms.canEditContent);

  /** Latest snapshot explicitly locked for reporting — the only DB snapshot this page loads on init. */
  const [lockedSnapshotRow, setLockedSnapshotRow] = useState<SimulationSnapshotRow>(null);
  /** Latest saved row after a successful Run Simulation in this session (unlocked runs included). Cleared on project change / clear history. */
  const [sessionLatestSavedSnapshotRow, setSessionLatestSavedSnapshotRow] =
    useState<SimulationSnapshotRow>(null);
  const reportingDbRow = lockedSnapshotRow as SimulationSnapshotRowDb | null;
  const [loadingLatestReportedRun, setLoadingLatestReportedRun] = useState(false);
  const [setReportingModalOpen, setSetReportingModalOpen] = useState(false);
  const [reportingNote, setReportingNote] = useState("");
  const [reportingMonthYear, setReportingMonthYear] = useState(() => toMonthYearKey(new Date()));
  const [setReportingSaving, setSetReportingSaving] = useState(false);
  const [triggeredBy, setTriggeredBy] = useState<string | null>(null);
  const [driversView, setDriversView] = useState<"cost" | "schedule">("cost");
  /** Risk Drivers table: first 5 rows, then "Show 5 more" for up to 10. */
  const [driversTableExpanded, setDriversTableExpanded] = useState(false);
  const [mitigationImpactView, setMitigationImpactView] = useState<"cost" | "schedule">("cost");
  /** Shared expand/collapse for Cost & contingency and Duration & schedule contingency breakdown rows. */
  const [projectPositionBreakdownOpen, setProjectPositionBreakdownOpen] = useState(false);

  const reportingMonthYearOptions = useMemo(() => getReportingMonthYearOptions(), []);

  // Always clear any persisted in-memory simulation state when this page mounts.
  // This prevents stale runs from other pages/sessions from rendering before snapshot checks complete.
  useEffect(() => {
    clearRef.current();
    setLastRun(null);
    setLockedSnapshotRow(null);
    setSessionLatestSavedSnapshotRow(null);
  }, []);

  useEffect(() => {
    if (invalidRunnableCount === 0) setRunBlockedInvalidCount(null);
  }, [invalidRunnableCount]);

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

  // Project-scoped: load settings from Supabase first, then localStorage fallback (legacy flows unchanged).
  useEffect(() => {
    if (!effectiveProjectId) {
      setScopedDisplayContext(null);
      setScopedDisplayContextReady(false);
      return;
    }
    let cancelled = false;
    setScopedDisplayContextReady(false);
    void (async () => {
      const supabase = supabaseBrowserClient();
      const { data: row, error } = await supabase
        .from("visualify_project_settings")
        .select("*")
        .eq("project_id", effectiveProjectId)
        .maybeSingle();
      if (cancelled) return;
      let next: ProjectContext | null = null;
      if (!error && row && typeof row === "object") {
        const parsed = projectContextFromSettingsRow(row as Record<string, unknown>);
        if (parsed) next = parsed;
      }
      if (next == null) {
        next = loadProjectContext(effectiveProjectId);
      }
      if (!cancelled) {
        setScopedDisplayContext(next);
        setScopedDisplayContextReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveProjectId]);

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

  // When project changes: clear store, then load risks + locked snapshot in parallel; exit loading when both settle. Only show results if snapshot exists for this project.
  useEffect(() => {
    if (!gateChecked) return;
    if (!isProjectContextComplete(projectContext) && !urlProjectId) return;
    if (!effectiveProjectId) return;
    const projectIdWeAreLoading = effectiveProjectId;
    if (hasInitializedForProjectRef.current === projectIdWeAreLoading) {
      return;
    }
    hasInitializedForProjectRef.current = projectIdWeAreLoading;
    setInitializingProjectRun(true);
    setLastRun(null);
    setLockedSnapshotRow(null);
    setSessionLatestSavedSnapshotRow(null);
    // Always start from a clean in-memory simulation state on project load; reporting snapshot is fetched for metadata only (no auto-hydrate).
    clearRef.current();
    void Promise.all([
      listRisks(projectIdWeAreLoading)
        .then((loaded) => ({ kind: "risks" as const, loaded }))
        .catch((err) => {
          console.error("[simulation] load risks", err);
          return { kind: "risksFailed" as const };
        }),
      getLatestLockedSnapshot(projectIdWeAreLoading)
        .then((lockedSnapshot) => ({ kind: "snapshot" as const, lockedSnapshot }))
        .catch((err) => {
          if (effectiveProjectIdRef.current === projectIdWeAreLoading) {
            console.error("[simulation] load locked snapshot", err);
          }
          return { kind: "snapshotFailed" as const };
        }),
    ]).then(([risksOutcome, snapshotOutcome]) => {
      if (effectiveProjectIdRef.current !== projectIdWeAreLoading) return;
      if (risksOutcome.kind === "risks") setRisksRef.current(risksOutcome.loaded);
      if (snapshotOutcome.kind === "snapshot") {
        setLockedSnapshotRow(snapshotOutcome.lockedSnapshot ?? null);
      } else {
        setLockedSnapshotRow(null);
      }
      setInitializingProjectRun(false);
    });
  }, [gateChecked, projectContext, urlProjectId, effectiveProjectId]);

  const hydrateAfterSuccessfulRun = useCallback(async (snapshotProjectId: string, snapshotId: string) => {
    try {
      const row = await getSnapshotById(snapshotId, snapshotProjectId);
      if (!row) return;
      if (row.created_at) setLastRun(row.created_at);
      if (row.locked_for_reporting === true) {
        setLockedSnapshotRow(row);
      }
      hydrateRef.current(row, "simulation-run-latest-saved");
      setSessionLatestSavedSnapshotRow(row);
    } catch (err) {
      console.error("[simulation] post-run getSnapshotById", err);
    }
  }, []);

  const isCurrentRunPersisted = simulation.current?.id && !simulation.current.id.startsWith("sim_");

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
  const selectedSnapshotId = lockedSnapshotRow?.id ?? null;
  const sessionLatestSavedId = sessionLatestSavedSnapshotRow?.id ?? null;
  const currentProjectHasSnapshot =
    lockedSnapshotRow != null || sessionLatestSavedSnapshotRow != null;
  const currentSimulationId = simulation?.current?.id ?? null;
  const hasMatchingSelectedRun =
    selectedSnapshotId != null && hasData && currentSimulationId === selectedSnapshotId;
  const showResults =
    !initializingProjectRun &&
    hasData &&
    currentSimulationId != null &&
    ((selectedSnapshotId != null && currentSimulationId === selectedSnapshotId) ||
      (sessionLatestSavedId != null && currentSimulationId === sessionLatestSavedId));
  const loadingSnapshot = effectiveProjectId != null && initializingProjectRun;
  /** Entry card: no auto-loaded results; user must run a sim or load the reporting snapshot manually. */
  const showDefaultSimulationActions =
    !initializingProjectRun && !showResults && !loadingSnapshot;
  const isReportingVersion =
    currentSimulationId != null &&
    lockedSnapshotRow != null &&
    currentSimulationId === lockedSnapshotRow.id;

  // In project routes, use project-scoped context only (no legacy fallback),
  // otherwise cards like Overall Position can mix a loaded run with another project's context.
  // In legacy mode (no effective project id), keep using the gate/global context.
  const displayContext = useMemo(() => {
    if (!effectiveProjectId) return projectContext;
    if (!scopedDisplayContextReady) return loadProjectContext(effectiveProjectId);
    return scopedDisplayContext;
  }, [effectiveProjectId, projectContext, scopedDisplayContextReady, scopedDisplayContext]);

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

    const chipSignal = (
      line: "on" | "risk" | "off" | null,
      favorable: boolean,
    ): "favorable" | "warning" | "unfavorable" => {
      if (!favorable) return "unfavorable";
      if (line === "risk") return "warning";
      return "favorable";
    };

    const buildMetricChips = (): ProjectPositionMetricChip[] => {
      const chips: ProjectPositionMetricChip[] = [];
      if (costContingencyGapDollars != null && Number.isFinite(costContingencyGapDollars)) {
        const formatted = formatMoneyMillions(Math.abs(costContingencyGapDollars) / 1e6);
        if (costContingencyGapDollars > 0) {
          chips.push({
            id: "cost",
            label: "Cost",
            value: `${formatted} required`,
            signal: chipSignal(costLine, false),
          });
        } else {
          chips.push({
            id: "cost",
            label: "Cost",
            value: `+${formatted} surplus`,
            signal: chipSignal(costLine, true),
          });
        }
      }
      if (schedModel) {
        if (schedModel.kind === "required") {
          chips.push({
            id: "schedule",
            label: "Schedule",
            value: `+${schedModel.formatted} required`,
            signal: chipSignal(timeLine, false),
          });
        } else {
          chips.push({
            id: "schedule",
            label: "Schedule",
            value: `+${schedModel.formatted} buffer`,
            signal: chipSignal(timeLine, true),
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
    const top5ConcentrationPct = rows.slice(0, 5).reduce((s, r) => s + r.contributionPct, 0);
    return { rows, top5ConcentrationPct, hasAny: items.length > 0 };
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
    const top5ConcentrationPct = rows.slice(0, 5).reduce((s, r) => s + r.contributionPct, 0);
    return { rows, top5ConcentrationPct, hasAny: items.length > 0 };
  }, [snapshotRisks]);

  const driversActive =
    driversView === "cost" ? driversCostRanked : driversScheduleRanked;

  /**
   * Mitigation Impact: pre/post expected exposure (p × ML) from register risk inputs.
   * Read-only; does not alter simulation engine outputs.
   */
  const mitigationImpactMetrics = useMemo(() => {
    const scoped = risks.filter((r) => !isRiskStatusExcludedFromSimulation(r.status));
    const rows = scoped.map((r) => {
      const pp = probPre(r);
      const po = probPost(r);
      const cp = costMLPre(r);
      const co = costMLPost(r);
      const tp = timeMLPre(r);
      const preCost = pp * cp;
      const postCost = po * co;
      const preTime = pp * tp;
      const postTime = po * timeMLPost(r, tp);
      return {
        id: r.id,
        title: r.title,
        preCost,
        postCost,
        preTime,
        postTime,
        reductionCost: preCost - postCost,
        reductionTime: preTime - postTime,
        hasMitigation: hasFullPostMitigation(r),
      };
    });
    const totalPreCost = rows.reduce((s, x) => s + x.preCost, 0);
    const totalPostCost = rows.reduce((s, x) => s + x.postCost, 0);
    const totalPreTime = rows.reduce((s, x) => s + x.preTime, 0);
    const totalPostTime = rows.reduce((s, x) => s + x.postTime, 0);
    const costReduction = totalPreCost - totalPostCost;
    const timeReduction = totalPreTime - totalPostTime;
    const costReductionPct = totalPreCost > 0 ? costReduction / totalPreCost : 0;
    const timeReductionPct = totalPreTime > 0 ? timeReduction / totalPreTime : 0;
    const hasMitigationData = rows.some((x) => x.hasMitigation);
    const unmitigatedPreCost = rows.filter((x) => !x.hasMitigation).reduce((s, x) => s + x.preCost, 0);
    const unmitigatedPreTime = rows.filter((x) => !x.hasMitigation).reduce((s, x) => s + x.preTime, 0);
    const unmitigatedShareCost = totalPreCost > 0 ? unmitigatedPreCost / totalPreCost : 0;
    const unmitigatedShareTime = totalPreTime > 0 ? unmitigatedPreTime / totalPreTime : 0;
    const topWinsCost = [...rows]
      .filter((x) => x.reductionCost > 0)
      .sort((a, b) => b.reductionCost - a.reductionCost)
      .slice(0, 3);
    const topWinsTime = [...rows]
      .filter((x) => x.reductionTime > 0)
      .sort((a, b) => b.reductionTime - a.reductionTime)
      .slice(0, 3);
    return {
      rows,
      totalPreCost,
      totalPostCost,
      totalPreTime,
      totalPostTime,
      costReduction,
      timeReduction,
      costReductionPct,
      timeReductionPct,
      hasMitigationData,
      unmitigatedShareCost,
      unmitigatedShareTime,
      topWinsCost,
      topWinsTime,
    };
  }, [risks]);

  const mitigationImpactDisplay = useMemo(() => {
    const m = mitigationImpactMetrics;
    const isCost = mitigationImpactView === "cost";
    const totalPre = isCost ? m.totalPreCost : m.totalPreTime;
    const totalPost = isCost ? m.totalPostCost : m.totalPostTime;
    const reduction = isCost ? m.costReduction : m.timeReduction;
    const reductionPct = isCost ? m.costReductionPct : m.timeReductionPct;
    const unmitigatedShare = isCost ? m.unmitigatedShareCost : m.unmitigatedShareTime;
    const topWins = isCost ? m.topWinsCost : m.topWinsTime;
    const formatExposure = (v: number) =>
      isCost
        ? displayContext
          ? formatMoneyMillions(v / 1e6)
          : new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(v)
        : formatDurationDays(v);
    const barReductionPct = totalPre > 0 ? Math.min(100, Math.max(0, (reduction / totalPre) * 100)) : 0;
    const reductionPctLabel =
      totalPre > 0 && Number.isFinite(reductionPct) ? `${(reductionPct * 100).toFixed(1)}%` : "—";
    const unmitigatedPctLabel =
      totalPre > 0 && Number.isFinite(unmitigatedShare) ? `${(unmitigatedShare * 100).toFixed(1)}%` : "—";
    return {
      isCost,
      totalPre,
      totalPost,
      reduction,
      reductionPct,
      unmitigatedShare,
      topWins,
      formatExposure,
      barReductionPct,
      reductionPctLabel,
      unmitigatedPctLabel,
    };
  }, [mitigationImpactView, mitigationImpactMetrics, displayContext]);

  const simulationHeaderActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          onClick={async () => {
            if (simulationReadOnly) return;
            const snapshotProjectId = effectiveProjectId?.trim();
            if (!snapshotProjectId) {
              console.error("[simulation] runSimulation skipped: projectId is required for snapshot access");
              return;
            }
            try {
              setSnapshotPersistWarning(null);
              const result = await runSimulation(10000, snapshotProjectId);
              if (!result.ran && result.blockReason === "invalid") {
                setRunBlockedInvalidCount(result.invalidCount);
                return;
              }
              if (!result.ran && result.blockReason === "missing_project") {
                console.error("[simulation] runSimulation blocked:", result.message);
                return;
              }
              if (!result.ran && result.blockReason === "snapshot_persist") {
                setSnapshotPersistWarning(result.message);
                return;
              }
              if (result.ran) {
                await hydrateAfterSuccessfulRun(snapshotProjectId, result.snapshotId);
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
          onClick={async () => {
            const snapshotProjectId = effectiveProjectId?.trim();
            if (!snapshotProjectId) {
              console.error("[simulation] clearProjectSnapshots skipped: projectId is required for snapshot access");
              return;
            }
            clearSimulationHistory();
            try {
              await clearProjectSnapshots(snapshotProjectId);
            } catch (err) {
              console.error("[simulation] clear snapshots", err);
            }
            setLastRun(null);
            setLockedSnapshotRow(null);
            setSessionLatestSavedSnapshotRow(null);
          }}
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
      hydrateAfterSuccessfulRun,
      effectiveProjectId,
      simulation,
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
    <main className={simulationPageMainClass}>
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
      {snapshotPersistWarning && (
        <Callout status="danger" className="mt-2 font-medium" role="alert">
          Could not save run to the database: {snapshotPersistWarning}
        </Callout>
      )}
      {simulationReadOnly && (
        <Callout status="info" className="mt-2" role="status">
          View-only access: you cannot run or change simulations for this project.
        </Callout>
      )}

      {loadingSnapshot && (
        <NeutralRiskaiLoading variant="content" srLabel="Loading simulation data" />
      )}

      {showDefaultSimulationActions && (
        <div className={`${simulationDocumentTileClass} mt-0 p-6 text-center`}>
          <p className="m-0 font-medium text-[var(--ds-text-primary)]">
            {lockedSnapshotRow
              ? "Load the last reporting run or run a new simulation."
              : "Run a simulation to see results."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              onClick={async () => {
                if (simulationReadOnly) return;
                const snapshotProjectId = effectiveProjectId?.trim();
                if (!snapshotProjectId) {
                  console.error("[simulation] runSimulation skipped: projectId is required for snapshot access");
                  return;
                }
                try {
                  setSnapshotPersistWarning(null);
                  const result = await runSimulation(10000, snapshotProjectId);
                  if (!result.ran && result.blockReason === "invalid") {
                    setRunBlockedInvalidCount(result.invalidCount);
                    return;
                  }
                  if (!result.ran && result.blockReason === "missing_project") {
                    console.error("[simulation] runSimulation blocked:", result.message);
                    return;
                  }
                  if (!result.ran && result.blockReason === "snapshot_persist") {
                    setSnapshotPersistWarning(result.message);
                    return;
                  }
                  if (result.ran) {
                    await hydrateAfterSuccessfulRun(snapshotProjectId, result.snapshotId);
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
            {lockedSnapshotRow && (
              <Button
                type="button"
                onClick={async () => {
                  if (loadingLatestReportedRun) return;
                  const snapshotProjectId = effectiveProjectId?.trim();
                  if (!snapshotProjectId) {
                    console.error("[simulation] getLatestLockedSnapshot skipped: projectId is required for snapshot access");
                    return;
                  }
                  setLoadingLatestReportedRun(true);
                  try {
                    const row = await getLatestLockedSnapshot(snapshotProjectId);
                    setLockedSnapshotRow(row ?? null);
                    if (!row) return;
                    hydrateRef.current(row, "simulation-load-last-reported");
                    if (row.created_at) setLastRun(row.created_at);
                  } catch (err) {
                    console.error("[simulation] load latest locked snapshot", err);
                  } finally {
                    setLoadingLatestReportedRun(false);
                  }
                }}
                disabled={loadingLatestReportedRun}
                variant="secondary"
              >
                {loadingLatestReportedRun ? "Loading…" : "Load Last Reporting Run"}
              </Button>
            )}
          </div>
        </div>
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
                          : c.signal === "warning"
                            ? "bg-[var(--ds-status-warning-subtle-bg)]"
                            : "bg-[var(--ds-status-danger-subtle-bg)]";
                      const valueClass =
                        c.signal === "favorable"
                          ? "text-[var(--ds-status-success-fg)]"
                          : c.signal === "warning"
                            ? "text-[var(--ds-status-warning-fg)]"
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
                  costLineSeverity={projectPositionMetrics.costLine}
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
                  timeLineSeverity={projectPositionMetrics.timeLine}
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

          <section className={`${simulationDocumentSectionClass} mt-8`}>
            <h2 className="border-b border-[var(--ds-border)] px-4 py-3 text-base font-semibold text-[var(--ds-text-primary)] m-0">
              Risk Drivers
            </h2>
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={driversView === "cost" ? "primary" : "secondary"}
                  onClick={() => {
                    setDriversView("cost");
                    setDriversTableExpanded(false);
                  }}
                >
                  Cost
                </Button>
                <Button
                  type="button"
                  variant={driversView === "schedule" ? "primary" : "secondary"}
                  onClick={() => {
                    setDriversView("schedule");
                    setDriversTableExpanded(false);
                  }}
                >
                  Schedule
                </Button>
              </div>
              <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                {driversView === "cost"
                  ? driversActive.hasAny
                    ? `Top 5 risks account for ${driversActive.top5ConcentrationPct.toFixed(1)}% of total cost exposure`
                    : "Top 5 risks account for — of total cost exposure"
                  : driversActive.hasAny
                    ? `Top 5 risks account for ${driversActive.top5ConcentrationPct.toFixed(1)}% of total schedule exposure`
                    : "Top 5 risks account for — of total schedule exposure"}
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
                      (driversTableExpanded
                        ? driversActive.rows
                        : driversActive.rows.slice(0, 5)
                      ).map((row, i) => (
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
              {driversActive.rows.length > 5 ? (
                <div className="flex justify-start">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDriversTableExpanded((e) => !e)}
                  >
                    {driversTableExpanded ? "Show less" : "Show 5 more"}
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <section className={`${simulationDocumentSectionClass} mt-8`}>
            <div className="border-b border-[var(--ds-border)] px-4 py-3">
              <h2 className="text-base font-semibold text-[var(--ds-text-primary)] m-0">Mitigation Impact</h2>
              <p className="m-0 mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                Impact of mitigation actions on total exposure
              </p>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={mitigationImpactView === "cost" ? "primary" : "secondary"}
                  onClick={() => setMitigationImpactView("cost")}
                >
                  Cost
                </Button>
                <Button
                  type="button"
                  variant={mitigationImpactView === "schedule" ? "primary" : "secondary"}
                  onClick={() => setMitigationImpactView("schedule")}
                >
                  Schedule
                </Button>
              </div>
              {!mitigationImpactMetrics.hasMitigationData ? (
                <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                  No mitigation data available
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <DashboardTileKpi
                      label="Pre-Mitigation Exposure"
                      value={mitigationImpactDisplay.formatExposure(mitigationImpactDisplay.totalPre)}
                      density="compact"
                    />
                    <DashboardTileKpi
                      label="Post-Mitigation Exposure"
                      value={mitigationImpactDisplay.formatExposure(mitigationImpactDisplay.totalPost)}
                      density="compact"
                    />
                    <DashboardTileKpi
                      label="Reduction"
                      value={mitigationImpactDisplay.formatExposure(mitigationImpactDisplay.reduction)}
                      helperText={
                        mitigationImpactDisplay.reductionPctLabel !== "—"
                          ? `${mitigationImpactDisplay.reductionPctLabel} of pre-mitigation exposure`
                          : undefined
                      }
                      accent={mitigationImpactDisplay.reduction > 0 ? "success" : "none"}
                      density="compact"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                      Exposure composition
                    </div>
                    <div
                      className="flex h-2 w-full min-w-0 overflow-hidden rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)]"
                      role="img"
                      aria-label={
                        mitigationImpactDisplay.isCost
                          ? `Pre-mitigation cost exposure; reduction ${mitigationImpactDisplay.barReductionPct.toFixed(1)} percent of pre`
                          : `Pre-mitigation schedule exposure; reduction ${mitigationImpactDisplay.barReductionPct.toFixed(1)} percent of pre`
                      }
                    >
                      <div
                        className="h-full shrink-0 bg-[var(--ds-status-success)]"
                        style={{ width: `${mitigationImpactDisplay.barReductionPct}%` }}
                      />
                      <div className="min-h-2 min-w-0 flex-1 bg-[var(--ds-surface-muted)]" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                      Top mitigation wins
                    </div>
                    {mitigationImpactDisplay.topWins.length === 0 ? (
                      <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                        No reductions in this view.
                      </p>
                    ) : (
                      <ul className="m-0 list-none space-y-2 p-0">
                        {mitigationImpactDisplay.topWins.map((w) => (
                          <li
                            key={w.id}
                            className="flex items-baseline justify-between gap-3 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]"
                          >
                            <span className="min-w-0 truncate font-medium" title={w.title}>
                              {w.title}
                            </span>
                            <span className="shrink-0 tabular-nums text-[var(--ds-text-secondary)]">
                              {mitigationImpactDisplay.isCost
                                ? mitigationImpactDisplay.formatExposure(w.reductionCost)
                                : mitigationImpactDisplay.formatExposure(w.reductionTime)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <DashboardTileKpi
                    label="Unmitigated exposure"
                    value={mitigationImpactDisplay.unmitigatedPctLabel}
                    helperText="% of total pre-mitigation exposure from risks with no post-mitigation defined"
                    density="compact"
                  />
                </>
              )}
            </div>
          </section>

          <section className={`${simulationDocumentSectionClass} mt-8`}>
            <h2 className="border-b border-[var(--ds-border)] px-4 py-3 text-base font-semibold text-[var(--ds-text-primary)] m-0">
              Data Confidence
            </h2>
            <div className="space-y-5 p-4">
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
            </div>
          </section>
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
          className="ds-modal-backdrop z-[60]"
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
                    const latestLockedRow = await getLatestLockedSnapshot(effectiveProjectId);
                    setLockedSnapshotRow(latestLockedRow ?? null);
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
