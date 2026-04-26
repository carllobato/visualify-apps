/**
 * Executive overview metrics from the reporting simulation + risk register.
 * Reuses the same driver and CDF construction patterns as Run Data / Simulation (no duplicated engine math).
 */

import type { SimulationSnapshotPayload, SimulationSnapshotRow } from "@/lib/db/snapshots";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatDurationDays } from "@/lib/formatDuration";
import type { SimulationSnapshot } from "@/domain/simulation/simulation.types";
import type { MonteCarloNeutralSnapshot } from "@/domain/simulation/simulation.types";
import type { Risk } from "@/domain/risk/risk.schema";
import { computePortfolioExposure } from "@/engine/forwardExposure";
import type { PortfolioExposure } from "@/engine/forwardExposure";
import { appliesToExcludesCost, isRiskStatusArchived } from "@/domain/risk/riskFieldSemantics";
import {
  monitoringCostOpportunityExpected,
  monitoringScheduleOpportunityExpected,
} from "@/lib/opportunityMetrics";
import {
  buildRating,
  costToConsequenceScale,
  probabilityPctToScale,
  timeDaysToConsequenceScale,
} from "@/domain/risk/risk.logic";
import {
  binSamplesIntoHistogram,
  binSamplesIntoTimeHistogram,
  costAtPercentile,
  deriveCostHistogramFromPercentiles,
  deriveTimeHistogramFromPercentiles,
  distributionToCostCdf,
  distributionToTimeCdf,
  percentileAtCost,
  percentileAtTime,
  timeAtPercentile,
  type CostCdfPoint,
  type TimeCdfPoint,
} from "@/lib/simulationDisplayUtils";

const DISTRIBUTION_BIN_COUNT = 50;

const REPORTING_ANCHOR_PERCS = [20, 50, 80, 90] as const;
export type ReportingAnchorPercentile = (typeof REPORTING_ANCHOR_PERCS)[number];

function finiteOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Closest of P20/P50/P80/P90 to the configured risk appetite (0–100). */
export function nearestReportingAnchorPercentile(targetPercent: number): ReportingAnchorPercentile {
  const t = Math.min(100, Math.max(0, targetPercent));
  let best: ReportingAnchorPercentile = 80;
  let bestDist = Infinity;
  for (const a of REPORTING_ANCHOR_PERCS) {
    const d = Math.abs(a - t);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

export function snapshotCostAtAnchor(
  row: SimulationSnapshotRow,
  anchor: ReportingAnchorPercentile
): number | null {
  switch (anchor) {
    case 20:
      return finiteOrNull(row?.cost_p20);
    case 50:
      return finiteOrNull(row?.cost_p50);
    case 80:
      return finiteOrNull(row?.cost_p80);
    case 90:
      return finiteOrNull(row?.cost_p90);
    default:
      return null;
  }
}

export function snapshotTimeAtAnchor(
  row: SimulationSnapshotRow,
  anchor: ReportingAnchorPercentile
): number | null {
  switch (anchor) {
    case 20:
      return finiteOrNull(row?.time_p20);
    case 50:
      return finiteOrNull(row?.time_p50);
    case 80:
      return finiteOrNull(row?.time_p80);
    case 90:
      return finiteOrNull(row?.time_p90);
    default:
      return null;
  }
}

type PercValuePoint = { p: number; v: number };

function buildSortedPercValuePoints(
  row: SimulationSnapshotRow,
  kind: "cost" | "time"
): PercValuePoint[] {
  const pts: PercValuePoint[] = [];
  for (const a of REPORTING_ANCHOR_PERCS) {
    const v = kind === "cost" ? snapshotCostAtAnchor(row, a) : snapshotTimeAtAnchor(row, a);
    if (v != null) pts.push({ p: a, v });
  }
  pts.sort((x, y) => x.p - y.p);
  return pts;
}

/** Piecewise-linear interpolation on sorted P/v anchors (e.g. P20–P90). */
function interpolatePercAnchors(pts: PercValuePoint[], targetPercent: number): number | null {
  if (pts.length === 0) return null;
  const t = Math.min(100, Math.max(0, targetPercent));
  if (t <= pts[0].p) return pts[0].v;
  if (t >= pts[pts.length - 1].p) return pts[pts.length - 1].v;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t >= a.p && t <= b.p) {
      const u = (t - a.p) / (b.p - a.p);
      return a.v + (b.v - a.v) * u;
    }
  }
  return null;
}

function buildTotalSimulatedCostPercValuePoints(
  neutral: MonteCarloNeutralSnapshot | null | undefined
): PercValuePoint[] {
  const tot = neutral?.summary?.costBreakdown?.totalSimulatedCost;
  if (!tot) return [];
  const pts: PercValuePoint[] = [];
  const add = (p: number, v: unknown) => {
    const n = Number(v);
    if (Number.isFinite(n)) pts.push({ p, v: n });
  };
  add(20, tot.p20);
  add(50, tot.p50);
  add(80, tot.p80);
  add(90, tot.p90);
  return pts.sort((a, b) => a.p - b.p);
}

/**
 * Mean modeled total cost (direct risks + delay-derived commercial impact when modeled).
 * Prefers persisted `costBreakdown.totalSimulatedCost.mean` so the headline matches simulation / driver tables
 * when denormalized `cost_mean` drifts or predates breakdown.
 */
export function modeledTotalCostMeanDollars(
  row: SimulationSnapshotRow,
  neutral: MonteCarloNeutralSnapshot | null | undefined
): number | null {
  const tot = neutral?.summary?.costBreakdown?.totalSimulatedCost?.mean;
  if (tot != null && Number.isFinite(Number(tot))) return Number(tot);
  const m = neutral?.summary?.meanCost;
  if (m != null && Number.isFinite(Number(m))) return Number(m);
  const r = Number(row?.cost_mean);
  return Number.isFinite(r) ? r : null;
}

/**
 * Target-P line for **total** simulated cost (same basis as {@link modeledTotalCostMeanDollars}).
 * Uses `totalSimulatedCost` percentile anchors from the payload when present; otherwise snapshot columns.
 */
export function interpolateModeledTotalCostAtRiskPercentile(
  row: SimulationSnapshotRow,
  neutral: MonteCarloNeutralSnapshot | null | undefined,
  targetPercent: number
): number | null {
  const fromBreakdown = buildTotalSimulatedCostPercValuePoints(neutral);
  if (fromBreakdown.length > 0) {
    const v = interpolatePercAnchors(fromBreakdown, targetPercent);
    if (v != null) return v;
  }
  return interpolateSnapshotAtRiskPercentile(row, targetPercent, "cost");
}

/**
 * Piecewise-linear value at a cumulative percentile using snapshot P20/P50/P80/P90 only.
 * Outside [min anchor, max anchor] returns the nearest endpoint.
 */
export function interpolateSnapshotAtRiskPercentile(
  row: SimulationSnapshotRow,
  targetPercent: number,
  kind: "cost" | "time"
): number | null {
  const pts = buildSortedPercValuePoints(row, kind);
  return interpolatePercAnchors(pts, targetPercent);
}

const SNAPSHOT_COST_BUFFER_KEYS = [
  "available_exposure",
  "availableExposure",
  "contingency_remaining",
  "cost_contingency_remaining",
  "remaining_contingency",
  "cost_buffer_remaining",
] as const;

const SNAPSHOT_TIME_BUFFER_KEYS = [
  "time_contingency_remaining",
  "schedule_buffer_remaining",
  "remaining_schedule_contingency",
] as const;

function firstFiniteFromRecord(
  rec: Record<string, unknown> | null | undefined,
  keys: readonly string[]
): number | null {
  if (!rec) return null;
  for (const k of keys) {
    const n = finiteOrNull(rec[k]);
    if (n != null && n >= 0) return n;
  }
  return null;
}

/** Optional buffer scalars if ever persisted on snapshot payload (otherwise null). */
export function optionalBufferFromSnapshotPayload(row: SimulationSnapshotRow): {
  costDollars: number | null;
  /** Schedule buffer in working days for v2 snapshots; legacy payloads may only imply generic days. */
  timeDays: number | null;
} {
  const pl = row?.payload;
  const summary =
    pl?.summary && typeof pl.summary === "object"
      ? (pl.summary as Record<string, unknown>)
      : null;
  const summaryReport =
    pl?.summaryReport && typeof pl.summaryReport === "object"
      ? (pl.summaryReport as Record<string, unknown>)
      : null;
  const costDollars =
    firstFiniteFromRecord(summary, SNAPSHOT_COST_BUFFER_KEYS) ??
    firstFiniteFromRecord(summaryReport, SNAPSHOT_COST_BUFFER_KEYS);
  const timeDays =
    firstFiniteFromRecord(summary, SNAPSHOT_TIME_BUFFER_KEYS) ??
    firstFiniteFromRecord(summaryReport, SNAPSHOT_TIME_BUFFER_KEYS);
  return { costDollars, timeDays };
}

function topRiskTitleByField(
  row: SimulationSnapshotRow,
  scoreField: "simMeanCost" | "simMeanDays"
): string | null {
  const risks = row?.payload?.risks;
  if (!Array.isArray(risks) || risks.length === 0) return null;
  let bestTitle: string | null = null;
  let bestScore = -Infinity;
  for (const r of risks) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const score = finiteOrNull(o[scoreField]);
    if (score == null || score <= 0) continue;
    if (score > bestScore) {
      bestScore = score;
      const title = typeof o.title === "string" ? o.title.trim() : "";
      bestTitle = title.length > 0 ? title : String(o.id ?? "");
    }
  }
  return bestTitle;
}

/** Largest simMeanCost risk title from locked snapshot payload (read-only). */
export function topCostRiskTitleFromSnapshotPayload(row: SimulationSnapshotRow): string | null {
  return topRiskTitleByField(row, "simMeanCost");
}

/** Largest simMeanDays risk title from locked snapshot payload (read-only). */
export function topTimeRiskTitleFromSnapshotPayload(row: SimulationSnapshotRow): string | null {
  return topRiskTitleByField(row, "simMeanDays");
}

/** Mean vs piecewise appetite-line cost from snapshot columns (no live simulation). */
export function formatModelledCostGapMeanVsAppetiteLine(
  meanCost: number | null,
  appetiteLineCost: number | null
): string {
  if (meanCost == null || appetiteLineCost == null) return "—";
  if (!Number.isFinite(meanCost) || !Number.isFinite(appetiteLineCost)) return "—";
  const d = meanCost - appetiteLineCost;
  const mag = formatCurrency(Math.abs(d));
  if (d === 0) return "Mean aligned with appetite-line modeled cost";
  if (d > 0) return `${mag} above appetite-line modeled cost (mean)`;
  return `${mag} below appetite-line modeled cost (mean)`;
}

export function formatModelledTimeGapMeanVsAppetiteLine(
  meanDays: number | null,
  appetiteLineDays: number | null
): string {
  if (meanDays == null || appetiteLineDays == null) return "—";
  if (!Number.isFinite(meanDays) || !Number.isFinite(appetiteLineDays)) return "—";
  const d = meanDays - appetiteLineDays;
  const mag = formatDurationDays(Math.abs(d));
  if (d === 0) return "Mean aligned with appetite-line modeled time";
  if (d > 0) return `${mag} above appetite-line modeled time (mean)`;
  return `${mag} below appetite-line modeled time (mean)`;
}

export function computeNeutralForwardExposure(risks: Risk[]): PortfolioExposure {
  const topN = Math.min(500, Math.max(1, risks.length));
  return computePortfolioExposure(risks, "neutral", 12, { topN, includeDebug: false });
}

export type CostDriverLine = { riskId: string; riskName: string; delta: number };

export type ScheduleDriverLine = {
  riskId: string;
  riskName: string;
  totalDays: number;
  delta: number;
};

/** Same synthetic id/title as simulation cost-driver ranking (`SimulationPageContent` driversCostRanked). */
export const SIMULATION_DELAY_COMMERCIAL_COST_DRIVER_ID = "__delay_commercial_impact__";
export const SIMULATION_DELAY_COMMERCIAL_COST_DRIVER_TITLE = "Delay-related Commercial Impact";

/**
 * Synthetic delay-commercial rows use the bare id in run/simulation UIs, or
 * `__delay_commercial_impact__:<projectId>` when merged into portfolio top-risk tables.
 */
export function isSimulationDelayCommercialCostDriverRiskId(riskId: string): boolean {
  return (
    riskId === SIMULATION_DELAY_COMMERCIAL_COST_DRIVER_ID ||
    riskId.startsWith(`${SIMULATION_DELAY_COMMERCIAL_COST_DRIVER_ID}:`)
  );
}

/**
 * Dollar exposure for driver ranking UI: delay-derived mean or neutral forward total for the risk.
 * Matches key single-driver exposure semantics on the project overview.
 */
export function costDriverExposureUsd(
  line: CostDriverLine,
  neutralExposure: PortfolioExposure | null,
  neutral: MonteCarloNeutralSnapshot | null | undefined
): number | null {
  if (isSimulationDelayCommercialCostDriverRiskId(line.riskId)) {
    const m = neutral?.summary?.costBreakdown?.delayDerivedCost?.mean;
    return m != null && Number.isFinite(m) && m >= 0 ? m : null;
  }
  if (!neutralExposure) return null;
  const t = neutralExposure.topDrivers.find((d) => d.riskId === line.riskId);
  return t != null && Number.isFinite(t.total) && t.total >= 0 ? t.total : null;
}

/**
 * Dollar mean of delay-derived commercial impact from the neutral summary, when material vs total simulated cost
 * (≥ 0.1% of total), matching simulation’s cost driver table.
 */
export function delayDerivedCommercialExposureUsdFromNeutral(
  neutral: MonteCarloNeutralSnapshot | null | undefined
): number | null {
  const cb = neutral?.summary?.costBreakdown;
  const delayMean = cb?.delayDerivedCost?.mean;
  const totalMean = cb?.totalSimulatedCost?.mean ?? neutral?.summary?.meanCost ?? 0;
  if (delayMean == null || !Number.isFinite(delayMean) || delayMean <= 0) return null;
  if (!Number.isFinite(totalMean) || totalMean <= 0) return null;
  if (delayMean / totalMean < 0.001) return null;
  return delayMean;
}

export function delayDerivedCommercialExposureUsdFromSnapshotSummary(
  summary: MonteCarloNeutralSnapshot["summary"] | undefined | null
): number | null {
  if (!summary) return null;
  return delayDerivedCommercialExposureUsdFromNeutral({ summary } as MonteCarloNeutralSnapshot);
}

/**
 * Merges delay-derived commercial impact with per-risk cost drivers and re-sorts by modeled $ exposure
 * (same ordering idea as simulation cost drivers).
 */
export function rankCostDriverLinesWithDelayCommercial(params: {
  baseLines: CostDriverLine[];
  neutralExposure: PortfolioExposure;
  neutral: MonteCarloNeutralSnapshot | null | undefined;
}): CostDriverLine[] {
  const { baseLines, neutralExposure, neutral } = params;
  const exposureByRiskId = new Map(neutralExposure.topDrivers.map((d) => [d.riskId, d.total]));
  const tuples: { line: CostDriverLine; exposure: number }[] = baseLines.map((line) => ({
    line,
    exposure: exposureByRiskId.get(line.riskId) ?? 0,
  }));
  const delayExposure = delayDerivedCommercialExposureUsdFromNeutral(neutral);
  if (delayExposure != null) {
    tuples.push({
      line: {
        riskId: SIMULATION_DELAY_COMMERCIAL_COST_DRIVER_ID,
        riskName: SIMULATION_DELAY_COMMERCIAL_COST_DRIVER_TITLE,
        delta: 0,
      },
      exposure: delayExposure,
    });
  }
  tuples.sort((a, b) => b.exposure - a.exposure);
  return tuples.map((t) => t.line);
}

/** Cost drivers aligned with Run Data, with monitoring-only planned opportunity deltas. */
export function buildCostDriverLines(
  current: SimulationSnapshot | undefined,
  risks: Risk[],
  neutralExposure: PortfolioExposure
): CostDriverLine[] {
  const runRiskIds = new Set((current?.risks ?? []).map((r) => r.id));
  let list =
    runRiskIds.size > 0
      ? neutralExposure.topDrivers.filter((d) => runRiskIds.has(d.riskId))
      : [...neutralExposure.topDrivers];
  list = list.filter((d) => {
    const risk = risks.find((r) => r.id === d.riskId);
    if (!risk) return true;
    if (appliesToExcludesCost(risk.appliesTo)) return false;
    return typeof risk.preMitigationCostML === "number" && risk.preMitigationCostML > 0;
  });
  return list.map((d) => {
    const risk = risks.find((r) => r.id === d.riskId);
    return {
      riskId: d.riskId,
      riskName: risk?.title ?? d.riskId,
      delta: risk ? Math.max(0, monitoringCostOpportunityExpected(risk) ?? 0) : 0,
    };
  });
}

/** Schedule drivers aligned with Run Data, with monitoring-only planned opportunity deltas. */
export function buildScheduleDriverLines(
  current: SimulationSnapshot | undefined,
  risks: Risk[]
): ScheduleDriverLine[] {
  const list = current?.risks ?? [];
  const sorted = [...list]
    .filter((r) => (r.simMeanDays ?? r.expectedDays ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.simMeanDays ?? b.expectedDays ?? 0) - (a.simMeanDays ?? a.expectedDays ?? 0)
    );
  return sorted.map((r) => {
    const days = r.simMeanDays ?? r.expectedDays ?? 0;
    const risk = risks.find((x) => x.id === r.id);
    return {
      riskId: r.id,
      riskName: risk?.title ?? r.title ?? r.id,
      totalDays: days,
      delta: risk ? Math.max(0, monitoringScheduleOpportunityExpected(risk) ?? 0) : 0,
    };
  });
}

export function cdfsFromNeutralSnapshot(
  neutral: MonteCarloNeutralSnapshot | undefined
): { costCdf: CostCdfPoint[] | null; timeCdf: TimeCdfPoint[] | null } {
  if (!neutral?.summary) return { costCdf: null, timeCdf: null };
  const s = neutral.summary;
  const costSamples = neutral.costSamples ?? [];
  const timeSamples = neutral.timeSamples ?? [];

  const costCdf =
    costSamples.length > 0
      ? distributionToCostCdf(binSamplesIntoHistogram(costSamples, DISTRIBUTION_BIN_COUNT))
      : distributionToCostCdf(
          deriveCostHistogramFromPercentiles(
            {
              p20Cost: s.p20Cost,
              p50Cost: s.p50Cost,
              p80Cost: s.p80Cost,
              p90Cost: s.p90Cost,
            },
            DISTRIBUTION_BIN_COUNT
          )
        );

  const timeCdf =
    timeSamples.length > 0
      ? distributionToTimeCdf(binSamplesIntoTimeHistogram(timeSamples, DISTRIBUTION_BIN_COUNT))
      : distributionToTimeCdf(
          deriveTimeHistogramFromPercentiles(
            {
              p20Time: s.p20Time,
              p50Time: s.p50Time,
              p80Time: s.p80Time,
              p90Time: s.p90Time,
            },
            DISTRIBUTION_BIN_COUNT
          )
        );

  return { costCdf, timeCdf };
}

export function formatPercentileLabel(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  const rounded = Math.round(Math.min(100, Math.max(0, p)));
  return `P${rounded}`;
}

/**
 * Same “Current Funding Confidence” cost P as the simulation cost tile (`percentileAtCost` at held contingency,
 * else approved budget). Built from the reporting run’s neutral snapshot CDF.
 */
export function currentFundingConfidenceLabelFromNeutral(params: {
  neutral: MonteCarloNeutralSnapshot | null | undefined;
  contingencyDollars: number | null;
  /** Same dollars scale as simulation: `approvedBudget_m * 1e6`. */
  approvedBudgetDollars: number | null;
}): string | null {
  const { neutral, contingencyDollars, approvedBudgetDollars } = params;
  const { costCdf } = cdfsFromNeutralSnapshot(neutral ?? undefined);
  if (!costCdf?.length) return null;
  const costValue =
    contingencyDollars != null && Number.isFinite(contingencyDollars)
      ? contingencyDollars
      : approvedBudgetDollars;
  if (costValue == null || !Number.isFinite(costValue) || costValue <= 0) return null;
  const p = percentileAtCost(costCdf, costValue);
  if (p == null) return null;
  return formatPercentileLabel(Math.round(p));
}

/**
 * Same “current schedule P” as the simulation time tile (`percentileAtTime` at schedule contingency working days).
 * When schedule contingency is missing, return null (no fallback reference).
 */
export function currentScheduleConfidenceLabelFromNeutral(params: {
  neutral: MonteCarloNeutralSnapshot | null | undefined;
  scheduleContingencyDays: number | null;
}): string | null {
  const { neutral, scheduleContingencyDays } = params;
  const { timeCdf } = cdfsFromNeutralSnapshot(neutral ?? undefined);
  if (!timeCdf?.length) return null;
  const timeValue =
    scheduleContingencyDays != null && Number.isFinite(scheduleContingencyDays) && scheduleContingencyDays > 0
      ? scheduleContingencyDays
      : null;
  if (timeValue == null || !Number.isFinite(timeValue) || timeValue <= 0) return null;
  const p = percentileAtTime(timeCdf, timeValue);
  if (p == null) return null;
  return formatPercentileLabel(Math.round(p));
}

export function dollarGapVersusTargetPercentile(
  costCdf: CostCdfPoint[] | null,
  targetPercent: number,
  contingencyDollars: number | null
): number | null {
  if (!costCdf || contingencyDollars == null || !Number.isFinite(contingencyDollars)) return null;
  const atTarget = costAtPercentile(costCdf, targetPercent);
  if (atTarget == null || !Number.isFinite(atTarget)) return null;
  return contingencyDollars - atTarget;
}

export function timeGapVersusTargetPercentile(
  timeCdf: TimeCdfPoint[] | null,
  targetPercent: number,
  contingencyDays: number | null
): number | null {
  if (!timeCdf || contingencyDays == null || !Number.isFinite(contingencyDays)) return null;
  const atTarget = timeAtPercentile(timeCdf, targetPercent);
  if (atTarget == null || !Number.isFinite(atTarget)) return null;
  return contingencyDays - atTarget;
}

/**
 * Same 5×5 matrix as portfolio dashboard tiles (`computeRag`), using effective MC inputs
 * persisted on the snapshot (`inputs_used`: trigger probability 0–1, cost_ml, time_ml).
 */
function ratingLevelFromSnapshotInputsLine(line: {
  probability: number;
  cost_ml: number;
  time_ml: number;
}): ReturnType<typeof buildRating>["level"] {
  const p = Number(line.probability);
  const probScale = probabilityPctToScale((Number.isFinite(p) ? p : 0) * 100);
  const cons = Math.max(
    costToConsequenceScale(Number(line.cost_ml) || 0),
    timeDaysToConsequenceScale(Number(line.time_ml) || 0)
  );
  return buildRating(probScale, cons).level;
}

/** Count high + extreme rows from persisted simulation inputs (reporting run). */
export function reportingRunHighExtremeCountFromInputsUsed(
  inputs: SimulationSnapshotPayload["inputs_used"] | null | undefined
): number {
  if (!inputs?.length) return 0;
  let n = 0;
  for (const line of inputs) {
    const lv = ratingLevelFromSnapshotInputsLine(line);
    if (lv === "high" || lv === "extreme") n += 1;
  }
  return n;
}

/** Active risks included in the locked run: prefers `inputs_used`, then `risk_count`, then payload risk list length. */
export function reportingRunActiveRiskCount(row: SimulationSnapshotRow | null | undefined): number {
  if (!row) return 0;
  const inputs = row.payload?.inputs_used;
  if (Array.isArray(inputs) && inputs.length > 0) return inputs.length;
  const rc = row.risk_count;
  if (rc != null && Number.isFinite(Number(rc))) return Math.max(0, Math.floor(Number(rc)));
  const pr = row.payload?.risks;
  if (Array.isArray(pr)) return pr.length;
  return 0;
}

/**
 * High / extreme count for the reporting run: from `inputs_used` when present; otherwise current
 * register residual levels limited to risk IDs present in the snapshot payload (legacy snapshots).
 */
export function reportingRunHighExtremeCount(
  row: SimulationSnapshotRow | null | undefined,
  liveRisks: Risk[]
): number {
  const inputs = row?.payload?.inputs_used;
  if (Array.isArray(inputs) && inputs.length > 0) {
    return reportingRunHighExtremeCountFromInputsUsed(inputs);
  }
  const ids = new Set<string>();
  const pr = row?.payload?.risks;
  if (Array.isArray(pr)) {
    for (const r of pr as { id?: string }[]) {
      if (r && typeof r.id === "string") ids.add(r.id);
    }
  }
  if (ids.size === 0) return 0;
  return liveRisks.filter((r) => ids.has(r.id) && !isRiskStatusArchived(r.status)).filter((r) => {
    const lv = r.residualRating?.level;
    return lv === "high" || lv === "extreme";
  }).length;
}
