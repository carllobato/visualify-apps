"use client";

import { useMemo, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";
import { useRiskRegister } from "@/store/risk-register.store";
import { listRisks } from "@/lib/db/risks";
import { portfolioMomentumSummary } from "@/domain/risk/risk.logic";
import {
  clearProjectSnapshots,
  getLatestSnapshot as getLatestDbSnapshot,
  getLatestLockedSnapshot as getLatestLockedDbSnapshot,
  formatReportMonthLabel,
  type SimulationSnapshotRow,
  type SimulationSnapshotRowDb,
} from "@/lib/db/snapshots";
import { MitigationOptimisationPanel } from "@/components/outputs/MitigationOptimisationPanel";
import { computePortfolioExposure } from "@/engine/forwardExposure";
import type { PortfolioExposure } from "@/engine/forwardExposure";
import { formatDurationDays } from "@/lib/formatDuration";
import { percentileFromSorted } from "@/lib/simulationDisplayUtils";
import {
  computeMean,
  computeVariance,
  computeStdDev,
  computeSkewness,
  computeKurtosis,
  computeCoefficientOfVariation,
  computeMin,
  computeMax,
} from "@/engine/statistics";
import { computeSimulationAssumptionCounts } from "@/lib/simulationAssumptions";
import { SIMULATION_ENGINE_VERSION } from "@/domain/simulation/monteCarlo";
import {
  fetchPublicProfile,
  formatProfileAuditLabel,
  formatTriggeredByLabel,
} from "@/lib/profiles/profileDb";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { loadProjectContext, riskAppetiteToPercent } from "@/lib/projectContext";
import {
  appliesToExcludesCost,
  appliesToExcludesTime,
  isRiskStatusExcludedFromSimulation,
  riskLifecycleBucketForRegisterSnapshot,
} from "@/domain/risk/riskFieldSemantics";
import {
  buildSimulationInputAuditRows,
  summarizeSimulationInputAudit,
} from "@/lib/runDataSimulationInputAudit";

type ForwardExposurePayload = {
  horizonMonths: number;
  result: PortfolioExposure;
};

function formatCost(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type MonitoringRecommendationView = "cost" | "schedule";

/** Simulation Input Audit table: show rows with a given flag, no flags, or all. */
type SimulationInputAuditFlagFilter =
  | "all"
  | "mismatchStatusVsSource"
  | "postDataIncomplete"
  | "probabilityMismatch"
  | "none";

type MonitoringRecommendation = {
  riskId: string;
  title: string;
  lifecycleLabel: string;
  potentialReduction: number;
  mitigationCost: number | null;
  efficiency: number | null;
  confidence: "High" | "Medium" | "Low";
  recommendation: string;
};

function interpolateFromAnchors(
  p20: number | null | undefined,
  p50: number | null | undefined,
  p80: number | null | undefined,
  p90: number | null | undefined,
  targetPercent: number
): number | null {
  const values = [p20, p50, p80, p90];
  if (!values.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  const a20 = p20 as number;
  const a50 = p50 as number;
  const a80 = p80 as number;
  const a90 = p90 as number;
  const t = Math.max(0, Math.min(100, targetPercent));
  if (t <= 20) return a20;
  if (t <= 50) return a20 + ((a50 - a20) * (t - 20)) / 30;
  if (t <= 80) return a50 + ((a80 - a50) * (t - 50)) / 30;
  if (t <= 90) return a80 + ((a90 - a80) * (t - 80)) / 10;
  return a90;
}

/** Format ISO timestamp for Run Metadata: "15 Mar 2026 — 09:08:37". */
function formatRunTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const datePart = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return `${datePart} — ${timePart}`;
  } catch {
    return iso;
  }
}

export type RunDataPageProps = {
  projectId?: string | null;
  /** When Run Data is rendered under a project route, pass project name for metadata. */
  projectName?: string | null;
};

/**
 * Run Data — diagnostic run output page (simulation run report).
 *
 * Narrative order (do not reorder without reason):
 * 1. BASELINE — What inputs were run? (Run Metadata, Risk Register Snapshot)
 * 2. SIMULATION — What did the simulation produce? (Cost/Schedule Distribution)
 * 3. SIMULATION INTEGRITY — Monte Carlo distribution diagnostics (sample size, skew, kurtosis)
 * 4. SIMULATION INPUT AUDIT — Per-risk engine inputs (snapshot inputs_used or live getEffectiveRiskInputs)
 * 5. SIMULATION ASSUMPTIONS — Input quality checks for Monte Carlo readiness
 * 6. CONSISTENCY CHECKS — Cross-section reconciliation checks
 * 7. ANALYSIS — What risks drive the results? (Cost Drivers, Schedule Drivers)
 * 8. EXPOSURE — What exposure does the project carry? (Baseline Exposure)
 * 9. FORWARD LOOKING — How might exposure evolve? (Forecasting)
 * 10. DECISION SUPPORT — What effect do mitigations have? (Mitigation Results, Mitigation Leverage)
 *
 * Every section supports validation of the data model and calculations; no decorative charts.
 */
export default function RunDataPage({ projectId, projectName }: RunDataPageProps = {}) {
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  const { risks, simulation, runSimulation, clearSimulationHistory, hasDraftRisks, invalidRunnableCount, riskForecastsById, forwardPressure, setRisks, hydrateSimulationFromDbSnapshot } = useRiskRegister();
  const [runBlockedInvalidCount, setRunBlockedInvalidCount] = useState<number | null>(null);
  const [snapshotPersistWarning, setSnapshotPersistWarning] = useState<string | null>(null);
  const [lockedRunLoadWarning, setLockedRunLoadWarning] = useState<string | null>(null);
  const [loadingLockedRun, setLoadingLockedRun] = useState(false);
  const [lockedRunPinned, setLockedRunPinned] = useState(false);
  const [triggeredBy, setTriggeredBy] = useState<string | null>(null);
  const [reportingSnapshotRow, setReportingSnapshotRow] = useState<SimulationSnapshotRow>(null);
  const [reportingLockedByLabel, setReportingLockedByLabel] = useState<string | null>(null);
  const [sortAuditByPotentialReduction, setSortAuditByPotentialReduction] = useState(false);
  const [simulationInputAuditFlagFilter, setSimulationInputAuditFlagFilter] =
    useState<SimulationInputAuditFlagFilter>("all");
  const [monitoringRecommendationView, setMonitoringRecommendationView] = useState<MonitoringRecommendationView>("cost");

  useEffect(() => {
    const pid = projectId?.trim();
    if (!pid) {
      console.error("[run-data] listRisks skipped: projectId is required for risk access");
      return;
    }
    listRisks(pid)
      .then((loaded) => setRisks(loaded))
      .catch((err) => console.error("[run-data] load risks", err));
    // Intentionally depend only on projectId; setRisks identity changes when store state updates and would cause a re-fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
  useEffect(() => {
    if (invalidRunnableCount === 0) setRunBlockedInvalidCount(null);
  }, [invalidRunnableCount]);

  const meetingMedianTtc = null;
  const { current, neutral: neutralMc } = simulation;
  const isCurrentRunPersisted = current?.id && !current.id.startsWith("sim_");
  useEffect(() => {
    if (lockedRunPinned) return;
    if (!projectId || !isCurrentRunPersisted || !current?.id) return;
    getLatestDbSnapshot(projectId)
      .then((row) => {
        if (row?.id === current.id) setReportingSnapshotRow(row);
        else setReportingSnapshotRow(null);
      })
      .catch(() => setReportingSnapshotRow(null));
  }, [projectId, current?.id, isCurrentRunPersisted, lockedRunPinned]);
  const reportingDbRow = reportingSnapshotRow as SimulationSnapshotRowDb | null;

  useEffect(() => {
    const uid = reportingDbRow?.locked_by?.trim();
    if (!uid) {
      setReportingLockedByLabel(null);
      return;
    }
    let cancelled = false;
    const supabase = supabaseBrowserClient();
    fetchPublicProfile(supabase, uid)
      .then((p) => {
        if (!cancelled) setReportingLockedByLabel(formatProfileAuditLabel(p, uid));
      })
      .catch(() => {
        if (!cancelled) setReportingLockedByLabel(uid);
      });
    return () => {
      cancelled = true;
    };
  }, [reportingDbRow?.locked_by]);

  const momentumSummary = useMemo(() => portfolioMomentumSummary(risks), [risks]);

  /** Neutral baseline snapshot: always used for Project Cost block. */
  const snapshotNeutral = current;
  const baselineSummaryNeutral = snapshotNeutral
    ? {
        p20Cost: (snapshotNeutral as { p20Cost?: number }).p20Cost ?? snapshotNeutral.p50Cost ?? 0,
        p50Cost: snapshotNeutral.p50Cost,
        p80Cost: snapshotNeutral.p80Cost,
        p90Cost: snapshotNeutral.p90Cost,
        totalExpectedCost: snapshotNeutral.totalExpectedCost,
        totalExpectedDays: snapshotNeutral.totalExpectedDays,
      }
    : null;

  /** Pressure label Low / Elevated / High */
  const meetingPressureLabel =
    forwardPressure.pressureClass === "Low"
      ? "Low"
      : forwardPressure.pressureClass === "Moderate"
        ? "Elevated"
        : "High";

  /** Early warning count */
  const earlyWarningCount = useMemo(() => {
    if (!current?.risks?.length) return 0;
    return current.risks.filter((r) => riskForecastsById[r.id]?.earlyWarning === true).length;
  }, [current, riskForecastsById]);

  /** Forward exposure: neutral baseline only. */
  const forwardExposure: ForwardExposurePayload = useMemo(() => {
    const horizonMonths = 12;
    const topN = Math.min(500, risks.length);
    const result = computePortfolioExposure(risks, "neutral", horizonMonths, {
      topN,
      includeDebug: false,
    });
    return { horizonMonths, result };
  }, [risks]);

  const targetPercent = useMemo(() => {
    const ctx = loadProjectContext(projectId);
    return riskAppetiteToPercent(ctx?.riskAppetite);
  }, [projectId]);
  const targetScheduleDays = useMemo(() => {
    const s = neutralMc?.summary;
    return interpolateFromAnchors(s?.p20Time, s?.p50Time, s?.p80Time, s?.p90Time, targetPercent);
  }, [neutralMc?.summary, targetPercent]);

  /** Neutral baseline result. */
  const selectedResult = forwardExposure.result;

  /** Cost drivers: neutral baseline only, and only risks in the run with cost impact (exclude time-only). */
  const costDrivers = useMemo(() => {
    const runRiskIds = new Set((current?.risks ?? []).map((r) => r.id));
    const allDrivers = forwardExposure.result?.topDrivers ?? [];
    let list = runRiskIds.size > 0 ? allDrivers.filter((d) => runRiskIds.has(d.riskId)) : allDrivers;
    list = list.filter((d) => {
      const risk = risks.find((r) => r.id === d.riskId);
      if (!risk) return true;
      if (appliesToExcludesCost(risk.appliesTo)) return false;
      return typeof risk.preMitigationCostML === "number" && risk.preMitigationCostML > 0;
    });
    const total = forwardExposure.result?.total ?? 0;
    return list.map((d, i) => {
      const risk = risks.find((r) => r.id === d.riskId);
      const contributionPct =
        total > 0 && Number.isFinite(d.total) ? (d.total / total) * 100 : null;
      let preMitigation: number;
      if (risk) {
        const prob01 =
          typeof risk.probability === "number" && risk.probability >= 0 && risk.probability <= 1
            ? risk.probability
            : risk.inherentRating.probability / 5;
        const impact = risk.preMitigationCostML ?? 0;
        preMitigation = impact * prob01;
        if (!Number.isFinite(preMitigation) || preMitigation < 0) preMitigation = d.total;
      } else {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[Run Data] Cost driver: risk not found for id:", d.riskId, "- using post as pre.");
        }
        preMitigation = d.total;
      }
      const delta = preMitigation - d.total;
      return {
        rank: i + 1,
        riskId: d.riskId,
        riskName: risk?.title ?? d.riskId,
        impactType: "Cost" as const,
        category: d.category ?? risk?.category ?? "—",
        total: d.total,
        contributionPct,
        preMitigation,
        postMitigation: d.total,
        delta,
      };
    });
  }, [current?.risks, forwardExposure.result, risks]);

  /** Schedule drivers: from snapshot risks sorted by schedule impact (simMeanDays/expectedDays), all risks. */
  const scheduleDrivers = useMemo(() => {
    const list = current?.risks ?? [];
    const sorted = [...list]
      .filter((r) => (r.simMeanDays ?? r.expectedDays ?? 0) > 0)
      .sort((a, b) => (b.simMeanDays ?? b.expectedDays ?? 0) - (a.simMeanDays ?? a.expectedDays ?? 0));
    const sumDaysAll = list.reduce((s, r) => s + (r.simMeanDays ?? r.expectedDays ?? 0), 0);
    return sorted.map((r, i) => {
      const days = r.simMeanDays ?? r.expectedDays ?? 0;
      const risk = risks.find((x) => x.id === r.id);
      const contributionPct = sumDaysAll > 0 ? (days / sumDaysAll) * 100 : null;
      let preMitigation: number;
      if (risk) {
        const prob01 =
          typeof risk.probability === "number" && risk.probability >= 0 && risk.probability <= 1
            ? risk.probability
            : risk.inherentRating.probability / 5;
        const impactDays = risk.preMitigationTimeML ?? risk.postMitigationTimeML ?? 0;
        preMitigation = impactDays * prob01;
        if (!Number.isFinite(preMitigation) || preMitigation < 0) preMitigation = days;
      } else {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[Run Data] Schedule driver: risk not found for id:", r.id, "- using post as pre.");
        }
        preMitigation = days;
      }
      const delta = preMitigation - days;
      return {
        rank: i + 1,
        riskId: r.id,
        riskName: risk?.title ?? r.title ?? r.id,
        impactType: "Schedule" as const,
        category: risk?.category ?? r.category ?? "—",
        totalDays: days,
        contributionPct,
        preMitigation,
        postMitigation: days,
        delta,
      };
    });
  }, [current?.risks, risks]);

  /** Percentiles P0–P100 for distribution display. From samples when available, else from summary (only some available). */
  const PERCENTILE_POINTS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
  const distributionPercentiles = useMemo(() => {
    const costSamples = neutralMc?.costSamples ?? [];
    const timeSamples = neutralMc?.timeSamples ?? [];
    const summary = neutralMc?.summary;
    const costSorted =
      costSamples.length > 0 ? [...costSamples].sort((a, b) => a - b) : null;
    const timeSorted =
      timeSamples.length > 0 ? [...timeSamples].sort((a, b) => a - b) : null;

    const cost: Record<number, number | null> = {};
    const schedule: Record<number, number | null> = {};

    for (const p of PERCENTILE_POINTS) {
      if (costSorted && costSorted.length > 0) {
        cost[p] = percentileFromSorted(costSorted, p);
      } else if (summary) {
        if (p === 0) cost[p] = summary.minCost ?? null;
        else if (p === 20) cost[p] = summary.p20Cost ?? null;
        else if (p === 50) cost[p] = summary.p50Cost ?? null;
        else if (p === 80) cost[p] = summary.p80Cost ?? null;
        else if (p === 90) cost[p] = summary.p90Cost ?? null;
        else if (p === 100) cost[p] = summary.maxCost ?? null;
        else cost[p] = null;
      } else {
        cost[p] = baselineSummaryNeutral
          ? (p === 20
            ? baselineSummaryNeutral.p20Cost
            : p === 50
              ? baselineSummaryNeutral.p50Cost
              : p === 80
                ? baselineSummaryNeutral.p80Cost
                : p === 90
                  ? baselineSummaryNeutral.p90Cost
                  : null)
          : null;
      }
    }

    for (const p of PERCENTILE_POINTS) {
      if (timeSorted && timeSorted.length > 0) {
        schedule[p] = percentileFromSorted(timeSorted, p);
      } else if (summary) {
        if (p === 0) schedule[p] = summary.minTime ?? null;
        else if (p === 20) schedule[p] = summary.p20Time ?? null;
        else if (p === 50) schedule[p] = summary.p50Time ?? null;
        else if (p === 80) schedule[p] = summary.p80Time ?? null;
        else if (p === 90) schedule[p] = summary.p90Time ?? null;
        else if (p === 100) schedule[p] = summary.maxTime ?? null;
        else schedule[p] = null;
      } else {
        schedule[p] = null;
      }
    }

    const stdDevFromSamples = (arr: number[]): number | null => {
      if (arr.length === 0) return null;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
      return Math.sqrt(variance);
    };

    const costMean = summary?.meanCost ?? baselineSummaryNeutral?.totalExpectedCost ?? null;
    const timeMean = summary?.meanTime ?? baselineSummaryNeutral?.totalExpectedDays ?? null;
    const costStdDev = costSamples.length > 0 ? stdDevFromSamples(costSamples) : null;
    const timeStdDev = timeSamples.length > 0 ? stdDevFromSamples(timeSamples) : null;
    const costP50 = cost[50];
    const costP80 = cost[80];
    const costP10 = cost[10];
    const costP90 = cost[90];
    const costP50P80Gap =
      costP50 != null && costP80 != null && Number.isFinite(costP50) && Number.isFinite(costP80)
        ? costP80 - costP50
        : null;
    const costP10P90Range =
      costP10 != null && costP90 != null && Number.isFinite(costP10) && Number.isFinite(costP90)
        ? costP90 - costP10
        : null;
    const timeP50 = schedule[50];
    const timeP80 = schedule[80];
    const timeP10 = schedule[10];
    const timeP90 = schedule[90];
    const timeP50P80Gap =
      timeP50 != null && timeP80 != null && Number.isFinite(timeP50) && Number.isFinite(timeP80)
        ? timeP80 - timeP50
        : null;
    const timeP10P90Range =
      timeP10 != null && timeP90 != null && Number.isFinite(timeP10) && Number.isFinite(timeP90)
        ? timeP90 - timeP10
        : null;
    const costP90P50Gap =
      costP50 != null && costP90 != null && Number.isFinite(costP50) && Number.isFinite(costP90)
        ? costP90 - costP50
        : null;
    const timeP90P50Gap =
      timeP50 != null && timeP90 != null && Number.isFinite(timeP50) && Number.isFinite(timeP90)
        ? timeP90 - timeP50
        : null;

    return {
      cost,
      schedule,
      meta: {
        baselineName: "Baseline – Neutral",
        iterationCount: current?.iterations ?? neutralMc?.iterationCount ?? null,
        costSampleSize: costSamples.length > 0 ? costSamples.length : null,
        timeSampleSize: timeSamples.length > 0 ? timeSamples.length : null,
      },
      costStats: {
        mean: costMean,
        stdDev: costStdDev,
        p50P80Gap: costP50P80Gap,
        p90P50Gap: costP90P50Gap,
        p10P90Range: costP10P90Range,
      },
      scheduleStats: {
        mean: timeMean,
        stdDev: timeStdDev,
        p50P80Gap: timeP50P80Gap,
        p90P50Gap: timeP90P50Gap,
        p10P90Range: timeP10P90Range,
      },
    };
  }, [neutralMc, baselineSummaryNeutral, current?.iterations]);

  /** Derived run status: Complete when run has iterations and key cost output; else Incomplete. */
  const runStatus = useMemo((): "Complete" | "Incomplete" => {
    if (!current) return "Incomplete";
    const hasIterations = (current.iterations ?? 0) > 0;
    const hasKeyCostOutput =
      baselineSummaryNeutral?.p50Cost != null && Number.isFinite(baselineSummaryNeutral.p50Cost);
    return hasIterations && hasKeyCostOutput ? "Complete" : "Incomplete";
  }, [current, baselineSummaryNeutral?.p50Cost]);

  /** Run Data Completeness: all of cost percentiles, schedule percentiles, risk drivers, chart data. */
  const runDataCompleteness = useMemo((): "Complete" | "Partial" => {
    const hasCostPercentiles =
      baselineSummaryNeutral != null &&
      [baselineSummaryNeutral.p20Cost, baselineSummaryNeutral.p50Cost, baselineSummaryNeutral.p80Cost, baselineSummaryNeutral.p90Cost].every(
        (v) => v != null && Number.isFinite(v)
      );
    const hasSchedulePercentiles =
      neutralMc?.summary != null &&
      [neutralMc.summary.p20Time, neutralMc.summary.p50Time, neutralMc.summary.p80Time, neutralMc.summary.p90Time].every(
        (v) => v != null && Number.isFinite(v)
      );
    const hasRiskDrivers = (current?.risks?.length ?? 0) > 0;
    const hasChartData =
      (neutralMc?.costSamples?.length ?? 0) > 0 && (neutralMc?.timeSamples?.length ?? 0) > 0;
    return hasCostPercentiles && hasSchedulePercentiles && hasRiskDrivers && hasChartData
      ? "Complete"
      : "Partial";
  }, [baselineSummaryNeutral, neutralMc, current?.risks?.length]);

  /** Risk Register Snapshot: total/status from full register. "Risks in run" and mix use live register rows excluded from MC the same way as the engine (closed/archived), not persisted snapshot length (which can lag after register edits). */
  const snapshotRiskStats = useMemo(() => {
    const statusCounts = {
      draft: 0,
      open: 0,
      monitoring: 0,
      mitigating: 0,
      closed: 0,
      archived: 0,
    };
    // Status counts from full risk register (mitigated synonym + active mitigationProfile; see riskFieldSemantics)
    for (const r of risks) {
      const bucket = riskLifecycleBucketForRegisterSnapshot(r);
      if (bucket) statusCounts[bucket] += 1;
    }
    const total = risks.length;
    const risksInRun = risks.filter((r) => !isRiskStatusExcludedFromSimulation(r.status));
    const totalInRun = risksInRun.length;
    const hasPreCost = (r: (typeof risks)[number]) =>
      !appliesToExcludesCost(r.appliesTo) &&
      typeof r.preMitigationCostML === "number" &&
      r.preMitigationCostML > 0;
    const hasPreTime = (r: (typeof risks)[number]) =>
      !appliesToExcludesTime(r.appliesTo) &&
      typeof r.preMitigationTimeML === "number" &&
      r.preMitigationTimeML > 0;
    const hasPostCost = (r: (typeof risks)[number]) =>
      !appliesToExcludesCost(r.appliesTo) &&
      ((typeof r.postMitigationCostML === "number" && r.postMitigationCostML > 0) || hasPreCost(r));
    const hasPostTime = (r: (typeof risks)[number]) =>
      !appliesToExcludesTime(r.appliesTo) &&
      ((typeof r.postMitigationTimeML === "number" && r.postMitigationTimeML > 0) || hasPreTime(r));
    const preBoth = risksInRun.filter((r) => hasPreCost(r) && hasPreTime(r)).length;
    const preCostOnly = risksInRun.filter((r) => hasPreCost(r) && !hasPreTime(r)).length;
    const preTimeOnly = risksInRun.filter((r) => !hasPreCost(r) && hasPreTime(r)).length;
    const postBoth = risksInRun.filter((r) => hasPostCost(r) && hasPostTime(r)).length;
    const postCostOnly = risksInRun.filter((r) => hasPostCost(r) && !hasPostTime(r)).length;
    const postTimeOnly = risksInRun.filter((r) => !hasPostCost(r) && hasPostTime(r)).length;
    return {
      total,
      totalInRun,
      statusCounts,
      riskMix: {
        pre: { both: preBoth, costOnly: preCostOnly, timeOnly: preTimeOnly },
        post: { both: postBoth, costOnly: postCostOnly, timeOnly: postTimeOnly },
      },
    };
  }, [risks]);

  /** Simulation Integrity: distribution diagnostics from neutral MC samples. Population formulas; used only when samples are stored. */
  const simulationIntegrity = useMemo(() => {
    const costSamples = neutralMc?.costSamples ?? [];
    const timeSamples = neutralMc?.timeSamples ?? [];

    const sampleSizeInterpretation = (n: number): string => {
      if (n >= 5000) return "Good";
      if (n >= 1000) return "Acceptable";
      return "Low confidence";
    };
    const skewnessInterpretation = (skew: number | null): string => {
      if (skew == null || !Number.isFinite(skew)) return "—";
      const abs = Math.abs(skew);
      if (abs < 1) return "Normal";
      if (abs <= 2) return "Moderately skewed";
      return "Highly skewed";
    };
    const kurtosisInterpretation = (kurt: number | null): string => {
      if (kurt == null || !Number.isFinite(kurt)) return "—";
      if (kurt >= 2.5 && kurt <= 3.5) return "Normal";
      if (kurt > 5) return "Heavy tails";
      if (kurt > 3.5 && kurt <= 5) return "Slightly heavy";
      return "Light tail";
    };
    const cvInterpretation = (cv: number | null): string => {
      if (cv == null || !Number.isFinite(cv) || cv < 0) return "—";
      if (cv < 0.25) return "Low spread";
      if (cv <= 0.75) return "Moderate spread";
      return "High spread";
    };

    const cost =
      costSamples.length > 0
        ? {
            n: costSamples.length,
            mean: computeMean(costSamples),
            variance: computeVariance(costSamples),
            stdDev: computeStdDev(costSamples),
            cv: computeCoefficientOfVariation(costSamples),
            skewness: computeSkewness(costSamples),
            kurtosis: computeKurtosis(costSamples),
            min: computeMin(costSamples),
            max: computeMax(costSamples),
            sampleSizeInterpretation: sampleSizeInterpretation(costSamples.length),
            cvInterpretation: cvInterpretation(computeCoefficientOfVariation(costSamples)),
            skewnessInterpretation: skewnessInterpretation(computeSkewness(costSamples)),
            kurtosisInterpretation: kurtosisInterpretation(computeKurtosis(costSamples)),
          }
        : null;

    const schedule =
      timeSamples.length > 0
        ? {
            n: timeSamples.length,
            mean: computeMean(timeSamples),
            variance: computeVariance(timeSamples),
            stdDev: computeStdDev(timeSamples),
            cv: computeCoefficientOfVariation(timeSamples),
            skewness: computeSkewness(timeSamples),
            kurtosis: computeKurtosis(timeSamples),
            min: computeMin(timeSamples),
            max: computeMax(timeSamples),
            sampleSizeInterpretation: sampleSizeInterpretation(timeSamples.length),
            cvInterpretation: cvInterpretation(computeCoefficientOfVariation(timeSamples)),
            skewnessInterpretation: skewnessInterpretation(computeSkewness(timeSamples)),
            kurtosisInterpretation: kurtosisInterpretation(computeKurtosis(timeSamples)),
          }
        : null;

    return { cost, schedule };
  }, [neutralMc?.costSamples, neutralMc?.timeSamples]);

  /** Simulation Assumptions: input quality counts for risks in the run (live risk fields). */
  const simulationAssumptionCounts = useMemo(() => {
    const risksInRun = risks.filter((r) => !isRiskStatusExcludedFromSimulation(r.status));
    return computeSimulationAssumptionCounts(risksInRun);
  }, [risks]);

  /** Per-risk MC input audit: persisted `inputs_used` when this run matches DB row; else live `getEffectiveRiskInputs`. */
  const simulationInputAuditRowsRaw = useMemo(() => {
    const payload =
      current &&
      reportingDbRow?.id &&
      current.id &&
      reportingDbRow.id === current.id
        ? reportingDbRow.payload
        : null;
    const inputsUsed = payload?.inputs_used?.length ? payload.inputs_used : null;
    return buildSimulationInputAuditRows(risks, inputsUsed);
  }, [risks, reportingDbRow?.id, reportingDbRow?.payload, current?.id]);

  const simulationInputAuditSummary = useMemo(
    () => summarizeSimulationInputAudit(simulationInputAuditRowsRaw),
    [simulationInputAuditRowsRaw]
  );

  const monitoringRecommendationDataByView = useMemo(() => {
    const buildForView = (view: MonitoringRecommendationView) => {
      const eligibleRows = simulationInputAuditRowsRaw.filter((row) => {
        const reduction = view === "cost" ? row.potentialReductionCost : row.potentialReductionTime;
        const hasPositiveReduction = reduction != null && Number.isFinite(reduction) && reduction > 0;
        return (
          row.lifecycleLabel === "Monitoring" &&
          row.included &&
          row.sourceUsed === "pre" &&
          !row.flags.postDataIncomplete &&
          hasPositiveReduction
        );
      });

      const ranked = [...eligibleRows].sort((a, b) => {
        const reductionA = view === "cost" ? a.potentialReductionCost ?? 0 : a.potentialReductionTime ?? 0;
        const reductionB = view === "cost" ? b.potentialReductionCost ?? 0 : b.potentialReductionTime ?? 0;
        const reductionDelta = reductionB - reductionA;
        if (Math.abs(reductionDelta) > 1e-9) return reductionDelta;
        const effA = view === "cost" ? a.costEfficiency ?? -Infinity : a.timeEfficiency ?? -Infinity;
        const effB = view === "cost" ? b.costEfficiency ?? -Infinity : b.timeEfficiency ?? -Infinity;
        if (effB !== effA) return effB - effA;
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      });

      const recommendations: MonitoringRecommendation[] = ranked.slice(0, 5).map((row) => {
        const hasCriticalFlag =
          row.flags.probabilityMismatch || row.flags.postDataIncomplete || row.flags.mismatchStatusVsSource;
        const hasNoFlags =
          !row.flags.probabilityMismatch && !row.flags.postDataIncomplete && !row.flags.mismatchStatusVsSource;
        const hasMitigationCost = row.mitigationCost != null;
        // Admin-only confidence heuristic for prioritisation UI; does not affect simulation maths.
        const confidence: "High" | "Medium" | "Low" = hasCriticalFlag
          ? "Low"
          : hasNoFlags && hasMitigationCost && row.sourceUsed === "pre" && row.included
            ? "High"
            : "Medium";

        const recommendation = hasCriticalFlag
          ? "Validate probability inputs — reduction attractive but input alignment needs review"
          : !hasMitigationCost
            ? view === "cost"
              ? "Review cost first — good cost reduction but mitigation cost missing"
              : "Review cost first — strong schedule reduction but mitigation cost missing"
            : view === "cost"
              ? "Activate now — strong cost reduction with complete mitigation data"
              : "Activate now — strong schedule reduction with complete mitigation data";

        return {
          riskId: row.riskId,
          title: row.title,
          lifecycleLabel: row.lifecycleLabel,
          potentialReduction: (view === "cost" ? row.potentialReductionCost : row.potentialReductionTime) as number,
          mitigationCost: row.mitigationCost,
          efficiency: view === "cost" ? row.costEfficiency : row.timeEfficiency,
          confidence,
          recommendation,
        };
      });

      const totalPotentialReduction = eligibleRows.reduce(
        (sum, row) => sum + (view === "cost" ? row.potentialReductionCost ?? 0 : row.potentialReductionTime ?? 0),
        0
      );
      const efficiencyValues = eligibleRows
        .map((row) => (view === "cost" ? row.costEfficiency : row.timeEfficiency))
        .filter((v): v is number => v != null && Number.isFinite(v));
      const avgEfficiency =
        efficiencyValues.length > 0
          ? efficiencyValues.reduce((sum, value) => sum + value, 0) / efficiencyValues.length
          : null;

      return {
        eligibleCount: eligibleRows.length,
        totalPotentialReduction,
        avgEfficiency,
        recommendations,
      };
    };

    return {
      cost: buildForView("cost"),
      schedule: buildForView("schedule"),
    };
  }, [simulationInputAuditRowsRaw]);

  const monitoringRecommendationData = monitoringRecommendationDataByView[monitoringRecommendationView];

  const simulationInputAuditRows = useMemo(() => {
    let r = [...simulationInputAuditRowsRaw];
    if (simulationInputAuditFlagFilter !== "all") {
      r = r.filter((row) => {
        const f = row.flags;
        switch (simulationInputAuditFlagFilter) {
          case "mismatchStatusVsSource":
            return f.mismatchStatusVsSource;
          case "postDataIncomplete":
            return f.postDataIncomplete;
          case "probabilityMismatch":
            return f.probabilityMismatch;
          case "none":
            return !f.mismatchStatusVsSource && !f.postDataIncomplete && !f.probabilityMismatch;
          default:
            return true;
        }
      });
    }
    if (sortAuditByPotentialReduction) {
      r.sort((a, b) => {
        const pa = a.potentialReductionCost ?? -Infinity;
        const pb = b.potentialReductionCost ?? -Infinity;
        return pb - pa;
      });
    }
    return r;
  }, [simulationInputAuditRowsRaw, sortAuditByPotentialReduction, simulationInputAuditFlagFilter]);

  /** Consistency Checks: cross-section reconciliation. Uses existing page data only; no re-run. */
  const CONSISTENCY_EPS_COST = 1;
  const CONSISTENCY_EPS_RATIO = 0.01;
  const consistencyChecks = useMemo((): { check: string; result: string; status: "PASS" | "WARN" | "FAIL" }[] => {
    const statusCounts = snapshotRiskStats.statusCounts;
    const totalRisks = snapshotRiskStats.total;
    const totalInRun = snapshotRiskStats.totalInRun;
    const sumStatus = statusCounts.draft + statusCounts.open + statusCounts.monitoring + statusCounts.mitigating + statusCounts.closed + statusCounts.archived;
    const preMix = simulationAssumptionCounts.costOnlyProfile + simulationAssumptionCounts.scheduleOnlyProfile + simulationAssumptionCounts.costAndScheduleProfile;
    const postMix = snapshotRiskStats.riskMix.post.both + snapshotRiskStats.riskMix.post.costOnly + snapshotRiskStats.riskMix.post.timeOnly;
    const monthly = selectedResult?.monthlyTotal?.slice(0, forwardExposure.horizonMonths) ?? [];
    let peakIdx = 0;
    let peakVal = monthly[0] ?? 0;
    for (let i = 1; i < monthly.length; i++) {
      const v = monthly[i] ?? 0;
      if (v > peakVal) {
        peakVal = v;
        peakIdx = i;
      }
    }
    const costSamples = neutralMc?.costSamples ?? [];
    const timeSamples = neutralMc?.timeSamples ?? [];
    const costDisplayedN = simulationIntegrity.cost?.n ?? null;
    const scheduleDisplayedN = simulationIntegrity.schedule?.n ?? null;

    const checks: { check: string; result: string; status: "PASS" | "WARN" | "FAIL" }[] = [];

    // 1. Status totals reconcile
    if (totalRisks === 0) {
      checks.push({ check: "Status totals reconcile", result: "Not enough data", status: "WARN" });
    } else if (sumStatus === totalRisks) {
      checks.push({ check: "Status totals reconcile", result: `${sumStatus} = ${totalRisks}`, status: "PASS" });
    } else {
      checks.push({ check: "Status totals reconcile", result: `Sum ${sumStatus} ≠ total ${totalRisks}`, status: "FAIL" });
    }

    // 2. Pre-mitigation risk mix reconciles
    if (simulationAssumptionCounts.totalInRun === 0) {
      checks.push({ check: "Pre-mitigation risk mix reconciles", result: "Not enough data", status: "WARN" });
    } else if (preMix === simulationAssumptionCounts.totalInRun) {
      checks.push({
        check: "Pre-mitigation risk mix reconciles",
        result: `${simulationAssumptionCounts.costOnlyProfile} + ${simulationAssumptionCounts.scheduleOnlyProfile} + ${simulationAssumptionCounts.costAndScheduleProfile} = ${simulationAssumptionCounts.totalInRun}`,
        status: "PASS",
      });
    } else {
      checks.push({
        check: "Pre-mitigation risk mix reconciles",
        result: `${preMix} ≠ ${simulationAssumptionCounts.totalInRun}`,
        status: "FAIL",
      });
    }

    // 3. Post-mitigation risk mix reconciles (mix is from risks in simulation only; closed/archived excluded)
    if (totalInRun === 0) {
      checks.push({ check: "Post-mitigation risk mix reconciles", result: "Not enough data", status: "WARN" });
    } else if (postMix === totalInRun) {
      checks.push({
        check: "Post-mitigation risk mix reconciles",
        result: `${snapshotRiskStats.riskMix.post.both} + ${snapshotRiskStats.riskMix.post.costOnly} + ${snapshotRiskStats.riskMix.post.timeOnly} = ${totalInRun} (risks in run)`,
        status: "PASS",
      });
    } else {
      checks.push({
        check: "Post-mitigation risk mix reconciles",
        result: `${postMix} ≠ ${totalInRun} (risks in run, excl. closed/archived)`,
        status: "FAIL",
      });
    }

    // 4. Cost driver delta reconciles
    if (costDrivers.length === 0) {
      checks.push({ check: "Cost driver delta reconciles", result: "Not enough data", status: "WARN" });
    } else {
      const sumPre = costDrivers.reduce((s, d) => s + d.preMitigation, 0);
      const sumPost = costDrivers.reduce((s, d) => s + d.postMitigation, 0);
      const sumDelta = costDrivers.reduce((s, d) => s + d.delta, 0);
      const diff = sumPre - sumPost;
      const ok = Math.abs(diff - sumDelta) <= CONSISTENCY_EPS_COST;
      if (ok) {
        checks.push({
          check: "Cost driver delta reconciles",
          result: `${formatCost(sumPre)} − ${formatCost(sumPost)} = ${formatCost(sumDelta)}`,
          status: "PASS",
        });
      } else {
        checks.push({
          check: "Cost driver delta reconciles",
          result: `${formatCost(diff)} ≠ sum(delta) ${formatCost(sumDelta)}`,
          status: "FAIL",
        });
      }
    }

    // 5. Mitigation reduction reconciles — post-mitigation cost must not exceed pre-mitigation (reduction ≥ 0)
    if (costDrivers.length === 0) {
      checks.push({ check: "Mitigation reduction reconciles", result: "Not enough data", status: "WARN" });
    } else {
      const preTotal = costDrivers.reduce((s, d) => s + d.preMitigation, 0);
      const postTotal = costDrivers.reduce((s, d) => s + d.postMitigation, 0);
      const reduction = preTotal - postTotal;
      const ok = reduction >= -CONSISTENCY_EPS_COST;
      if (ok) {
        checks.push({
          check: "Mitigation reduction reconciles",
          result: `${formatCost(preTotal)} − ${formatCost(postTotal)} = ${formatCost(reduction)}`,
          status: "PASS",
        });
      } else {
        checks.push({
          check: "Mitigation reduction reconciles",
          result: `Post-mitigation (${formatCost(postTotal)}) > pre-mitigation (${formatCost(preTotal)}); reduction ${formatCost(reduction)}`,
          status: "FAIL",
        });
      }
    }

    // 6. Peak exposure matches monthly table
    if (monthly.length === 0) {
      checks.push({ check: "Peak exposure matches monthly table", result: "Not enough data", status: "WARN" });
    } else {
      const maxMonthly = Math.max(...monthly.map((v) => v ?? 0));
      const ok = Math.abs((peakVal ?? 0) - maxMonthly) <= CONSISTENCY_EPS_COST;
      if (ok) {
        checks.push({
          check: "Peak exposure matches monthly table",
          result: `${formatCost(peakVal)} = max(monthlyTotal)`,
          status: "PASS",
        });
      } else {
        checks.push({
          check: "Peak exposure matches monthly table",
          result: `${formatCost(peakVal)} ≠ max ${formatCost(maxMonthly)}`,
          status: "FAIL",
        });
      }
    }

    // 7. Peak month matches monthly table
    if (monthly.length === 0) {
      checks.push({ check: "Peak month matches monthly table", result: "Not enough data", status: "WARN" });
    } else {
      let argmax = 0;
      for (let i = 1; i < monthly.length; i++) {
        if ((monthly[i] ?? 0) > (monthly[argmax] ?? 0)) argmax = i;
      }
      const peakMonth = peakIdx + 1;
      const argmaxMonth = argmax + 1;
      if (peakMonth === argmaxMonth) {
        checks.push({
          check: "Peak month matches monthly table",
          result: `Month ${peakMonth} matches argmax(monthlyTotal) + 1`,
          status: "PASS",
        });
      } else {
        checks.push({
          check: "Peak month matches monthly table",
          result: `Month ${peakMonth} ≠ argmax+1 (${argmaxMonth})`,
          status: "FAIL",
        });
      }
    }

    // 8. Top 5 risk share is not less than Top 3 risk share
    const total = selectedResult?.total ?? 0;
    const topDrivers = (selectedResult?.topDrivers ?? []).filter((d) => Number.isFinite(d.total) && d.total > 0);
    const top5 = topDrivers.slice(0, 5);
    const top3 = topDrivers.slice(0, 3);
    const top5Sum = top5.reduce((s, d) => s + d.total, 0);
    const top3Sum = top3.reduce((s, d) => s + d.total, 0);
    const top5SharePct = total > 0 ? (top5Sum / total) * 100 : 0;
    const top3RiskSharePct = total > 0 ? (top3Sum / total) * 100 : 0;
    if (total <= 0) {
      checks.push({ check: "Top 5 risk share ≥ Top 3 risk share", result: "Not enough data", status: "WARN" });
    } else if (top5SharePct >= top3RiskSharePct - CONSISTENCY_EPS_RATIO) {
      checks.push({
        check: "Top 5 risk share ≥ Top 3 risk share",
        result: `${top5SharePct.toFixed(1)}% ≥ ${top3RiskSharePct.toFixed(1)}%`,
        status: "PASS",
      });
    } else {
      checks.push({
        check: "Top 5 risk share ≥ Top 3 risk share",
        result: `${top5SharePct.toFixed(1)}% < ${top3RiskSharePct.toFixed(1)}%`,
        status: "FAIL",
      });
    }

    // 9. Contribution percentages within bounds
    const costContribSum = costDrivers.reduce((s, d) => s + (d.contributionPct ?? 0), 0);
    const scheduleContribSum = scheduleDrivers.reduce((s, d) => s + (d.contributionPct ?? 0), 0);
    const costOk = costDrivers.length === 0 ? true : costContribSum <= 100 + CONSISTENCY_EPS_RATIO;
    const scheduleOk = scheduleDrivers.length === 0 ? true : scheduleContribSum <= 100 + CONSISTENCY_EPS_RATIO;
    if (costDrivers.length === 0 && scheduleDrivers.length === 0) {
      checks.push({ check: "Contribution % within bounds", result: "Not enough data", status: "WARN" });
    } else if (costOk && scheduleOk) {
      checks.push({
        check: "Contribution % within bounds",
        result: `Cost: ${costContribSum.toFixed(1)}% ≤ 100%; Schedule: ${scheduleContribSum.toFixed(1)}% ≤ 100%`,
        status: "PASS",
      });
    } else {
      const parts: string[] = [];
      if (!costOk) parts.push(`Cost ${costContribSum.toFixed(1)}% > 100%`);
      if (!scheduleOk) parts.push(`Schedule ${scheduleContribSum.toFixed(1)}% > 100%`);
      checks.push({
        check: "Contribution % within bounds",
        result: parts.join("; "),
        status: "FAIL",
      });
    }

    // 10. Simulation integrity sample sizes match raw sample lengths
    const costMatch = costDisplayedN !== null && costSamples.length > 0 && costDisplayedN === costSamples.length;
    const scheduleMatch = scheduleDisplayedN !== null && timeSamples.length > 0 && scheduleDisplayedN === timeSamples.length;
    if (costSamples.length === 0 && timeSamples.length === 0) {
      checks.push({ check: "Sample sizes match raw lengths", result: "Not enough data", status: "WARN" });
    } else if (costMatch && scheduleMatch) {
      checks.push({
        check: "Sample sizes match raw lengths",
        result: `Cost: ${costDisplayedN}; Schedule: ${scheduleDisplayedN}`,
        status: "PASS",
      });
    } else {
      const costOk10 = costSamples.length === 0 || costMatch;
      const scheduleOk10 = timeSamples.length === 0 || scheduleMatch;
      if (costOk10 && scheduleOk10) {
        checks.push({
          check: "Sample sizes match raw lengths",
          result: `Cost: ${costDisplayedN ?? "—"}; Schedule: ${scheduleDisplayedN ?? "—"}`,
          status: "PASS",
        });
      } else {
        checks.push({
          check: "Sample sizes match raw lengths",
          result: `Displayed cost n=${costDisplayedN ?? "—"} vs raw ${costSamples.length}; schedule n=${scheduleDisplayedN ?? "—"} vs raw ${timeSamples.length}`,
          status: "FAIL",
        });
      }
    }

    // 11. Forecast monthly totals reconcile to portfolio total
    if (!selectedResult || monthly.length === 0) {
      checks.push({ check: "Forecast monthly totals reconcile", result: "Not enough data", status: "WARN" });
    } else {
      const monthlySum = monthly.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
      const expectedTotal = Number.isFinite(selectedResult.total) ? selectedResult.total : 0;
      const ok = Math.abs(monthlySum - expectedTotal) <= CONSISTENCY_EPS_COST;
      checks.push({
        check: "Forecast monthly totals reconcile",
        result: `${formatCost(monthlySum)} ${ok ? "=" : "≠"} ${formatCost(expectedTotal)}`,
        status: ok ? "PASS" : "FAIL",
      });
    }

    // 12. Forecast exposure sanity against neutral expected cost (ratio check for scale/unit drift)
    const neutralExpectedCost = baselineSummaryNeutral?.totalExpectedCost ?? 0;
    if (!selectedResult || neutralExpectedCost <= 0) {
      checks.push({
        check: "Forecast exposure sanity vs expected cost",
        result: "Not enough data",
        status: "WARN",
      });
    } else {
      const ratio = selectedResult.total / neutralExpectedCost;
      const ratioFinite = Number.isFinite(ratio) && ratio > 0;
      const withinBand = ratioFinite && ratio >= 0.25 && ratio <= 4;
      checks.push({
        check: "Forecast exposure sanity vs expected cost",
        result: ratioFinite
          ? `${formatCost(selectedResult.total)} / ${formatCost(neutralExpectedCost)} = ${ratio.toFixed(2)}x`
          : "Invalid ratio",
        status: withinBand ? "PASS" : "WARN",
      });
    }

    return checks;
  }, [
    snapshotRiskStats,
    simulationAssumptionCounts,
    costDrivers,
    scheduleDrivers,
    selectedResult,
    forwardExposure,
    neutralMc,
    simulationIntegrity,
    baselineSummaryNeutral,
  ]);

  /** RUN VERDICT: summary outcome from Simulation Warnings + Consistency Checks. Reuses existing outputs only; no duplicate calculation. */
  const runVerdict = useMemo(() => {
    const failCount = consistencyChecks.filter((c) => c.status === "FAIL").length;
    const warnCount = consistencyChecks.filter((c) => c.status === "WARN").length;
    const passCount = consistencyChecks.filter((c) => c.status === "PASS").length;
    const c = simulationAssumptionCounts;
    const highWarnings =
      (c.withNoVariability > 3 ? 1 : 0) +
      (c.missingPreProbability > 0 ? 1 : 0) +
      (c.missingPostProbability > 0 ? 1 : 0);
    const reviewWarnings =
      (c.unchangedMitigation > 0 ? 1 : 0) +
      (c.withMinEqualsMaxCost > 0 ? 1 : 0) +
      (c.withMinEqualsMaxSchedule > 0 ? 1 : 0);
    const status: "Healthy run" | "Valid with warnings" | "Critical issues detected" =
      failCount > 0
        ? "Critical issues detected"
        : warnCount > 0 || highWarnings > 0
          ? "Valid with warnings"
          : "Healthy run";
    const summary =
      status === "Healthy run"
        ? "Inputs, simulation outputs, and reconciliation checks passed"
        : status === "Valid with warnings"
          ? "Run is usable but some input-quality warnings were detected"
          : "One or more reconciliation checks failed; do not rely on outputs without review";
    return {
      status,
      summary,
      counts: { highWarnings, reviewWarnings, passCount, warnCount, failCount },
    };
  }, [consistencyChecks, simulationAssumptionCounts]);
  const PAGE_CONTAINER = "mt-0 px-4 pb-4 pt-0 sm:px-5 sm:pb-5 sm:pt-0";
  const PAGE_TITLE = "m-0 text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]";
  const PAGE_ACTION_ROW = "mt-4 flex flex-wrap items-center gap-2";
  const CALLOUT_ROW = "min-w-0 basis-full shrink-0 sm:basis-auto";
  const RUN_SECTION_CARD = "border-[var(--ds-border-subtle)]";
  /** Inset cards: no extra frame inside section body (overrides Card inset border/surface). */
  const RUN_INSET_CARD = "!border-0 !bg-transparent shadow-none";
  const RUN_CARD_HEADER = "!border-[var(--ds-border-subtle)] !px-4 !py-2.5";
  const RUN_CARD_TITLE = "text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]";
  const RUN_SUBCARD_TITLE = "text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]";
  const RUN_CARD_BODY = "!px-4 !py-3";
  const SECTION_GAP = "mt-8";
  const FIRST_SECTION_GAP = "!mt-0";
  const SMALL_GAP = "mt-4";
  const META_GRID_4 = "grid grid-cols-1 gap-4 text-[length:var(--ds-text-sm)] sm:grid-cols-2 lg:grid-cols-4";
  const META_GROUP = "space-y-2";
  const META_GROUP_TITLE = "text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]";
  const META_DL = "m-0 space-y-1.5";
  const META_DT = "font-normal text-[var(--ds-text-muted)]";
  const META_DD = "mt-0.5 text-[var(--ds-text-primary)]";
  const META_DD_MONO_BREAKALL = "mt-0.5 break-all font-mono text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]";
  const META_DD_TRUNCATE = "mt-0.5 truncate text-[var(--ds-text-primary)]";
  const META_INLINE_NOTE = "ml-1 font-normal text-[var(--ds-text-muted)]";
  const DIST_META_ROW = "mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]";
  const DIST_PERCENTILES_GRID = "m-0 grid grid-cols-2 gap-x-4 gap-y-2 text-[length:var(--ds-text-sm)] sm:grid-cols-4 lg:grid-cols-6";
  const DIST_STATS_GRID = "m-0 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--ds-border-subtle)] pt-2.5 text-[length:var(--ds-text-xs)]";
  const DIST_DT = "font-normal text-[var(--ds-text-muted)]";
  const DIST_DD = "m-0 mt-0.5 font-medium tabular-nums text-[var(--ds-text-primary)]";
  const DIST_HELPER_TEXT = "mb-0 mt-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]";
  const TABLE_TH_META =
    "text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ds-text-muted)]";
  const DIAG_TABLE = "w-full border-collapse text-[length:var(--ds-text-sm)]";
  const DIAG_THEAD_ROW = "border-b border-[var(--ds-border-subtle)]";
  const DIAG_TBODY_ROW = "border-b border-[var(--ds-border-subtle)]";
  const DIAG_TBODY_ROW_LAST = `${DIAG_TBODY_ROW} last:border-b-0`;
  const DIAG_TH_LEFT_PR2 = `py-1.5 pr-2 text-left ${TABLE_TH_META}`;
  const DIAG_TH_LEFT_PX2 = `px-2 py-1.5 text-left ${TABLE_TH_META}`;
  const DIAG_TH_LEFT_PL2 = `py-1.5 pl-2 text-left ${TABLE_TH_META}`;
  const DIAG_TH_RIGHT_PX2 = `px-2 py-1.5 text-right ${TABLE_TH_META}`;
  const DIAG_TH_RIGHT_PL2_W20 = `w-20 py-1.5 pl-2 text-right ${TABLE_TH_META}`;
  const DIAG_TD_LEFT_PR2 = "py-1.5 pr-2 text-[var(--ds-text-secondary)]";
  const DIAG_TD_LEFT_PX2_MUTED = "px-2 py-1.5 text-left tabular-nums text-[var(--ds-text-secondary)]";
  const DIAG_TD_LEFT_PL2_MUTED = "py-1.5 pl-2 text-[var(--ds-text-muted)]";
  const DIAG_TD_RIGHT_PX2_NUM = "px-2 py-1.5 text-right tabular-nums text-[var(--ds-text-primary)]";
  const DIAG_TD_ALIGN_TOP = "py-1.5 pr-2 align-top";
  const DIAG_WARN_TH_SEVERITY = `w-20 py-1.5 pr-2 text-left ${TABLE_TH_META}`;
  const DIAG_WARN_TH_MESSAGE = `py-1.5 pl-2 text-left ${TABLE_TH_META}`;
  const DRIVER_TABLE_WRAP = "overflow-x-auto bg-transparent";
  const DRIVER_TABLE = "w-full border-collapse text-[length:var(--ds-text-sm)]";
  const DRIVER_HEAD_ROW = "border-b border-[var(--ds-border-subtle)]";
  const DRIVER_TH_LEFT = `px-3 py-1.5 text-left ${TABLE_TH_META}`;
  const DRIVER_TH_RIGHT = `px-3 py-1.5 text-right ${TABLE_TH_META}`;
  const DRIVER_ROW = "border-b border-[var(--ds-border-subtle)] last:border-b-0";
  const DRIVER_CELL_RANK = "px-3 py-1.5 text-right tabular-nums text-[var(--ds-text-muted)]";
  const DRIVER_CELL_NAME = "max-w-[200px] truncate px-3 py-1.5 text-[var(--ds-text-primary)]";
  const DRIVER_CELL_MUTED = "px-3 py-1.5 text-[var(--ds-text-muted)]";
  const DRIVER_CELL_VALUE = "px-3 py-1.5 text-right font-medium tabular-nums text-[var(--ds-text-primary)]";
  const DRIVER_CELL_NUMERIC_MUTED = "px-3 py-1.5 text-right tabular-nums text-[var(--ds-text-muted)]";
  const DRIVER_CELL_NUMERIC = "px-3 py-1.5 text-right tabular-nums text-[var(--ds-text-secondary)]";
  const DRIVER_EMPTY = "px-3 py-2 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]";
  const H_TILE_WRAP = "rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-default)] p-2.5";
  const H_TILE_LABEL = "text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]";
  const H_TILE_VALUE = "mt-0.5 text-[length:var(--ds-text-base)] font-semibold tabular-nums text-[var(--ds-text-primary)]";
  const H_SUBSECTION_TITLE = "mb-1.5 text-[length:var(--ds-text-xs)] font-semibold uppercase tracking-[0.06em] text-[var(--ds-text-muted)]";
  const H_COMPACT_LIST = "m-0 space-y-1.5 text-[length:var(--ds-text-sm)]";
  const H_COMPACT_LIST_ROW = "flex items-baseline justify-between gap-2";
  const H_COMPACT_LIST_NAME = "truncate text-[var(--ds-text-primary)]";
  const H_COMPACT_LIST_VALUE = "shrink-0 font-medium tabular-nums text-[var(--ds-text-secondary)]";
  const H_EMPTY_MUTED = "m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]";
  const H_EMPTY_LIST_MUTED = "text-[var(--ds-text-muted)]";
  const CARD_DESC = "m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]";
  const DRIVER_BLOCK_HEADING =
    "mb-0 shrink-0 text-[length:var(--ds-text-xs)] font-semibold uppercase tracking-[0.06em] text-[var(--ds-text-muted)]";
  const simulationActions = useMemo(
    () => (
      <>
        <Button
          type="button"
          onClick={async () => {
            const snapshotProjectId = projectId?.trim();
            if (!snapshotProjectId) {
              console.error("[run-data] runSimulation skipped: projectId is required for snapshot access");
              return;
            }
            setSnapshotPersistWarning(null);
            setLockedRunPinned(false);
            const result = await runSimulation(10000, snapshotProjectId);
            if (!result.ran && result.blockReason === "invalid") {
              setRunBlockedInvalidCount(result.invalidCount);
              return;
            }
            if (!result.ran && result.blockReason === "missing_project") {
              console.error("[run-data] runSimulation blocked:", result.message);
              return;
            }
            if (!result.ran && result.blockReason === "snapshot_persist") {
              setSnapshotPersistWarning(result.message);
              return;
            }
          }}
          disabled={hasDraftRisks || invalidRunnableCount > 0}
          variant="secondary"
        >
          Run Simulation
        </Button>
        <Button
          type="button"
          onClick={async () => {
            const snapshotProjectId = projectId?.trim();
            if (!snapshotProjectId) {
              console.error("[run-data] clearProjectSnapshots skipped: projectId is required for snapshot access");
              return;
            }
            setLockedRunPinned(false);
            clearSimulationHistory();
            try {
              await clearProjectSnapshots(snapshotProjectId);
              setReportingSnapshotRow(null);
            } catch (err) {
              console.error("[run-data] clear snapshots", err);
            }
          }}
          variant="secondary"
        >
          Clear History
        </Button>
        <Button
          type="button"
          onClick={async () => {
            const snapshotProjectId = projectId?.trim();
            if (!snapshotProjectId) {
              console.error("[run-data] getLatestLockedSnapshot skipped: projectId is required for snapshot access");
              return;
            }
            setLockedRunLoadWarning(null);
            setLoadingLockedRun(true);
            try {
              const row = await getLatestLockedDbSnapshot(snapshotProjectId);
              if (!row) {
                setLockedRunLoadWarning("No locked reporting run found for this project.");
                return;
              }
              hydrateSimulationFromDbSnapshot(row, "run-data-load-last-locked");
              setReportingSnapshotRow(row);
              setLockedRunPinned(true);
            } catch (e: unknown) {
              const message =
                e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
                  ? (e as { message: string }).message
                  : "Could not load the latest locked run.";
              setLockedRunLoadWarning(message);
            } finally {
              setLoadingLockedRun(false);
            }
          }}
          disabled={loadingLockedRun}
          variant="secondary"
        >
          {loadingLockedRun ? "Loading locked run..." : "Load Last Locked Run"}
        </Button>
      </>
    ),
    [
      clearSimulationHistory,
      hasDraftRisks,
      hydrateSimulationFromDbSnapshot,
      invalidRunnableCount,
      loadingLockedRun,
      projectId,
      runSimulation,
    ]
  );
  const showInlineHeader = !projectId || !setPageHeaderExtras;
  const pageContainerClass = showInlineHeader ? PAGE_CONTAINER : "mt-0 px-4 pb-4 pt-0 sm:px-5 sm:pb-5 sm:pt-0";
  const headerActions = useMemo(
    () => <div className="flex flex-wrap items-center gap-2">{simulationActions}</div>,
    [simulationActions]
  );
  useEffect(() => {
    if (!projectId || !setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "Run Data", end: headerActions });
    return () => setPageHeaderExtras(null);
  }, [headerActions, projectId, setPageHeaderExtras]);

  return (
    <main className={pageContainerClass}>
      {showInlineHeader && (
        <>
          <h1 className={PAGE_TITLE}>Run Data</h1>
          <div className={PAGE_ACTION_ROW}>{simulationActions}</div>
        </>
      )}
      <div className={PAGE_ACTION_ROW}>
        {hasDraftRisks && (
          <Callout status="warning" className={`${CALLOUT_ROW} text-[length:var(--ds-text-sm)]`} role="status">
            Review and save all draft risks in the Risk Register before running simulation.
          </Callout>
        )}
        {invalidRunnableCount > 0 && (
          <Callout status="warning" className={`${CALLOUT_ROW} text-[length:var(--ds-text-sm)]`} role="status">
            Fix {invalidRunnableCount} risk{invalidRunnableCount !== 1 ? "s" : ""} to run simulation.
          </Callout>
        )}
        {runBlockedInvalidCount != null && runBlockedInvalidCount > 0 && (
          <Callout status="warning" className={`${CALLOUT_ROW} text-[length:var(--ds-text-sm)]`} role="alert">
            Simulation blocked: fix {runBlockedInvalidCount} risk{runBlockedInvalidCount !== 1 ? "s" : ""} to run simulation.
          </Callout>
        )}
        {snapshotPersistWarning && (
          <Callout status="danger" className={`${CALLOUT_ROW} max-w-2xl text-[length:var(--ds-text-sm)]`} role="alert">
            Could not save run to the database: {snapshotPersistWarning}
          </Callout>
        )}
        {lockedRunLoadWarning && (
          <Callout status="warning" className={`${CALLOUT_ROW} max-w-2xl text-[length:var(--ds-text-sm)]`} role="alert">
            {lockedRunLoadWarning}
          </Callout>
        )}
      </div>


      {!current ? (
        <Callout status="neutral" className={`${SMALL_GAP} text-[length:var(--ds-text-sm)]`}>
          No simulation run yet. Add risks in the Risk Register, then run a simulation.
        </Callout>
      ) : (
        <>
          {/* ——— BASELINE: inputs that were run ——— */}
          {/* Run Metadata: run identity, config, status. Source: current (simulation run snapshot). */}
          <Section className={FIRST_SECTION_GAP} aria-label="Run metadata">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Run Metadata</CardTitle>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className={META_GRID_4}>
                  {/* Group A — Identity */}
                  <div className={META_GROUP}>
                    <div className={META_GROUP_TITLE}>
                      Identity
                    </div>
                    <dl className={META_DL}>
                      <div>
                        <dt className={META_DT}>Run ID</dt>
                        <dd className={META_DD_MONO_BREAKALL} title={current.id?.startsWith("sim_") ? "Legacy run; re-run for canonical ID" : current.id || "Not yet persisted"}>
                          {current.id && !current.id.startsWith("sim_") ? current.id : "Pending save"}
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Project ID</dt>
                        <dd className={META_DD_MONO_BREAKALL}>
                          {projectId ?? "Not available"}
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Project name</dt>
                        <dd className={META_DD_TRUNCATE} title={projectName ?? undefined}>
                          {projectName?.trim() || "Not available"}
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Run timestamp</dt>
                        <dd className={META_DD}>
                          {current.timestampIso ? formatRunTimestamp(current.timestampIso) : "Not available"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {/* Group B — Configuration */}
                  <div className={META_GROUP}>
                    <div className={META_GROUP_TITLE}>
                      Configuration
                    </div>
                    <dl className={META_DL}>
                      <div>
                        <dt className={META_DT}>Iterations</dt>
                        <dd className={META_DD}>
                          {current.iterations != null ? current.iterations.toLocaleString() : neutralMc?.iterationCount != null ? neutralMc.iterationCount.toLocaleString() : "Not available"}
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Run duration</dt>
                        <dd className={META_DD}>
                          {typeof current.runDurationMs === "number"
                            ? `${(current.runDurationMs / 1000).toFixed(2)} s`
                            : "Not available"}
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Simulation Engine Version</dt>
                        <dd className={META_DD}>{SIMULATION_ENGINE_VERSION}</dd>
                      </div>
                    </dl>
                  </div>
                  {/* Group C — Status */}
                  <div className={META_GROUP}>
                    <div className={META_GROUP_TITLE}>
                      Status
                    </div>
                    <dl className={META_DL}>
                      <div>
                        <dt className={META_DT}>Status</dt>
                        <dd className="mt-0.5">
                          <Badge status={runStatus === "Complete" ? "success" : "warning"}>{runStatus}</Badge>
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Run Data Completeness</dt>
                        <dd className="mt-0.5">
                          <Badge status={runDataCompleteness === "Complete" ? "success" : "neutral"}>
                            {runDataCompleteness}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Reporting version</dt>
                        <dd className="mt-0.5">
                          {reportingDbRow?.locked_for_reporting ? (
                            <Badge status="success">Yes</Badge>
                          ) : (
                            <span className="text-[var(--ds-text-muted)]">No</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {/* Group D — Audit */}
                  <div className={META_GROUP}>
                    <div className={META_GROUP_TITLE}>
                      Audit
                    </div>
                    <dl className={META_DL}>
                      <div>
                        <dt className={META_DT}>Triggered by</dt>
                        <dd className={META_DD}>
                          {triggeredBy ?? "Not available"}
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Reporting month / year</dt>
                        <dd className={META_DD}>
                          {(() => {
                            if (!reportingDbRow?.report_month) {
                              return (
                                <span className="text-[var(--ds-text-muted)]">Not set</span>
                              );
                            }
                            const label = formatReportMonthLabel(reportingDbRow.report_month);
                            return label !== "—" ? (
                              label
                            ) : (
                              <span className="text-[var(--ds-text-muted)]">Not set</span>
                            );
                          })()}
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Locked by</dt>
                        <dd className={META_DD}>
                          {(reportingLockedByLabel ?? reportingDbRow?.locked_by?.trim()) || (
                            <span className="text-[var(--ds-text-muted)]">Not set</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Locked on</dt>
                        <dd className={META_DD}>
                          {reportingDbRow?.locked_at ? (
                            formatRunTimestamp(reportingDbRow.locked_at)
                          ) : (
                            <span className="text-[var(--ds-text-muted)]">Not set</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className={META_DT}>Reporting note</dt>
                        <dd className={META_DD}>
                          {reportingDbRow?.lock_note?.trim() || (
                            <span className="text-[var(--ds-text-muted)]">Not available</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Section>

          {/* RUN VERDICT: single summary from Simulation Warnings + Consistency Checks. Internal diagnostic only. */}
          <Section className={SECTION_GAP} aria-label="Run verdict">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={`${RUN_CARD_HEADER} !pb-1.5`}>
                <CardTitle className="text-sm font-semibold text-[var(--ds-text-primary)] mb-2">
                  Run verdict
                </CardTitle>
              </CardHeader>
              <CardBody className={`${RUN_CARD_BODY} !pt-1.5`}>
                <div>
                  <Callout
                    status={
                      runVerdict.status === "Healthy run"
                        ? "success"
                        : runVerdict.status === "Valid with warnings"
                          ? "warning"
                          : "danger"
                    }
                  >
                    <div>
                      <div className="text-sm font-medium">{runVerdict.status}</div>
                      <div className="text-xs text-[var(--ds-text-muted)] mt-0.5">
                        {runVerdict.summary}
                      </div>
                    </div>
                  </Callout>
                  <div className="text-xs text-[var(--ds-text-muted)] mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <span>High warnings: {runVerdict.counts.highWarnings}</span>
                    <span>Review warnings: {runVerdict.counts.reviewWarnings}</span>
                    <span>PASS checks: {runVerdict.counts.passCount}</span>
                    <span>WARN checks: {runVerdict.counts.warnCount}</span>
                    <span>FAIL checks: {runVerdict.counts.failCount}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Section>

          {/* Risk Register Snapshot: risk set that fed the run (current.risks). Counts and mix validate input. */}
          <Section className={SECTION_GAP} aria-label="Risk register snapshot">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Risk Register Snapshot</CardTitle>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className={META_GRID_4}>
                {/* Risk Volume */}
                <div className={META_GROUP}>
                  <div className={META_GROUP_TITLE}>
                    Risk Volume
                  </div>
                  <dl className={META_DL}>
                    <div>
                      <dt className={META_DT}>Total risks</dt>
                      <dd className={META_DD}>
                        {snapshotRiskStats.total.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className={META_DT}>Risks in run</dt>
                      <dd className={META_DD}>
                        {snapshotRiskStats.totalInRun.toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
                {/* Status (each risk in exactly one status; % of total) */}
                <div className={META_GROUP}>
                  <div className={META_GROUP_TITLE}>
                    Status
                  </div>
                  <dl className={META_DL}>
                    {(
                      [
                        { key: "draft" as const, label: "Draft" },
                        { key: "open" as const, label: "Open" },
                        { key: "monitoring" as const, label: "Monitoring" },
                        { key: "mitigating" as const, label: "Mitigating" },
                        { key: "closed" as const, label: "Closed" },
                        { key: "archived" as const, label: "Archived" },
                      ] as const
                    ).map(({ key, label }) => {
                      const count = snapshotRiskStats.statusCounts[key];
                      const pct =
                        snapshotRiskStats.total > 0
                          ? Math.round((count / snapshotRiskStats.total) * 100)
                          : 0;
                      return (
                        <div key={key}>
                          <dt className={META_DT}>
                            {label}
                          </dt>
                          <dd className={META_DD}>
                            {count.toLocaleString()}
                            <span className={META_INLINE_NOTE}>
                              ({pct}%)
                            </span>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
                {/* Risk Mix Pre */}
                <div className={META_GROUP}>
                  <div className={META_GROUP_TITLE}>
                    Risk Mix Pre
                  </div>
                  <dl className={META_DL}>
                    {[
                      { key: "both" as const, label: "Risks with both time & cost" },
                      { key: "costOnly" as const, label: "Risks with cost only" },
                      { key: "timeOnly" as const, label: "Risks with time only" },
                    ].map(({ key, label }) => {
                      const count = snapshotRiskStats.riskMix.pre[key];
                      const pct = snapshotRiskStats.totalInRun > 0 ? Math.round((count / snapshotRiskStats.totalInRun) * 100) : 0;
                      return (
                        <div key={key}>
                          <dt className={META_DT}>{label}</dt>
                          <dd className={META_DD}>
                            {count.toLocaleString()}
                            <span className={META_INLINE_NOTE}>({pct}%)</span>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
                {/* Risk Mix Post */}
                <div className={META_GROUP}>
                  <div className={META_GROUP_TITLE}>
                    Risk Mix Post
                  </div>
                  <dl className={META_DL}>
                    {[
                      { key: "both" as const, label: "Risks with both time & cost" },
                      { key: "costOnly" as const, label: "Risks with cost only" },
                      { key: "timeOnly" as const, label: "Risks with time only" },
                    ].map(({ key, label }) => {
                      const count = snapshotRiskStats.riskMix.post[key];
                      const pct = snapshotRiskStats.totalInRun > 0 ? Math.round((count / snapshotRiskStats.totalInRun) * 100) : 0;
                      return (
                        <div key={key}>
                          <dt className={META_DT}>{label}</dt>
                          <dd className={META_DD}>
                            {count.toLocaleString()}
                            <span className={META_INLINE_NOTE}>({pct}%)</span>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              </div>
              </CardBody>
            </Card>
          </Section>

          {/* ——— SIMULATION: Monte Carlo outputs ——— */}
          {/* Cost Distribution: percentiles from neutral run. Source: neutralMc.costSamples or snapshot summary. */}
          <Section className={SECTION_GAP} aria-label="Cost distribution">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Cost Distribution</CardTitle>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className={DIST_META_ROW}>
                  <span>Model: {distributionPercentiles.meta.baselineName}</span>
                  <span>Iterations: {distributionPercentiles.meta.iterationCount != null ? distributionPercentiles.meta.iterationCount.toLocaleString() : "Not available"}</span>
                  <span>Sample size: {distributionPercentiles.meta.costSampleSize != null ? distributionPercentiles.meta.costSampleSize.toLocaleString() : "Not available"}</span>
                </div>
                <dl className={DIST_PERCENTILES_GRID}>
                  {PERCENTILE_POINTS.map((p) => {
                    const value = distributionPercentiles.cost[p];
                    return (
                      <div key={p}>
                        <dt className={DIST_DT}>P{p}</dt>
                        <dd className={DIST_DD}>
                          {value != null && Number.isFinite(value) ? formatCost(value) : "—"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                <p className={DIST_HELPER_TEXT}>
                  P0 = minimum, P100 = maximum simulated outcome.
                </p>
                <dl className={DIST_STATS_GRID}>
                  <div>
                    <dt className={DIST_DT}>Mean</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.costStats.mean != null && Number.isFinite(distributionPercentiles.costStats.mean)
                        ? formatCost(distributionPercentiles.costStats.mean)
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className={DIST_DT}>Standard deviation</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.costStats.stdDev != null && Number.isFinite(distributionPercentiles.costStats.stdDev)
                        ? formatCost(distributionPercentiles.costStats.stdDev)
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className={DIST_DT}>P50–P80 gap</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.costStats.p50P80Gap != null && Number.isFinite(distributionPercentiles.costStats.p50P80Gap)
                        ? formatCost(distributionPercentiles.costStats.p50P80Gap)
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className={DIST_DT}>P90–P50 gap</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.costStats.p90P50Gap != null && Number.isFinite(distributionPercentiles.costStats.p90P50Gap)
                        ? formatCost(distributionPercentiles.costStats.p90P50Gap)
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className={DIST_DT}>P10–P90 range</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.costStats.p10P90Range != null && Number.isFinite(distributionPercentiles.costStats.p10P90Range)
                        ? formatCost(distributionPercentiles.costStats.p10P90Range)
                        : "Not available"}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </Section>

          {/* Schedule Distribution: percentiles from neutral run. Source: neutralMc.timeSamples or snapshot summary. */}
          <Section className={SECTION_GAP} aria-label="Schedule distribution">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Schedule Distribution</CardTitle>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className={DIST_META_ROW}>
                  <span>Model: {distributionPercentiles.meta.baselineName}</span>
                  <span>Iterations: {distributionPercentiles.meta.iterationCount != null ? distributionPercentiles.meta.iterationCount.toLocaleString() : "Not available"}</span>
                  <span>Sample size: {distributionPercentiles.meta.timeSampleSize != null ? distributionPercentiles.meta.timeSampleSize.toLocaleString() : "Not available"}</span>
                </div>
                <dl className={DIST_PERCENTILES_GRID}>
                  {PERCENTILE_POINTS.map((p) => {
                    const value = distributionPercentiles.schedule[p];
                    return (
                      <div key={p}>
                        <dt className={DIST_DT}>P{p}</dt>
                        <dd className={DIST_DD}>
                          {value != null && Number.isFinite(value) ? formatDurationDays(value) : "—"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                <p className={DIST_HELPER_TEXT}>
                  P0 = minimum, P100 = maximum simulated outcome.
                </p>
                <dl className={DIST_STATS_GRID}>
                  <div>
                    <dt className={DIST_DT}>Mean</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.scheduleStats.mean != null && Number.isFinite(distributionPercentiles.scheduleStats.mean)
                        ? formatDurationDays(distributionPercentiles.scheduleStats.mean)
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className={DIST_DT}>Standard deviation</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.scheduleStats.stdDev != null && Number.isFinite(distributionPercentiles.scheduleStats.stdDev)
                        ? formatDurationDays(distributionPercentiles.scheduleStats.stdDev)
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className={DIST_DT}>P50–P80 gap</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.scheduleStats.p50P80Gap != null && Number.isFinite(distributionPercentiles.scheduleStats.p50P80Gap)
                        ? formatDurationDays(distributionPercentiles.scheduleStats.p50P80Gap)
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className={DIST_DT}>P90–P50 gap</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.scheduleStats.p90P50Gap != null && Number.isFinite(distributionPercentiles.scheduleStats.p90P50Gap)
                        ? formatDurationDays(distributionPercentiles.scheduleStats.p90P50Gap)
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className={DIST_DT}>P10–P90 range</dt>
                    <dd className={DIST_DD}>
                      {distributionPercentiles.scheduleStats.p10P90Range != null && Number.isFinite(distributionPercentiles.scheduleStats.p10P90Range)
                        ? formatDurationDays(distributionPercentiles.scheduleStats.p10P90Range)
                        : "Not available"}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </Section>

          {/* ——— SIMULATION INTEGRITY: Monte Carlo distribution diagnostics ——— */}
          <Section className={SECTION_GAP} aria-label="Simulation integrity">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Simulation Integrity</CardTitle>
                <p className={`${CARD_DESC} mt-1`}>Monte Carlo distribution diagnostics</p>
                <p className={`${CARD_DESC} mt-1`}>
                  Standard deviation shows typical spread around the mean. CV shows relative spread.
                </p>
                <p className={`${CARD_DESC} mt-1`}>
                  Kurtosis is raw (normal ≈ 3), not excess kurtosis. Variance is hidden from the main table because it uses squared units.
                </p>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-3">
              {/* Cost distribution diagnostics */}
                  <Card variant="inset" className={RUN_INSET_CARD}>
                    <CardHeader className={RUN_CARD_HEADER}>
                      <CardTitle className={RUN_SUBCARD_TITLE}>Cost distribution diagnostics</CardTitle>
                    </CardHeader>
                    <CardBody className={RUN_CARD_BODY}>
                  {simulationIntegrity.cost ? (
                    <>
                    <Table className={DIAG_TABLE}>
                      <TableHead>
                        <TableRow className={DIAG_THEAD_ROW}>
                          <TableHeaderCell className={`${DIAG_TH_LEFT_PR2} pl-0`}>Metric</TableHeaderCell>
                          <TableHeaderCell className={DIAG_TH_RIGHT_PX2}>Value</TableHeaderCell>
                          <TableHeaderCell className={`${DIAG_TH_LEFT_PL2} pr-0`}>Interpretation</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Sample size</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationIntegrity.cost.n.toLocaleString()}</TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>{simulationIntegrity.cost.sampleSizeInterpretation}</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Mean</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.mean != null && Number.isFinite(simulationIntegrity.cost.mean) ? formatCost(simulationIntegrity.cost.mean) : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Standard deviation</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.stdDev != null && Number.isFinite(simulationIntegrity.cost.stdDev) ? formatCost(simulationIntegrity.cost.stdDev) : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Coefficient of variation (CV)</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.cv != null && Number.isFinite(simulationIntegrity.cost.cv)
                              ? simulationIntegrity.cost.cv.toFixed(2)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>{simulationIntegrity.cost.cvInterpretation}</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Skewness</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.skewness != null && Number.isFinite(simulationIntegrity.cost.skewness)
                              ? simulationIntegrity.cost.skewness.toFixed(2)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>{simulationIntegrity.cost.skewnessInterpretation}</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Kurtosis (raw, normal ≈ 3)</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.kurtosis != null && Number.isFinite(simulationIntegrity.cost.kurtosis)
                              ? simulationIntegrity.cost.kurtosis.toFixed(2)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>{simulationIntegrity.cost.kurtosisInterpretation}</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Minimum</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.min != null && Number.isFinite(simulationIntegrity.cost.min) ? formatCost(simulationIntegrity.cost.min) : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                        </TableRow>
                        <TableRow className="border-b-0">
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Maximum</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.max != null && Number.isFinite(simulationIntegrity.cost.max) ? formatCost(simulationIntegrity.cost.max) : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    <p className={`${CARD_DESC} mt-2`}>
                      Variance (technical, squared units):{" "}
                      {simulationIntegrity.cost.variance != null && Number.isFinite(simulationIntegrity.cost.variance)
                        ? simulationIntegrity.cost.variance.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : "—"}
                    </p>
                    </>
                  ) : (
                    <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                      Diagnostics unavailable — sample data not stored for this run.
                    </p>
                  )}
                    </CardBody>
                  </Card>

              {/* Schedule distribution diagnostics */}
                  <Card variant="inset" className={RUN_INSET_CARD}>
                    <CardHeader className={RUN_CARD_HEADER}>
                      <CardTitle className={RUN_SUBCARD_TITLE}>Schedule distribution diagnostics</CardTitle>
                    </CardHeader>
                    <CardBody className={RUN_CARD_BODY}>
                  {simulationIntegrity.schedule ? (
                    <>
                    <Table className={DIAG_TABLE}>
                      <TableHead>
                        <TableRow className={DIAG_THEAD_ROW}>
                          <TableHeaderCell className={`${DIAG_TH_LEFT_PR2} pl-0`}>Metric</TableHeaderCell>
                          <TableHeaderCell className={DIAG_TH_RIGHT_PX2}>Value</TableHeaderCell>
                          <TableHeaderCell className={`${DIAG_TH_LEFT_PL2} pr-0`}>Interpretation</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Sample size</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationIntegrity.schedule.n.toLocaleString()}</TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>{simulationIntegrity.schedule.sampleSizeInterpretation}</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Mean</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.mean != null && Number.isFinite(simulationIntegrity.schedule.mean)
                              ? formatDurationDays(simulationIntegrity.schedule.mean)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Standard deviation</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.stdDev != null && Number.isFinite(simulationIntegrity.schedule.stdDev)
                              ? formatDurationDays(simulationIntegrity.schedule.stdDev)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Coefficient of variation (CV)</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.cv != null && Number.isFinite(simulationIntegrity.schedule.cv)
                              ? simulationIntegrity.schedule.cv.toFixed(2)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>{simulationIntegrity.schedule.cvInterpretation}</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Skewness</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.skewness != null && Number.isFinite(simulationIntegrity.schedule.skewness)
                              ? simulationIntegrity.schedule.skewness.toFixed(2)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>{simulationIntegrity.schedule.skewnessInterpretation}</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Kurtosis (raw, normal ≈ 3)</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.kurtosis != null && Number.isFinite(simulationIntegrity.schedule.kurtosis)
                              ? simulationIntegrity.schedule.kurtosis.toFixed(2)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>{simulationIntegrity.schedule.kurtosisInterpretation}</TableCell>
                        </TableRow>
                        <TableRow className={DIAG_TBODY_ROW}>
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Minimum</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.min != null && Number.isFinite(simulationIntegrity.schedule.min)
                              ? formatDurationDays(simulationIntegrity.schedule.min)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                        </TableRow>
                        <TableRow className="border-b-0">
                          <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Maximum</TableCell>
                          <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.max != null && Number.isFinite(simulationIntegrity.schedule.max)
                              ? formatDurationDays(simulationIntegrity.schedule.max)
                              : "—"}
                          </TableCell>
                          <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    <p className={`${CARD_DESC} mt-2`}>
                      Variance (technical, squared units):{" "}
                      {simulationIntegrity.schedule.variance != null && Number.isFinite(simulationIntegrity.schedule.variance)
                        ? simulationIntegrity.schedule.variance.toLocaleString(undefined, { maximumFractionDigits: 1 })
                        : "—"}
                    </p>
                    </>
                  ) : (
                    <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                      Diagnostics unavailable — sample data not stored for this run.
                    </p>
                  )}
                    </CardBody>
                  </Card>
                </div>
              </CardBody>
            </Card>
          </Section>

          {/* ——— SIMULATION INPUT AUDIT: per-risk engine inputs (snapshot vs live) ——— */}
          <Section className={SECTION_GAP} aria-label="Simulation input audit">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Top Monitoring Risks to Activate</CardTitle>
                <p className={`${CARD_DESC} mt-1`}>
                  Monitoring risks with the strongest modelled reduction if moved to active mitigation.
                </p>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className="mb-4 inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setMonitoringRecommendationView("cost")}
                    className={`rounded px-3 py-1 text-[length:var(--ds-text-xs)] font-medium ${
                      monitoringRecommendationView === "cost"
                        ? "bg-[var(--ds-text-primary)] text-[var(--ds-bg)]"
                        : "text-[var(--ds-text-secondary)]"
                    }`}
                    aria-pressed={monitoringRecommendationView === "cost"}
                  >
                    Cost
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitoringRecommendationView("schedule")}
                    className={`rounded px-3 py-1 text-[length:var(--ds-text-xs)] font-medium ${
                      monitoringRecommendationView === "schedule"
                        ? "bg-[var(--ds-text-primary)] text-[var(--ds-bg)]"
                        : "text-[var(--ds-text-secondary)]"
                    }`}
                    aria-pressed={monitoringRecommendationView === "schedule"}
                  >
                    Schedule
                  </button>
                </div>
                <dl className="mb-4 grid grid-cols-1 gap-3 text-[length:var(--ds-text-sm)] sm:grid-cols-3">
                  <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2">
                    <dt className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">
                      Eligible Monitoring Risks
                    </dt>
                    <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                      {monitoringRecommendationData.eligibleCount}
                    </dd>
                  </div>
                  <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2">
                    <dt className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">
                      Total Potential Reduction
                    </dt>
                    <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                      {monitoringRecommendationView === "cost"
                        ? formatCost(monitoringRecommendationData.totalPotentialReduction)
                        : formatDurationDays(monitoringRecommendationData.totalPotentialReduction)}
                    </dd>
                  </div>
                  <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2">
                    <dt className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">
                      {monitoringRecommendationView === "cost" ? "Avg Cost Efficiency" : "Avg Time Efficiency"}
                    </dt>
                    <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                      {monitoringRecommendationData.avgEfficiency != null
                        ? monitoringRecommendationView === "cost"
                          ? monitoringRecommendationData.avgEfficiency.toFixed(2)
                          : monitoringRecommendationData.avgEfficiency.toFixed(2)
                        : "—"}
                    </dd>
                  </div>
                </dl>

                {monitoringRecommendationData.recommendations.length === 0 ? (
                  <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                    {monitoringRecommendationView === "cost"
                      ? "No monitoring risks currently qualify for cost activation recommendations."
                      : "No monitoring risks currently qualify for schedule activation recommendations."}
                  </p>
                ) : (
                  <div className={DRIVER_TABLE_WRAP}>
                    <Table className={`${DRIVER_TABLE} min-w-[980px] text-[length:var(--ds-text-xs)]`}>
                      <TableHead>
                        <TableRow className={DRIVER_HEAD_ROW}>
                          <TableHeaderCell className={DRIVER_TH_LEFT}>Risk</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_LEFT}>Current Status</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>Potential Reduction</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>Mitigation Cost</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>
                            {monitoringRecommendationView === "cost" ? "Cost Efficiency" : "Time Efficiency"}
                          </TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_LEFT}>Data Confidence</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_LEFT}>Recommendation</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {monitoringRecommendationData.recommendations.map((row) => (
                          <TableRow key={row.riskId} className={DRIVER_ROW}>
                            <TableCell className={`${DRIVER_CELL_NAME} max-w-[min(220px,28vw)]`}>
                              <span className="block truncate" title={row.title}>
                                {row.title}
                              </span>
                            </TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{row.lifecycleLabel}</TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {monitoringRecommendationView === "cost"
                                ? formatCost(row.potentialReduction)
                                : formatDurationDays(row.potentialReduction)}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {row.mitigationCost != null ? formatCost(row.mitigationCost) : "—"}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {row.efficiency != null && Number.isFinite(row.efficiency)
                                ? row.efficiency.toFixed(2)
                                : "—"}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{row.confidence}</TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{row.recommendation}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
            <Card className={`${RUN_SECTION_CARD} mt-4`}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Simulation Input Audit (Per Risk)</CardTitle>
                <p className={`${CARD_DESC} mt-1`}>
                  Monte Carlo inputs as recorded on the last persisted run when available (
                  <code className="text-[length:var(--ds-text-xs)]">payload.inputs_used</code>
                  ), otherwise derived from the live register using{" "}
                  <code className="text-[length:var(--ds-text-xs)]">getEffectiveRiskInputs</code>. Flags use
                  current risk data plus the same engine function.
                </p>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 text-[length:var(--ds-text-sm)] sm:grid-cols-5">
                    <div>
                      <dt className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">Total rows</dt>
                      <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                        {simulationInputAuditSummary.total}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">Using pre</dt>
                      <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                        {simulationInputAuditSummary.countPre}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">Using post</dt>
                      <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                        {simulationInputAuditSummary.countPost}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">Status vs source mismatch</dt>
                      <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                        {simulationInputAuditSummary.countMismatched}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">Incomplete active post data</dt>
                      <dd className="m-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                        {simulationInputAuditSummary.countIncompleteMitigation}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <label className="flex cursor-pointer items-center gap-2 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                      <span className="whitespace-nowrap text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">
                        Filter by flag
                      </span>
                      <select
                        value={simulationInputAuditFlagFilter}
                        onChange={(e) =>
                          setSimulationInputAuditFlagFilter(e.target.value as SimulationInputAuditFlagFilter)
                        }
                        className="min-w-[12rem] rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2 py-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]"
                      >
                        <option value="all">All rows</option>
                        <option value="mismatchStatusVsSource">Status ≠ source (status≠src)</option>
                        <option value="postDataIncomplete">Incomplete post data (post gap)</option>
                        <option value="probabilityMismatch">Probability alignment (p align)</option>
                        <option value="none">No flags</option>
                      </select>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                      <input
                        type="checkbox"
                        checked={sortAuditByPotentialReduction}
                        onChange={(e) => setSortAuditByPotentialReduction(e.target.checked)}
                        className="rounded border-[var(--ds-border)]"
                      />
                      Sort by monitoring opportunity (desc)
                    </label>
                  </div>
                </div>
                {simulationInputAuditFlagFilter !== "all" && simulationInputAuditRowsRaw.length > 0 ? (
                  <p className="m-0 mb-3 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                    Showing {simulationInputAuditRows.length} of {simulationInputAuditRowsRaw.length} rows
                  </p>
                ) : null}
                {simulationInputAuditRowsRaw.length === 0 ? (
                  <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                    No risks to audit. Add risks or run a simulation.
                  </p>
                ) : simulationInputAuditRows.length === 0 ? (
                  <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                    No rows match the selected flag filter.
                  </p>
                ) : (
                  <div className={DRIVER_TABLE_WRAP}>
                    <Table className={`${DRIVER_TABLE} min-w-[1100px] text-[length:var(--ds-text-xs)]`}>
                      <TableHead>
                        <TableRow className={DRIVER_HEAD_ROW}>
                          <TableHeaderCell className={DRIVER_TH_LEFT}>Risk</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_LEFT}>Lifecycle</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_LEFT}>mitigationProfile</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>Source</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>p</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>Cost ML</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>Time ML</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_LEFT}>appliesTo</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>In</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_LEFT}>Flags</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>Δ (monitor)</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>Mit. cost</TableHeaderCell>
                          <TableHeaderCell className={DRIVER_TH_RIGHT}>Efficiency</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {simulationInputAuditRows.map((row) => (
                          <TableRow key={row.riskId} className={DRIVER_ROW}>
                            <TableCell className={`${DRIVER_CELL_NAME} max-w-[min(220px,28vw)]`}>
                              <span className="block truncate" title={row.title}>
                                {row.title}
                              </span>
                              {row.valuesFromSnapshot && (
                                <span className="mt-0.5 block text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                                  snapshot
                                </span>
                              )}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{row.lifecycleLabel}</TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{row.mitigationProfileStatusRaw}</TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>{row.sourceUsed}</TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {row.probabilityUsed.toFixed(4)}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>{formatCost(row.costMlUsed)}</TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>{row.timeMlUsed.toLocaleString()}</TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{row.appliesToDisplay}</TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {row.included ? (
                                <Badge status="success" variant="subtle">
                                  yes
                                </Badge>
                              ) : (
                                <Badge status="neutral" variant="subtle">
                                  no
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] px-3 py-1.5 align-top">
                              <div className="flex flex-wrap gap-1">
                                {row.flags.mismatchStatusVsSource && (
                                  <Badge status="danger" variant="subtle">
                                    status≠src
                                  </Badge>
                                )}
                                {row.flags.postDataIncomplete && (
                                  <Badge status="warning" variant="subtle">
                                    post gap
                                  </Badge>
                                )}
                                {row.flags.probabilityMismatch && (
                                  <Badge status="warning" variant="subtle">
                                    p align
                                  </Badge>
                                )}
                                {!row.flags.mismatchStatusVsSource &&
                                  !row.flags.postDataIncomplete &&
                                  !row.flags.probabilityMismatch && (
                                    <span className="text-[var(--ds-text-muted)]">—</span>
                                  )}
                              </div>
                              {row.reasonIfExcluded ? (
                                <span className="mt-1 block text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                                  {row.reasonIfExcluded}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {row.potentialReductionCost != null && Number.isFinite(row.potentialReductionCost)
                                ? formatCost(row.potentialReductionCost)
                                : "—"}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {row.mitigationCost != null ? formatCost(row.mitigationCost) : "—"}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {row.costEfficiency != null && Number.isFinite(row.costEfficiency)
                                ? row.costEfficiency.toFixed(2)
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </Section>

          {/* ——— SIMULATION ASSUMPTIONS: input quality checks for Monte Carlo readiness ——— */}
          <Section className={SECTION_GAP} aria-label="Simulation assumptions">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Simulation Assumptions</CardTitle>
                <p className={`${CARD_DESC} mt-1`}>Input quality checks for Monte Carlo readiness</p>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className="space-y-2.5">
              {/* Simulation Warnings: derived only from existing assumption counts. High = no variability > 3 or missing probabilities; Review = unchanged mitigation or min = max. */}
              {(() => {
                const c = simulationAssumptionCounts;
                const warnings: { severity: "High" | "Review"; message: string }[] = [];
                if (c.withNoVariability > 3) {
                  warnings.push({
                    severity: "High",
                    message: `${c.withNoVariability} risks have no variability and may reduce Monte Carlo realism`,
                  });
                }
                if (c.missingPreProbability > 0) {
                  warnings.push({
                    severity: "High",
                    message: `${c.missingPreProbability} risk${c.missingPreProbability !== 1 ? "s" : ""} ${c.missingPreProbability !== 1 ? "are" : "is"} missing pre-mitigation probability`,
                  });
                }
                if (c.missingPostProbability > 0) {
                  warnings.push({
                    severity: "High",
                    message: `${c.missingPostProbability} risk${c.missingPostProbability !== 1 ? "s" : ""} ${c.missingPostProbability !== 1 ? "are" : "is"} missing post-mitigation probability`,
                  });
                }
                if (c.unchangedMitigation > 0) {
                  warnings.push({
                    severity: "Review",
                    message: `${c.unchangedMitigation} risk${c.unchangedMitigation !== 1 ? "s" : ""} show unchanged mitigation assumptions`,
                  });
                }
                if (c.withMinEqualsMaxCost > 0) {
                  warnings.push({
                    severity: "Review",
                    message: `${c.withMinEqualsMaxCost} risk${c.withMinEqualsMaxCost !== 1 ? "s" : ""} ${c.withMinEqualsMaxCost !== 1 ? "have" : "has"} zero spread on cost`,
                  });
                }
                if (c.withMinEqualsMaxSchedule > 0) {
                  warnings.push({
                    severity: "Review",
                    message: `${c.withMinEqualsMaxSchedule} risk${c.withMinEqualsMaxSchedule !== 1 ? "s" : ""} ${c.withMinEqualsMaxSchedule !== 1 ? "have" : "has"} zero spread on schedule`,
                  });
                }
                return (
                  <Card variant="inset" className={RUN_INSET_CARD}>
                    <CardHeader className={RUN_CARD_HEADER}>
                      <CardTitle className={RUN_SUBCARD_TITLE}>Simulation Warnings</CardTitle>
                    </CardHeader>
                    <CardBody className={RUN_CARD_BODY}>
                      {warnings.length === 0 ? (
                        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)] m-0">
                          No material input warnings detected
                        </p>
                      ) : (
                        <Table className={DIAG_TABLE}>
                          <TableHead>
                            <TableRow className={DIAG_THEAD_ROW}>
                              <TableHeaderCell className={`${DIAG_WARN_TH_SEVERITY} pl-0`}>Severity</TableHeaderCell>
                              <TableHeaderCell className={`${DIAG_WARN_TH_MESSAGE} pr-0`}>Message</TableHeaderCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {warnings.map((w, i) => (
                              <TableRow key={i} className={DIAG_TBODY_ROW_LAST}>
                                <TableCell className={`${DIAG_TD_ALIGN_TOP} pl-0`}>
                                  <Badge status={w.severity === "High" ? "danger" : "warning"} variant="subtle">
                                    {w.severity}
                                  </Badge>
                                </TableCell>
                                <TableCell className={`${DIAG_TD_LEFT_PR2} pl-2 pr-0`}>{w.message}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardBody>
                  </Card>
                );
              })()}
              <Table className={DIAG_TABLE}>
                <TableHead>
                  <TableRow className={DIAG_THEAD_ROW}>
                    <TableHeaderCell className={`${DIAG_TH_LEFT_PR2} pl-0`}>Metric</TableHeaderCell>
                    <TableHeaderCell className={DIAG_TH_RIGHT_PX2}>Count</TableHeaderCell>
                    <TableHeaderCell className={`${DIAG_TH_LEFT_PL2} pr-0`}>Interpretation</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Total risks in run</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.totalInRun}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with cost range</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withCostRange}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with schedule range</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withScheduleRange}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with both ranges</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withBothRanges}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>Higher = stronger simulation readiness</TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with no variability</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withNoVariability}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>
                      {simulationAssumptionCounts.withNoVariability === 0
                        ? "Good"
                        : simulationAssumptionCounts.withNoVariability <= 3
                          ? "Review"
                          : "High — may reduce Monte Carlo realism"}
                    </TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with min = max cost</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withMinEqualsMaxCost}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>Zero spread on cost</TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with min = max schedule</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withMinEqualsMaxSchedule}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>Zero spread on schedule</TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with missing pre probability</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.missingPreProbability}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>
                      {simulationAssumptionCounts.missingPreProbability === 0 ? "Good" : "Data gap"}
                    </TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with missing post probability</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.missingPostProbability}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>
                      {simulationAssumptionCounts.missingPostProbability === 0 ? "Good" : "Data gap"}
                    </TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with unchanged mitigation</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.unchangedMitigation}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>
                      {simulationAssumptionCounts.unchangedMitigation === 0 ? "Good" : "Review mitigation assumptions"}
                    </TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with cost-only profile</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.costOnlyProfile}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                  </TableRow>
                  <TableRow className={DIAG_TBODY_ROW}>
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with schedule-only profile</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.scheduleOnlyProfile}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                  </TableRow>
                  <TableRow className="border-b-0">
                    <TableCell className={`${DIAG_TD_LEFT_PR2} pl-0`}>Risks with cost + schedule profile</TableCell>
                    <TableCell className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.costAndScheduleProfile}</TableCell>
                    <TableCell className={`${DIAG_TD_LEFT_PL2_MUTED} pr-0`}>—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
                </div>
              </CardBody>
            </Card>
          </Section>

          {/* ——— CONSISTENCY CHECKS: cross-section reconciliation ——— */}
          <Section className={SECTION_GAP} aria-label="Consistency checks">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Consistency Checks</CardTitle>
                <p className={`${CARD_DESC} mt-1`}>Cross-section reconciliation checks</p>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <Table className={DIAG_TABLE}>
                  <TableHead>
                    <TableRow className={DIAG_THEAD_ROW}>
                      <TableHeaderCell className={DIAG_TH_LEFT_PR2}>Check</TableHeaderCell>
                      <TableHeaderCell className={DIAG_TH_LEFT_PX2}>Result</TableHeaderCell>
                      <TableHeaderCell className={DIAG_TH_RIGHT_PL2_W20}>Status</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consistencyChecks.map((row, i) => (
                      <TableRow key={i} className={DIAG_TBODY_ROW_LAST}>
                        <TableCell className={DIAG_TD_LEFT_PR2}>{row.check}</TableCell>
                        <TableCell className={DIAG_TD_LEFT_PX2_MUTED}>{row.result}</TableCell>
                        <TableCell className="py-1.5 pl-2 text-right">
                          <Badge
                            status={row.status === "PASS" ? "success" : row.status === "WARN" ? "warning" : "danger"}
                            variant="subtle"
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </Section>

          {/* ——— ANALYSIS: why the results occur ——— */}
          {/* Simulation Drivers: cost from forwardExposure.results.neutral.topDrivers; schedule from current.risks by simMeanDays/expectedDays. */}
          <Section className={SECTION_GAP} aria-label="Simulation drivers">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Simulation Drivers</CardTitle>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className="space-y-3">
              <div>
                <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className={DRIVER_BLOCK_HEADING}>Cost Drivers</h3>
                  <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                    Contribution % = each row&apos;s share of total portfolio exposure (neutral baseline). Denominator = forward exposure engine neutral total.
                  </p>
                </div>
                <div className={DRIVER_TABLE_WRAP}>
                  <Table className={DRIVER_TABLE}>
                    <TableHead>
                      <TableRow className={DRIVER_HEAD_ROW}>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Rank</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_LEFT}>Risk name</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_LEFT}>Impact type</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_LEFT}>Category</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Total impact</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Contribution %</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Pre-mitigation</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Post-mitigation</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Delta</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {costDrivers.length === 0 ? (
                        <TableRow className="border-b-0">
                          <TableCell colSpan={9} className={DRIVER_EMPTY}>
                            No cost drivers. Run simulation to populate.
                          </TableCell>
                        </TableRow>
                      ) : (
                        costDrivers.map((d) => (
                          <TableRow key={d.riskId} className={DRIVER_ROW}>
                            <TableCell className={DRIVER_CELL_RANK}>{d.rank}</TableCell>
                            <TableCell className={DRIVER_CELL_NAME} title={d.riskName}>
                              {d.riskName}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{d.impactType}</TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{d.category}</TableCell>
                            <TableCell className={DRIVER_CELL_VALUE}>
                              {formatCost(d.total)}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC_MUTED}>
                              {d.contributionPct != null ? `${d.contributionPct.toFixed(1)}%` : "—"}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {formatCost(d.preMitigation)}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {formatCost(d.postMitigation)}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {formatCost(d.delta)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className={DRIVER_BLOCK_HEADING}>Schedule Drivers</h3>
                  <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                    Contribution % = each row&apos;s share of total schedule impact (sum of simMeanDays/expectedDays over risks in run).
                  </p>
                </div>
                <div className={DRIVER_TABLE_WRAP}>
                  <Table className={DRIVER_TABLE}>
                    <TableHead>
                      <TableRow className={DRIVER_HEAD_ROW}>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Rank</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_LEFT}>Risk name</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_LEFT}>Impact type</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_LEFT}>Category</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Total impact</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Contribution %</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Pre-mitigation</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Post-mitigation</TableHeaderCell>
                        <TableHeaderCell className={DRIVER_TH_RIGHT}>Delta</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scheduleDrivers.length === 0 ? (
                        <TableRow className="border-b-0">
                          <TableCell colSpan={9} className={DRIVER_EMPTY}>
                            No schedule drivers. Run simulation to populate.
                          </TableCell>
                        </TableRow>
                      ) : (
                        scheduleDrivers.map((d) => (
                          <TableRow key={d.riskId} className={DRIVER_ROW}>
                            <TableCell className={DRIVER_CELL_RANK}>{d.rank}</TableCell>
                            <TableCell className={DRIVER_CELL_NAME} title={d.riskName}>
                              {d.riskName}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{d.impactType}</TableCell>
                            <TableCell className={DRIVER_CELL_MUTED}>{d.category}</TableCell>
                            <TableCell className={DRIVER_CELL_VALUE}>
                              {formatDurationDays(d.totalDays)}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC_MUTED}>
                              {d.contributionPct != null ? `${d.contributionPct.toFixed(1)}%` : "—"}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {formatDurationDays(d.preMitigation)}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {formatDurationDays(d.postMitigation)}
                            </TableCell>
                            <TableCell className={DRIVER_CELL_NUMERIC}>
                              {d.delta < 0
                                ? `−${formatDurationDays(-d.delta)}`
                                : formatDurationDays(d.delta)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
                </div>
              </CardBody>
            </Card>
          </Section>

          {/* ——— EXPOSURE: project-level summary from forward exposure engine ——— */}
          {/* Baseline Exposure: answers "What exposure does the project currently carry?"
              All values from computePortfolioExposure (forward exposure engine); total = sum of risk curves. */}
          <Section className={SECTION_GAP} aria-label="Baseline exposure">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Baseline Exposure</CardTitle>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
              {/* Core exposure metrics from neutral baseline only. */}
              {(() => {
                const expectedTotal = forwardExposure.result?.total ?? 0;
                return (
                  <div className="mb-3 grid grid-cols-1 gap-3 text-[length:var(--ds-text-sm)] sm:grid-cols-2 lg:grid-cols-3">
                    <div className={H_TILE_WRAP}>
                      <div className={H_TILE_LABEL}>
                        Expected exposure
                      </div>
                      <div className={H_TILE_VALUE}>{formatCost(expectedTotal)}</div>
                      <p className={`${CARD_DESC} mt-0.5`}>Neutral baseline total (forward exposure engine)</p>
                    </div>
                  </div>
                );
              })()}
              {/* Concentration: from portfolio computeConcentration (top3Share, hhi). Top-5 share derived from topDrivers. */}
              {(() => {
                const total = selectedResult?.total ?? 0;
                const top5 = (selectedResult?.topDrivers ?? []).slice(0, 5);
                const top5Sum = top5.reduce((s, d) => s + d.total, 0);
                const top5SharePct = total > 0 ? (top5Sum / total) * 100 : 0;
                const top3SharePct = ((selectedResult?.concentration?.top3Share ?? 0) * 100);
                const hhi = selectedResult?.concentration?.hhi ?? 0;
                return (
                  <div className="mb-3">
                    <div className={H_SUBSECTION_TITLE}>Exposure concentration</div>
                    <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 text-[length:var(--ds-text-sm)] sm:grid-cols-3">
                      <div>
                        <dt className="font-normal text-[var(--ds-text-muted)]">Top 3 share</dt>
                        <dd className="mt-0 font-medium tabular-nums text-[var(--ds-text-primary)]">{top3SharePct.toFixed(1)}%</dd>
                      </div>
                      <div>
                        <dt className="font-normal text-[var(--ds-text-muted)]">Top 5 share</dt>
                        <dd className="mt-0 font-medium tabular-nums text-[var(--ds-text-primary)]">{top5SharePct.toFixed(1)}%</dd>
                      </div>
                      <div>
                        <dt className="font-normal text-[var(--ds-text-muted)]">HHI</dt>
                        <dd className="mt-0 font-medium tabular-nums text-[var(--ds-text-primary)]">{hhi.toFixed(3)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })()}
              {/* Top risk drivers contributing to exposure: from portfolio.topDrivers. */}
              <div className={H_TILE_WRAP}>
                <div className={H_SUBSECTION_TITLE}>
                  Top risk drivers (exposure)
                </div>
                <ul className={H_COMPACT_LIST}>
                  {(selectedResult?.topDrivers ?? []).slice(0, 5).map((d) => {
                    const title = risks.find((r) => r.id === d.riskId)?.title ?? d.riskId;
                    return (
                      <li key={d.riskId} className={H_COMPACT_LIST_ROW}>
                        <span className={H_COMPACT_LIST_NAME}>{title}</span>
                        <span className={H_COMPACT_LIST_VALUE}>{formatCost(d.total)}</span>
                      </li>
                    );
                  })}
                  {(selectedResult?.topDrivers ?? []).length === 0 && (
                    <li className={H_EMPTY_LIST_MUTED}>No drivers</li>
                  )}
                </ul>
              </div>
              </CardBody>
            </Card>
          </Section>

          {/* ——— FORWARD LOOKING: how exposure evolves over the project timeline ——— */}
          {/* Forecasting: exposure over time from forward exposure engine; pressure/early-warning from risk forecast. */}
          <Section className={SECTION_GAP} aria-label="Forecasting">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Forecasting</CardTitle>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
                <div className="space-y-3">
              {/* Exposure over time: real data from portfolio.monthlyTotal (forward exposure engine). Cost only. */}
              {selectedResult?.monthlyTotal && selectedResult.monthlyTotal.length > 0 && (
                <div>
                  <div className={H_SUBSECTION_TITLE}>
                    Cost exposure over time
                  </div>
                  <p className={`${CARD_DESC} mb-1.5`}>
                    Source: forward exposure engine portfolio.monthlyTotal (sum of risk curves per month). Units: cost only.
                  </p>
                  <div className={DRIVER_TABLE_WRAP}>
                    <Table className={DIAG_TABLE}>
                      <TableHead>
                        <TableRow className={DRIVER_HEAD_ROW}>
                          <TableHeaderCell className={`px-2 py-1.5 text-left ${TABLE_TH_META}`}>
                            Month
                          </TableHeaderCell>
                          {selectedResult.monthlyTotal.slice(0, forwardExposure.horizonMonths).map((_, i) => (
                            <TableHeaderCell
                              key={i}
                              className={`px-2 py-1.5 text-right tabular-nums ${TABLE_TH_META}`}
                            >
                              {i + 1}
                            </TableHeaderCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow className="border-b-0">
                          <TableCell className="px-2 py-1.5 text-[var(--ds-text-secondary)]">Exposure</TableCell>
                          {selectedResult.monthlyTotal.slice(0, forwardExposure.horizonMonths).map((v, i) => (
                            <TableCell key={i} className="px-2 py-1.5 text-right tabular-nums text-[var(--ds-text-primary)]">
                              {formatCost(v)}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  {/* Peak exposure period: month index where monthly total is highest (1-based). */}
                  {(() => {
                    const monthly = selectedResult.monthlyTotal.slice(0, forwardExposure.horizonMonths);
                    let peakIdx = 0;
                    let peakVal = monthly[0] ?? 0;
                    for (let i = 1; i < monthly.length; i++) {
                      const v = monthly[i] ?? 0;
                      if (v > peakVal) {
                        peakVal = v;
                        peakIdx = i;
                      }
                    }
                    return (
                      <dl className="mt-1.5 grid grid-cols-1 gap-2 text-[length:var(--ds-text-sm)] sm:grid-cols-3 sm:gap-4">
                        <div>
                          <dt className="font-normal text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Peak exposure period</dt>
                          <dd className="mt-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">Month {peakIdx + 1}</dd>
                        </div>
                        <div>
                          <dt className="font-normal text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Peak value</dt>
                          <dd className="mt-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">{formatCost(peakVal)}</dd>
                        </div>
                      </dl>
                    );
                  })()}
                </div>
              )}
              {/* Placeholders for metrics not yet provided by engine. */}
              <div>
                <div className={H_SUBSECTION_TITLE}>
                  Planned metrics (engine)
                </div>
                <ul className="m-0 list-inside list-disc space-y-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                  <li>Exposure decay — TBD</li>
                  <li>Risk burn-down — TBD</li>
                </ul>
              </div>
              {/* Forward pressure and early warning: from risk forecast engine (validates risk trajectory). Separate data layer from exposure engine above. */}
              <div>
                <div className={H_SUBSECTION_TITLE}>
                  Pressure and trajectory
                </div>
                <p className={`${CARD_DESC} mb-2`}>
                  Source: risk forecast engine (composite score projection, EII, TTC). Not from exposure engine.
                </p>
                <dl className="m-0 grid grid-cols-2 gap-3 text-[length:var(--ds-text-sm)] sm:grid-cols-5 sm:gap-4">
                  <div>
                    <dt className="font-normal text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Forward pressure</dt>
                    <dd className="mt-0.5 font-semibold text-[var(--ds-text-primary)]">{meetingPressureLabel}</dd>
                  </div>
                  <div>
                    <dt className="font-normal text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Projected critical</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-[var(--ds-text-primary)]">{forwardPressure.projectedCriticalCount}</dd>
                  </div>
                  <div>
                    <dt className="font-normal text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Escalating</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-[var(--ds-text-primary)]">{momentumSummary.escalatingCount}</dd>
                  </div>
                  <div>
                    <dt className="font-normal text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Early warning</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-[var(--ds-text-primary)]">{earlyWarningCount}</dd>
                  </div>
                  <div>
                    <dt className="font-normal text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Median TTC</dt>
                    <dd className="mt-0.5 font-semibold text-[var(--ds-text-primary)]">{meetingMedianTtc != null ? meetingMedianTtc : "—"}</dd>
                  </div>
                </dl>
              </div>
                </div>
              </CardBody>
            </Card>
          </Section>

          {/* ——— DECISION SUPPORT: effect of mitigations ——— */}
          {/* Mitigation Results: pre/post exposure and reduction from cost drivers (validates mitigation logic). */}
          <Section className={SECTION_GAP} aria-label="Mitigation results">
            <Card className={RUN_SECTION_CARD}>
              <CardHeader className={RUN_CARD_HEADER}>
                <CardTitle className={RUN_CARD_TITLE}>Mitigation Results</CardTitle>
              </CardHeader>
              <CardBody className={RUN_CARD_BODY}>
              {costDrivers.length > 0 ? (
                (() => {
                  const preTotal = costDrivers.reduce((s, d) => s + d.preMitigation, 0);
                  const postTotal = costDrivers.reduce((s, d) => s + d.postMitigation, 0);
                  const reduction = preTotal - postTotal;
                  const reductionPct = preTotal > 0 ? (reduction / preTotal) * 100 : 0;
                  const topByReduction = [...costDrivers].filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
                  return (
                    <>
                      <p className={`${CARD_DESC} mb-3`}>
                        Cost exposure only (schedule not included). Pre = sum(cost drivers preMitigation), post = sum(cost drivers postMitigation). Validates mitigation impact on cost.
                      </p>
                      <dl className="mb-3 grid grid-cols-2 gap-3 text-[length:var(--ds-text-sm)] sm:grid-cols-4 sm:gap-4">
                        <div className={H_TILE_WRAP}>
                          <dt className={H_TILE_LABEL}>Pre-mitigation cost exposure</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-[var(--ds-text-primary)]">{formatCost(preTotal)}</dd>
                        </div>
                        <div className={H_TILE_WRAP}>
                          <dt className={H_TILE_LABEL}>Post-mitigation cost exposure</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-[var(--ds-text-primary)]">{formatCost(postTotal)}</dd>
                        </div>
                        <div className={H_TILE_WRAP}>
                          <dt className={H_TILE_LABEL}>Cost exposure reduction</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-[var(--ds-text-primary)]">{formatCost(reduction)}</dd>
                        </div>
                        <div className={H_TILE_WRAP}>
                          <dt className={H_TILE_LABEL}>Reduction %</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-[var(--ds-text-primary)]">{preTotal > 0 ? `${reductionPct.toFixed(1)}%` : "—"}</dd>
                        </div>
                      </dl>
                      {topByReduction.length > 0 && (
                        <div>
                          <div className={H_SUBSECTION_TITLE}>
                            Top mitigations by cost exposure reduction
                          </div>
                          <ul className={H_COMPACT_LIST}>
                            {topByReduction.map((d) => (
                              <li key={d.riskId} className={H_COMPACT_LIST_ROW}>
                                <span className={H_COMPACT_LIST_NAME}>{d.riskName}</span>
                                <span className={H_COMPACT_LIST_VALUE}>{formatCost(d.delta)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <p className={H_EMPTY_MUTED}>
                  No cost drivers. Run simulation to see mitigation results.
                </p>
              )}
              </CardBody>
            </Card>
          </Section>

          {/* Mitigation leverage (ROI): API; requires simulation snapshot. */}
          {snapshotNeutral ? (
            <div className={SECTION_GAP}>
              <MitigationOptimisationPanel
                risks={risks}
                neutralSnapshot={current ?? null}
                targetPercent={targetPercent}
                targetScheduleDays={targetScheduleDays}
              />
            </div>
          ) : (
            <p className={`${SMALL_GAP} text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]`}>
              Run simulation to see mitigation leverage.
            </p>
          )}

        </>
      )}
    </main>
  );
}
