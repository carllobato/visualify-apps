/**
 * Per-risk simulation input audit for Run Data — uses {@link getEffectiveRiskInputs} as the engine SSOT.
 * Snapshot `inputs_used` (when present) supplies values as recorded at persist time; flags use current `Risk` + engine.
 */

import type { Risk } from "@/domain/risk/risk.schema";
import { getEffectiveRiskInputs } from "@/domain/simulation/monteCarlo";
import { probability01FromScale } from "@/domain/risk/risk.logic";
import {
  appliesToExcludesCost,
  appliesToExcludesTime,
  riskLifecycleBucketForRegisterSnapshot,
  isRiskStatusExcludedFromSimulation,
} from "@/domain/risk/riskFieldSemantics";
import type { SimulationSnapshotPayload } from "@/lib/db/snapshots";

const PROB_EPS = 1e-9;

function isPresentNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export type SimulationInputAuditRow = {
  riskId: string;
  title: string;
  lifecycleLabel: string;
  mitigationProfileStatusRaw: string;
  sourceUsed: "pre" | "post";
  probabilityUsed: number;
  costMlUsed: number;
  timeMlUsed: number;
  appliesToDisplay: string;
  included: boolean;
  reasonIfExcluded: string | null;
  mitigationCost: number | null;
  flags: {
    mismatchStatusVsSource: boolean;
    postDataIncomplete: boolean;
    probabilityMismatch: boolean;
  };
  potentialReductionCost: number | null;
  potentialReductionTime: number | null;
  costEfficiency: number | null;
  timeEfficiency: number | null;
  /** True when values came from persisted snapshot payload for this run. */
  valuesFromSnapshot: boolean;
};

function lifecycleLabel(bucket: ReturnType<typeof riskLifecycleBucketForRegisterSnapshot>): string {
  if (bucket === null) return "—";
  const map: Record<string, string> = {
    draft: "Draft",
    open: "Open",
    monitoring: "Monitoring",
    mitigating: "Mitigating",
    closed: "Closed",
    archived: "Archived",
  };
  return map[bucket] ?? String(bucket);
}

function computeMismatchStatusVsSource(
  bucket: ReturnType<typeof riskLifecycleBucketForRegisterSnapshot>,
  sourceUsed: "pre" | "post"
): boolean {
  if (bucket === null) return false;
  if (bucket === "open" || bucket === "monitoring") return sourceUsed === "post";
  if (bucket === "mitigating") return sourceUsed === "pre";
  return false;
}

function monitoringPotentialReductionCost(risk: Risk): number | null {
  const bucket = riskLifecycleBucketForRegisterSnapshot(risk);
  if (bucket !== "monitoring") return null;

  const probPre = probability01FromScale(risk.inherentRating.probability);
  const probPost = probability01FromScale(risk.residualRating.probability);
  if (appliesToExcludesCost(risk.appliesTo)) return 0;

  const costPreRaw = typeof risk.preMitigationCostML === "number" && Number.isFinite(risk.preMitigationCostML) ? risk.preMitigationCostML : 0;
  const costPostRaw = isPresentNum(risk.postMitigationCostML) ? risk.postMitigationCostML : null;
  if (costPostRaw == null) return null;
  const costPre = costPreRaw;
  const costPost = costPostRaw;

  const preExpected = probPre * costPre;
  const postExpected = probPost * costPost;
  return preExpected - postExpected;
}

function monitoringPotentialReductionTime(risk: Risk): number | null {
  const bucket = riskLifecycleBucketForRegisterSnapshot(risk);
  if (bucket !== "monitoring") return null;

  const probPre = probability01FromScale(risk.inherentRating.probability);
  const probPost = probability01FromScale(risk.residualRating.probability);
  if (appliesToExcludesTime(risk.appliesTo)) return 0;

  const timePreRaw = typeof risk.preMitigationTimeML === "number" && Number.isFinite(risk.preMitigationTimeML) ? risk.preMitigationTimeML : 0;
  const timePostRaw = isPresentNum(risk.postMitigationTimeML) ? risk.postMitigationTimeML : null;
  if (timePostRaw == null) return null;
  const preExpected = probPre * timePreRaw;
  const postExpected = probPost * timePostRaw;
  return preExpected - postExpected;
}

function costEfficiency(reduction: number | null, mitigationCost: number | null | undefined): number | null {
  if (reduction == null || !Number.isFinite(reduction)) return null;
  if (mitigationCost == null || !Number.isFinite(mitigationCost) || mitigationCost <= 0) return null;
  return reduction / mitigationCost;
}

function buildRowForRisk(
  risk: Risk | undefined,
  snapshotLine: SimulationSnapshotPayload["inputs_used"][number] | undefined
): SimulationInputAuditRow | null {
  if (!risk) {
    if (!snapshotLine) return null;
    return {
      riskId: snapshotLine.risk_id,
      title: snapshotLine.title ?? snapshotLine.risk_id,
      lifecycleLabel: "—",
      mitigationProfileStatusRaw: "—",
      sourceUsed: snapshotLine.source_used,
      probabilityUsed: snapshotLine.probability,
      costMlUsed: snapshotLine.cost_ml,
      timeMlUsed: snapshotLine.time_ml,
      appliesToDisplay: "—",
      included: false,
      reasonIfExcluded: "Risk not found in current register",
      mitigationCost: null,
      flags: {
        mismatchStatusVsSource: false,
        postDataIncomplete: false,
        probabilityMismatch: false,
      },
      potentialReductionCost: null,
      potentialReductionTime: null,
      costEfficiency: null,
      timeEfficiency: null,
      valuesFromSnapshot: true,
    };
  }

  const inp = getEffectiveRiskInputs(risk);
  const excluded = isRiskStatusExcludedFromSimulation(risk.status);
  const included = inp != null && !excluded;

  const valuesFromSnapshot = Boolean(snapshotLine);
  const sourceUsed: "pre" | "post" = snapshotLine?.source_used ?? inp?.sourceUsed ?? "pre";
  const probabilityUsed = snapshotLine?.probability ?? inp?.probability ?? 0;
  const costMlUsed = snapshotLine?.cost_ml ?? inp?.costML ?? 0;
  const timeMlUsed = snapshotLine?.time_ml ?? inp?.timeML ?? 0;

  const bucket = riskLifecycleBucketForRegisterSnapshot(risk);
  const lifecycle = lifecycleLabel(bucket);
  const mp = risk.mitigationProfile?.status;
  const mitigationProfileStatusRaw = mp ?? "—";

  const monitoringNeedsPostCost = bucket === "monitoring" && !appliesToExcludesCost(risk.appliesTo);
  const monitoringNeedsPostTime = bucket === "monitoring" && !appliesToExcludesTime(risk.appliesTo);
  const activeNeedsBothPost = risk.mitigationProfile?.status === "active";
  const postDataIncomplete =
    (activeNeedsBothPost &&
      !(isPresentNum(risk.postMitigationCostML) && isPresentNum(risk.postMitigationTimeML))) ||
    (monitoringNeedsPostCost && !isPresentNum(risk.postMitigationCostML)) ||
    (monitoringNeedsPostTime && !isPresentNum(risk.postMitigationTimeML));

  const mismatchStatusVsSource = computeMismatchStatusVsSource(bucket, sourceUsed);

  const explicit =
    typeof risk.probability === "number" && Number.isFinite(risk.probability) && risk.probability >= 0 && risk.probability <= 1
      ? risk.probability
      : null;
  const engineProb = inp?.probability;
  const probabilityMismatch =
    explicit != null && engineProb != null && Math.abs(explicit - engineProb) > PROB_EPS;

  const potentialReductionCost = monitoringPotentialReductionCost(risk);
  const potentialReductionTime = monitoringPotentialReductionTime(risk);
  const mc = risk.mitigationCost;
  const mitigationCost = typeof mc === "number" && Number.isFinite(mc) && mc >= 0 ? mc : null;

  const reasonIfExcluded: string | null = !included
    ? excluded
      ? "Closed or archived (excluded from simulation)"
      : inp == null
        ? "Excluded from simulation"
        : null
    : null;

  return {
    riskId: risk.id,
    title: risk.title ?? risk.id,
    lifecycleLabel: lifecycle,
    mitigationProfileStatusRaw,
    sourceUsed,
    probabilityUsed,
    costMlUsed,
    timeMlUsed,
    appliesToDisplay: risk.appliesTo?.trim() || "—",
    included,
    reasonIfExcluded,
    mitigationCost,
    flags: {
      mismatchStatusVsSource,
      postDataIncomplete,
      probabilityMismatch,
    },
    potentialReductionCost,
    potentialReductionTime,
    costEfficiency: costEfficiency(potentialReductionCost, mitigationCost),
    timeEfficiency: costEfficiency(potentialReductionTime, mitigationCost),
    valuesFromSnapshot,
  };
}

export type SimulationInputAuditSummary = {
  total: number;
  countPre: number;
  countPost: number;
  countMismatched: number;
  countIncompleteMitigation: number;
};

export function summarizeSimulationInputAudit(rows: SimulationInputAuditRow[]): SimulationInputAuditSummary {
  return {
    total: rows.length,
    countPre: rows.filter((r) => r.sourceUsed === "pre").length,
    countPost: rows.filter((r) => r.sourceUsed === "post").length,
    countMismatched: rows.filter((r) => r.flags.mismatchStatusVsSource).length,
    countIncompleteMitigation: rows.filter((r) => r.flags.postDataIncomplete).length,
  };
}

/**
 * @param inputsUsed - When non-empty, roster and per-risk values match the last persisted run; otherwise derive from live risks via getEffectiveRiskInputs.
 */
export function buildSimulationInputAuditRows(
  risks: Risk[],
  inputsUsed: SimulationSnapshotPayload["inputs_used"] | null | undefined
): SimulationInputAuditRow[] {
  const riskById = new Map(risks.map((r) => [r.id, r]));

  if (inputsUsed && inputsUsed.length > 0) {
    return inputsUsed
      .map((line) => buildRowForRisk(riskById.get(line.risk_id), line))
      .filter((row): row is SimulationInputAuditRow => row != null);
  }

  const rows: SimulationInputAuditRow[] = [];
  for (const risk of risks) {
    const inp = getEffectiveRiskInputs(risk);
    if (inp == null && !isRiskStatusExcludedFromSimulation(risk.status)) continue;
    const row = buildRowForRisk(risk, undefined);
    if (row) rows.push(row);
  }
  return rows;
}
