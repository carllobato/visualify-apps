/**
 * Monte Carlo simulation engine — pure, testable, no UI.
 * Runs N iterations across all risks; produces cost/time samples and summary stats.
 * Uses seeded RNG when seed is provided for deterministic runs.
 *
 * Data lineage (Analysis):
 * - Risks with status "closed" or "archived" are excluded from all calculations.
 * - Post-mitigation impacts apply only when `mitigationProfile.status === "active"` (Mitigating) and post ML cost/time are valid; otherwise pre-mitigation (Open / Monitoring / incomplete active).
 * - Cost vs time contributions respect `appliesTo` (cost-only / time-only / both).
 */

import type { Risk } from "@/domain/risk/risk.schema";
import {
  appliesToExcludesCost,
  appliesToExcludesTime,
  isRiskStatusExcludedFromSimulation,
} from "@/domain/risk/riskFieldSemantics";
import { probability01FromScale } from "@/domain/risk/risk.logic";
import type {
  SimulationRiskSnapshot,
  SimulationSnapshot,
} from "./simulation.types";

/** Effective inputs for one risk (post if present else pre). null => exclude from analysis (e.g. closed). */
export type EffectiveRiskInputs = {
  sourceUsed: "post" | "pre";
  probability: number;
  costMin: number;
  costML: number;
  costMax: number;
  timeMin: number;
  timeML: number;
  timeMax: number;
};

/** Simulation engine version; surface in Run Data / diagnostics. */
export const SIMULATION_ENGINE_VERSION = "v1.03 (31 Mar 2026)";

function isPresentNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/**
 * Map explicit scenario `risk.probability` (0–1) to pre vs post scale only when it clearly agrees with that side;
 * otherwise use scale-based probability so we never apply a post-derived value under pre-mitigation simulation (and vice versa).
 */
function simulationProbability01(
  risk: Risk,
  usePost: boolean,
  fromScalePre: number,
  fromScalePost: number
): number {
  const explicit =
    typeof risk.probability === "number" && Number.isFinite(risk.probability) && risk.probability >= 0 && risk.probability <= 1
      ? risk.probability
      : null;
  if (explicit === null) {
    return usePost ? fromScalePost : fromScalePre;
  }
  const distPre = Math.abs(explicit - fromScalePre);
  const distPost = Math.abs(explicit - fromScalePost);
  if (distPre < distPost) {
    return usePost ? fromScalePost : explicit;
  }
  if (distPost < distPre) {
    return usePost ? explicit : fromScalePre;
  }
  return usePost ? fromScalePost : fromScalePre;
}

/**
 * Single source of truth for Analysis/simulation inputs.
 * - Excludes closed and archived risks (returns null).
 * - Post-mitigation values only when `mitigationProfile.status === "active"` and post ML cost & time are valid; else pre (including active with incomplete post).
 * - Probability: scale-based pre/post per `usePost`, with `risk.probability` used only when it aligns with that side vs the other scale.
 * - Cost and time in dollars and days; zeroed per `appliesTo` for cost-only / time-only risks.
 */
export function getEffectiveRiskInputs(risk: Risk): EffectiveRiskInputs | null {
  if (isRiskStatusExcludedFromSimulation(risk.status)) return null;

  const mitigationMode = risk.mitigationProfile?.status;
  const hasValidPostValues =
    isPresentNum(risk.postMitigationCostML) && isPresentNum(risk.postMitigationTimeML);
  // Active mitigation (Mitigating) uses post ML when present; otherwise fall back to pre so partially modelled rows stay safe.
  // Replaces prior rule: Boolean(risk.mitigation?.trim()) && post cost ML && post time ML (field presence only).
  const usePost = mitigationMode === "active" && hasValidPostValues;

  const fromScalePre = probability01FromScale(risk.inherentRating.probability);
  const fromScalePost = probability01FromScale(risk.residualRating.probability);
  const probability = simulationProbability01(risk, usePost, fromScalePre, fromScalePost);

  const costRaw = getCostMLForSimulation(risk, usePost);
  const timeRaw = getTimeMLForSimulation(risk, usePost);
  const excludesCost = appliesToExcludesCost(risk.appliesTo);
  const excludesTime = appliesToExcludesTime(risk.appliesTo);
  const costML = excludesCost ? 0 : costRaw;
  const timeML = excludesTime ? 0 : timeRaw;

  const costRange = excludesCost
    ? { costMin: 0, costMax: 0 }
    : getCostRangeForSimulation(risk, usePost, costRaw);
  const timeRange = excludesTime
    ? { timeMin: 0, timeMax: 0 }
    : getTimeRangeForSimulation(risk, usePost, timeRaw);

  const sourceUsed: "post" | "pre" = usePost ? "post" : "pre";

  return {
    sourceUsed,
    probability,
    costMin: costRange.costMin,
    costML,
    costMax: costRange.costMax,
    timeMin: timeRange.timeMin,
    timeML,
    timeMax: timeRange.timeMax,
  };
}

function consequenceToCostFallback(risk: Risk, usePost: boolean): number {
  const c = usePost
    ? (risk.residualRating?.consequence ?? risk.inherentRating?.consequence)
    : risk.inherentRating?.consequence;
  const cons = typeof c === "number" ? c : Number(c);
  if (!Number.isFinite(cons)) return 0;
  const cc = Math.max(1, Math.min(5, Math.round(cons)));
  const map: Record<number, number> = { 1: 25_000, 2: 100_000, 3: 300_000, 4: 750_000, 5: 1_500_000 };
  return map[cc] ?? 0;
}

function getCostMLForSimulation(risk: Risk, usePost: boolean): number {
  const postCost = risk.postMitigationCostML;
  const preCost = risk.preMitigationCostML;
  if (usePost && isPresentNum(postCost)) return postCost;
  if (!usePost && isPresentNum(preCost)) return preCost;
  if (usePost && isPresentNum(preCost)) return preCost;
  return consequenceToCostFallback(risk, usePost);
}

/** Maximum schedule impact (days) used in simulation; range is 0–30 days. */
const SCHEDULE_IMPACT_DAYS_CAP = 30;

function getTimeMLForSimulation(risk: Risk, usePost: boolean): number {
  const postTime = risk.postMitigationTimeML;
  const preTime = risk.preMitigationTimeML;
  if (usePost && isPresentNum(postTime)) return Math.min(postTime, SCHEDULE_IMPACT_DAYS_CAP);
  if (!usePost && isPresentNum(preTime)) return Math.min(preTime, SCHEDULE_IMPACT_DAYS_CAP);
  if (usePost && isPresentNum(preTime)) return Math.min(preTime, SCHEDULE_IMPACT_DAYS_CAP);
  return 0;
}

/**
 * Default spread factor when min/max are not provided.
 * Produces a right-skewed triangular distribution typical of project risk impacts.
 */
const DEFAULT_MIN_FACTOR = 0.75;
const DEFAULT_MAX_FACTOR = 1.5;

function getCostRangeForSimulation(
  risk: Risk,
  usePost: boolean,
  costML: number
): { costMin: number; costMax: number } {
  const rawMin = usePost ? risk.postMitigationCostMin : risk.preMitigationCostMin;
  const rawMax = usePost ? risk.postMitigationCostMax : risk.preMitigationCostMax;
  const hasMin = isPresentNum(rawMin);
  const hasMax = isPresentNum(rawMax);

  if (costML <= 0) return { costMin: 0, costMax: 0 };

  const costMin = hasMin ? Math.min(rawMin!, costML) : costML * DEFAULT_MIN_FACTOR;
  const costMax = hasMax ? Math.max(rawMax!, costML) : costML * DEFAULT_MAX_FACTOR;
  return { costMin: Math.max(0, costMin), costMax };
}

function getTimeRangeForSimulation(
  risk: Risk,
  usePost: boolean,
  timeML: number
): { timeMin: number; timeMax: number } {
  const rawMin = usePost ? risk.postMitigationTimeMin : risk.preMitigationTimeMin;
  const rawMax = usePost ? risk.postMitigationTimeMax : risk.preMitigationTimeMax;
  const hasMin = isPresentNum(rawMin);
  const hasMax = isPresentNum(rawMax);

  if (timeML <= 0) return { timeMin: 0, timeMax: 0 };

  const timeMin = hasMin
    ? Math.min(rawMin!, timeML)
    : timeML * DEFAULT_MIN_FACTOR;
  const timeMax = hasMax
    ? Math.min(Math.max(rawMax!, timeML), SCHEDULE_IMPACT_DAYS_CAP)
    : Math.min(timeML * DEFAULT_MAX_FACTOR, SCHEDULE_IMPACT_DAYS_CAP);
  return { timeMin: Math.max(0, timeMin), timeMax };
}

/** Sample from a triangular distribution (min, mode, max). Returns mode when degenerate. */
function sampleTriangular(random: () => number, min: number, mode: number, max: number): number {
  if (max <= min) return mode;
  const u = random();
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

export type SimulationResult = {
  costSamples: number[];
  timeSamples: number[];
  summary: {
    meanCost: number;
    p20Cost: number;
    p50Cost: number;
    p80Cost: number;
    p90Cost: number;
    minCost: number;
    maxCost: number;
    meanTime: number;
    p20Time: number;
    p50Time: number;
    p80Time: number;
    p90Time: number;
    minTime: number;
    maxTime: number;
  };
};

export type SimulationReport = {
  iterationCount: number;
  averageCost: number;
  averageTime: number;
  costVolatility?: number;
  p50Cost: number;
  p80Cost: number;
  p90Cost: number;
  minCost: number;
  maxCost: number;
};

/** Seeded PRNG (mulberry32) for deterministic runs. Returns 0–1. */
function seededRandom(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Percentile index for sorted data: 0-based nearest-rank with endpoints aligned.
 * idx = floor((p/100) * (n - 1)) so p=0 -> first element, p=100 -> last element.
 * Must match src/lib/simulationDisplayUtils.ts percentileFromSorted for consistent P50/P80/P90.
 */
function percentileIndex(samples: number[], percentile: number): number {
  if (samples.length === 0) return 0;
  const n = samples.length;
  const idx = Math.floor((percentile / 100) * (n - 1));
  return Math.min(idx, n - 1);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  const sumSq = arr.reduce((s, x) => s + (x - m) ** 2, 0);
  return Math.sqrt(sumSq / arr.length);
}

function computeSummary(
  costSamples: number[],
  timeSamples: number[],
  n: number
): SimulationResult["summary"] {
  const costSorted = costSamples.slice().sort((a, b) => a - b);
  const timeSorted = timeSamples.slice().sort((a, b) => a - b);

  return {
    meanCost: mean(costSamples),
    p20Cost: costSorted[percentileIndex(costSorted, 20)] ?? 0,
    p50Cost: costSorted[percentileIndex(costSorted, 50)] ?? 0,
    p80Cost: costSorted[percentileIndex(costSorted, 80)] ?? 0,
    p90Cost: costSorted[percentileIndex(costSorted, 90)] ?? 0,
    minCost: costSorted[0] ?? 0,
    maxCost: costSorted[n - 1] ?? 0,
    meanTime: mean(timeSamples),
    p20Time: timeSorted[percentileIndex(timeSorted, 20)] ?? 0,
    p50Time: timeSorted[percentileIndex(timeSorted, 50)] ?? 0,
    p80Time: timeSorted[percentileIndex(timeSorted, 80)] ?? 0,
    p90Time: timeSorted[percentileIndex(timeSorted, 90)] ?? 0,
    minTime: timeSorted[0] ?? 0,
    maxTime: timeSorted[n - 1] ?? 0,
  };
}

export type RunMonteCarloOptions = {
  risks: Risk[];
  iterations?: number;
  seed?: number;
};

/**
 * Runs Monte Carlo simulation: for each iteration, for each risk,
 * decide if risk triggers (random < probability); if so add most likely cost and time.
 * Closed risks are excluded. Effective inputs encode pre vs post, probability alignment, and appliesTo (cost-only / time-only zero the irrelevant leg).
 * Returns costSamples, timeSamples, and computed summary (mean, p50, p80, p90, min, max).
 */
export function runMonteCarloSimulation(
  options: RunMonteCarloOptions
): SimulationResult {
  const { risks, iterations = 10000, seed } = options;
  const effective = risks.map((r) => getEffectiveRiskInputs(r)).filter((x): x is EffectiveRiskInputs => x != null);
  const n = Math.max(0, Math.floor(iterations));
  const random = seed != null ? seededRandom(seed) : () => Math.random();

  const costSamples: number[] = [];
  const timeSamples: number[] = [];

  for (let i = 0; i < n; i++) {
    let totalCost = 0;
    let totalTime = 0;
    for (const inp of effective) {
      const trigger = random() < inp.probability;
      if (trigger) {
        totalCost += sampleTriangular(random, inp.costMin, inp.costML, inp.costMax);
        totalTime += sampleTriangular(random, inp.timeMin, inp.timeML, inp.timeMax);
      }
    }
    costSamples.push(totalCost);
    timeSamples.push(totalTime);
  }

  const summary = computeSummary(costSamples, timeSamples, n);

  return {
    costSamples,
    timeSamples,
    summary,
  };
}

/**
 * Builds a report object from a simulation result for storage/display.
 */
export function buildSimulationReport(
  result: SimulationResult,
  iterationCount: number
): SimulationReport {
  const costVolatility = stdDev(result.costSamples);
  return {
    iterationCount,
    averageCost: result.summary.meanCost,
    averageTime: result.summary.meanTime,
    costVolatility,
    p50Cost: result.summary.p50Cost,
    p80Cost: result.summary.p80Cost,
    p90Cost: result.summary.p90Cost,
    minCost: result.summary.minCost,
    maxCost: result.summary.maxCost,
  };
}

/**
 * Builds snapshot fields from Monte Carlo result + risks for backward compatibility.
 * Closed risks are excluded. Uses same effective inputs as runMonteCarloSimulation.
 * Caller supplies id and timestampIso to form a full SimulationSnapshot.
 */
export function buildSimulationSnapshotFromResult(
  result: SimulationResult,
  risks: Risk[],
  iterations: number
): Omit<SimulationSnapshot, "id" | "timestampIso"> {
  const riskSnapshots: SimulationRiskSnapshot[] = [];
  for (const risk of risks) {
    const inp = getEffectiveRiskInputs(risk);
    if (!inp) continue;
    const expectedCost = inp.probability * inp.costML;
    const expectedDays = inp.probability * inp.timeML;
    riskSnapshots.push({
      id: risk.id,
      title: risk.title,
      category: risk.category,
      status: risk.status,
      expectedCost,
      expectedDays,
      simMeanCost: expectedCost,
      simMeanDays: expectedDays,
    });
  }
  return {
    iterations,
    p20Cost: result.summary.p20Cost,
    p50Cost: result.summary.p50Cost,
    p80Cost: result.summary.p80Cost,
    p90Cost: result.summary.p90Cost,
    totalExpectedCost: result.summary.meanCost,
    totalExpectedDays: result.summary.meanTime,
    risks: riskSnapshots,
  };
}
