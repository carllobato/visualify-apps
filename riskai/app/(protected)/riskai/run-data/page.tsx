"use client";

import { useMemo, useEffect, useState } from "react";
import { Button } from "@visualify/design-system";
import { useRiskRegister } from "@/store/risk-register.store";
import { listRisks } from "@/lib/db/risks";
import { portfolioMomentumSummary } from "@/domain/risk/risk.logic";
import {
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
import { appliesToExcludesCost, appliesToExcludesTime } from "@/domain/risk/riskFieldSemantics";

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
 * 4. SIMULATION ASSUMPTIONS — Input quality checks for Monte Carlo readiness
 * 5. CONSISTENCY CHECKS — Cross-section reconciliation checks
 * 6. ANALYSIS — What risks drive the results? (Cost Drivers, Schedule Drivers)
 * 7. EXPOSURE — What exposure does the project carry? (Baseline Exposure)
 * 8. FORWARD LOOKING — How might exposure evolve? (Forecasting)
 * 9. DECISION SUPPORT — What effect do mitigations have? (Mitigation Results, Mitigation Leverage)
 *
 * Every section supports validation of the data model and calculations; no decorative charts.
 */
export default function RunDataPage({ projectId, projectName }: RunDataPageProps = {}) {
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  useEffect(() => {
    if (!projectId || !setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "Run Data", end: null });
    return () => setPageHeaderExtras(null);
  }, [projectId, setPageHeaderExtras]);
  const { risks, simulation, runSimulation, clearSimulationHistory, hasDraftRisks, invalidRunnableCount, riskForecastsById, forwardPressure, setRisks, hydrateSimulationFromDbSnapshot } = useRiskRegister();
  const [runBlockedInvalidCount, setRunBlockedInvalidCount] = useState<number | null>(null);
  const [snapshotPersistWarning, setSnapshotPersistWarning] = useState<string | null>(null);
  const [lockedRunLoadWarning, setLockedRunLoadWarning] = useState<string | null>(null);
  const [loadingLockedRun, setLoadingLockedRun] = useState(false);
  const [lockedRunPinned, setLockedRunPinned] = useState(false);
  const [triggeredBy, setTriggeredBy] = useState<string | null>(null);
  const [reportingSnapshotRow, setReportingSnapshotRow] = useState<SimulationSnapshotRow>(null);
  const [reportingLockedByLabel, setReportingLockedByLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    listRisks(projectId)
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

  /** Risk Register Snapshot: total/status from full register so closed/archived are included (snapshot only contains risks in run, which excludes closed/archived). Risk mix and "in run" count still use snapshot. */
  const snapshotRiskStats = useMemo(() => {
    const list = current?.risks ?? [];
    const totalInRun = list.length;
    const snapshotIds = new Set(list.map((r) => r.id));
    const statusCounts = {
      draft: 0,
      open: 0,
      monitoring: 0,
      mitigating: 0,
      closed: 0,
      archived: 0,
    };
    const normalizedStatus = (s: string | undefined): keyof typeof statusCounts | null => {
      if (!s || typeof s !== "string") return null;
      const lower = s.toLowerCase();
      return lower in statusCounts ? (lower as keyof typeof statusCounts) : null;
    };
    // Status counts from full risk register (so closed/archived are not ignored)
    for (const r of risks) {
      const status = normalizedStatus(r.status);
      if (status) statusCounts[status] += 1;
    }
    const total = risks.length;
    const risksInRun = risks.filter((r) => snapshotIds.has(r.id));
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
  }, [current?.risks, risks]);

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
    const list = current?.risks ?? [];
    const snapshotIds = new Set(list.map((r) => r.id));
    const risksInRun = risks.filter((r) => snapshotIds.has(r.id));
    return computeSimulationAssumptionCounts(risksInRun);
  }, [current?.risks, risks]);

  /** Consistency Checks: cross-section reconciliation. Uses existing page data only; no re-run. */
  const CONSISTENCY_EPS_COST = 1;
  const CONSISTENCY_EPS_RATIO = 0.01;
  const consistencyChecks = useMemo((): { check: string; result: string; status: "PASS" | "WARN" | "FAIL" }[] => {
    const statusCounts = snapshotRiskStats.statusCounts;
    const totalRisks = snapshotRiskStats.total;
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

    // 3. Post-mitigation risk mix reconciles
    if (totalRisks === 0) {
      checks.push({ check: "Post-mitigation risk mix reconciles", result: "Not enough data", status: "WARN" });
    } else if (postMix === totalRisks) {
      checks.push({
        check: "Post-mitigation risk mix reconciles",
        result: `${snapshotRiskStats.riskMix.post.both} + ${snapshotRiskStats.riskMix.post.costOnly} + ${snapshotRiskStats.riskMix.post.timeOnly} = ${totalRisks}`,
        status: "PASS",
      });
    } else {
      checks.push({
        check: "Post-mitigation risk mix reconciles",
        result: `${postMix} ≠ ${totalRisks}`,
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

    // 8. Top 5 share is not less than Top 3 share
    const total = selectedResult?.total ?? 0;
    const top5 = (selectedResult?.topDrivers ?? []).slice(0, 5);
    const top5Sum = top5.reduce((s, d) => s + d.total, 0);
    const top5SharePct = total > 0 ? (top5Sum / total) * 100 : 0;
    const top3SharePct = ((selectedResult?.concentration?.top3Share ?? 0) * 100);
    if (total <= 0) {
      checks.push({ check: "Top 5 share ≥ Top 3 share", result: "Not enough data", status: "WARN" });
    } else if (top5SharePct >= top3SharePct - CONSISTENCY_EPS_RATIO) {
      checks.push({
        check: "Top 5 share ≥ Top 3 share",
        result: `${top5SharePct.toFixed(1)}% ≥ ${top3SharePct.toFixed(1)}%`,
        status: "PASS",
      });
    } else {
      checks.push({
        check: "Top 5 share ≥ Top 3 share",
        result: `${top5SharePct.toFixed(1)}% < ${top3SharePct.toFixed(1)}%`,
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

  const SECTION_SHELL_BASE =
    "rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden";
  const SECTION_SHELL_MT6 = `mt-6 ${SECTION_SHELL_BASE}`;
  const SECTION_SHELL_MT8 = `mt-8 ${SECTION_SHELL_BASE}`;
  const SECTION_HEADER =
    "text-base font-semibold text-neutral-800 dark:text-neutral-200 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 m-0";
  const SECTION_BODY = "p-4";
  const PAGE_CONTAINER = "p-6";
  const PAGE_TITLE = "text-2xl font-semibold m-0";
  const PAGE_ACTION_ROW = "mt-6 flex flex-wrap items-center gap-3";
  const STATUS_TEXT_MUTED = "text-sm text-amber-600 dark:text-amber-400";
  const STATUS_TEXT_WARN_ALERT = "text-sm text-amber-700 dark:text-amber-300 font-medium";
  const STATUS_TEXT_FAIL_ALERT_WIDE = "text-sm text-red-700 dark:text-red-300 font-medium max-w-2xl";
  const STATUS_TEXT_WARN_ALERT_WIDE = "text-sm text-amber-700 dark:text-amber-300 font-medium max-w-2xl";
  const EMPTY_STATE_TEXT = "mt-8 text-neutral-600 dark:text-neutral-400";
  const STATUS_PILL_BASE = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";
  const STATUS_PILL_SUCCESS = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200";
  const STATUS_PILL_WARN = "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200";
  const STATUS_PILL_NEUTRAL = "bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-200";
  const STATUS_TEXT_SUCCESS = "text-emerald-700 dark:text-emerald-400 font-medium";
  const STATUS_TEXT_WARN = "text-amber-700 dark:text-amber-400 font-medium";
  const STATUS_TEXT_FAIL = "text-red-700 dark:text-red-400 font-medium";
  const META_GRID_4 = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm";
  const META_GROUP = "space-y-3";
  const META_GROUP_TITLE = "text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide";
  const META_DL = "space-y-2 m-0";
  const META_DT = "text-neutral-500 dark:text-neutral-400 font-normal";
  const META_DD = "mt-0.5 text-neutral-800 dark:text-neutral-200";
  const META_DD_MONO_BREAKALL = "mt-0.5 font-mono text-neutral-800 dark:text-neutral-200 break-all";
  const META_DD_TRUNCATE = "mt-0.5 text-neutral-800 dark:text-neutral-200 truncate";
  const META_INLINE_NOTE = "text-neutral-500 dark:text-neutral-400 font-normal ml-1";
  const DIST_META_ROW = "flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 mb-3";
  const DIST_PERCENTILES_GRID = "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-3 text-sm m-0";
  const DIST_STATS_GRID = "grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs m-0 border-t border-neutral-200 dark:border-neutral-700 pt-3";
  const DIST_DT = "text-neutral-500 dark:text-neutral-400 font-normal";
  const DIST_DD = "mt-0.5 text-neutral-800 dark:text-neutral-200 m-0";
  const DIST_HELPER_TEXT = "text-xs text-neutral-500 dark:text-neutral-400 mt-2 mb-3";
  const DIAG_TABLE = "w-full text-sm border-collapse";
  const DIAG_THEAD_ROW = "border-b border-neutral-200 dark:border-neutral-700";
  const DIAG_TBODY_ROW = "border-b border-neutral-100 dark:border-neutral-700/50";
  const DIAG_TBODY_ROW_LAST = `${DIAG_TBODY_ROW} last:border-b-0`;
  const DIAG_TH_LEFT_PR2 = "text-left py-1.5 pr-2 font-medium text-neutral-500 dark:text-neutral-400";
  const DIAG_TH_LEFT_PX2 = "text-left py-1.5 px-2 font-medium text-neutral-500 dark:text-neutral-400";
  const DIAG_TH_LEFT_PL2 = "text-left py-1.5 pl-2 font-medium text-neutral-500 dark:text-neutral-400";
  const DIAG_TH_RIGHT_PX2 = "text-right py-1.5 px-2 font-medium text-neutral-500 dark:text-neutral-400";
  const DIAG_TH_RIGHT_PL2_W20 = "text-right py-1.5 pl-2 font-medium text-neutral-500 dark:text-neutral-400 w-20";
  const DIAG_TD_LEFT_PR2 = "py-1.5 pr-2 text-neutral-700 dark:text-neutral-300";
  const DIAG_TD_LEFT_PX2_MUTED = "py-1.5 px-2 text-neutral-600 dark:text-neutral-400 tabular-nums";
  const DIAG_TD_LEFT_PL2_MUTED = "py-1.5 pl-2 text-neutral-500 dark:text-neutral-400";
  const DIAG_TD_RIGHT_PX2_NUM = "text-right py-1.5 px-2 tabular-nums";
  const DIAG_TD_ALIGN_TOP = "py-1.5 pr-2 align-top";
  const DIAG_WARN_TH_SEVERITY = "text-left py-1 pr-2 font-medium text-neutral-500 dark:text-neutral-400 w-20";
  const DIAG_WARN_TH_MESSAGE = "text-left py-1 pl-2 font-medium text-neutral-500 dark:text-neutral-400";
  const DRIVER_TABLE_WRAP = "overflow-x-auto rounded border border-neutral-200 dark:border-neutral-700 bg-[var(--background)]";
  const DRIVER_TABLE = "w-full text-sm border-collapse";
  const DRIVER_HEAD_ROW = "border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/50";
  const DRIVER_TH_LEFT = "text-left py-2 px-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide";
  const DRIVER_TH_RIGHT = "text-right py-2 px-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide";
  const DRIVER_ROW = "border-b border-neutral-100 dark:border-neutral-700/50 last:border-b-0";
  const DRIVER_CELL_RANK = "py-1.5 px-3 text-neutral-600 dark:text-neutral-400 tabular-nums";
  const DRIVER_CELL_NAME = "py-1.5 px-3 text-neutral-800 dark:text-neutral-200 max-w-[200px] truncate";
  const DRIVER_CELL_MUTED = "py-1.5 px-3 text-neutral-500 dark:text-neutral-400";
  const DRIVER_CELL_VALUE = "py-1.5 px-3 text-right text-neutral-800 dark:text-neutral-200 font-medium tabular-nums";
  const DRIVER_CELL_NUMERIC_MUTED = "py-1.5 px-3 text-right text-neutral-500 dark:text-neutral-400 tabular-nums";
  const DRIVER_CELL_NUMERIC = "py-1.5 px-3 text-right text-neutral-700 dark:text-neutral-300 tabular-nums";
  const DRIVER_EMPTY = "py-3 px-3 text-sm text-neutral-500 dark:text-neutral-400";
  const H_TILE_WRAP = "rounded border border-neutral-200 dark:border-neutral-700 bg-[var(--background)] p-3";
  const H_TILE_LABEL = "text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide";
  const H_TILE_VALUE = "mt-0.5 text-base font-semibold tabular-nums";
  const H_SUBSECTION_TITLE = "text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2";
  const H_COMPACT_LIST = "space-y-2 text-sm m-0";
  const H_COMPACT_LIST_ROW = "flex justify-between items-baseline gap-2";
  const H_COMPACT_LIST_NAME = "text-neutral-800 dark:text-neutral-200 truncate";
  const H_COMPACT_LIST_VALUE = "font-medium text-neutral-700 dark:text-neutral-300 shrink-0 tabular-nums";
  const H_EMPTY_MUTED = "text-sm text-neutral-500 dark:text-neutral-400 m-0";
  const H_EMPTY_LIST_MUTED = "text-neutral-500 dark:text-neutral-400";

  // Small sub-panel / card pattern reused in a few sections.
  const SUB_PANEL_SHELL_BASE =
    "border border-neutral-200 dark:border-neutral-700 bg-[var(--background)] overflow-hidden";
  const SUB_PANEL_HEADER_BASE =
    "text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-3 py-2 border-b border-neutral-200 dark:border-neutral-700";
  const SUB_PANEL_BODY = "p-3";

  return (
    <main className={PAGE_CONTAINER}>
      <h1 className={PAGE_TITLE}>Run Data</h1>

      <div className={PAGE_ACTION_ROW}>
        <Button
          type="button"
          onClick={async () => {
            setSnapshotPersistWarning(null);
            setLockedRunPinned(false);
            const result = await runSimulation(10000, projectId ?? undefined);
            if (!result.ran && result.blockReason === "invalid") {
              setRunBlockedInvalidCount(result.invalidCount);
              return;
            }
            if (result.ran && result.snapshotPersistWarning) {
              setSnapshotPersistWarning(result.snapshotPersistWarning);
            }
          }}
          disabled={hasDraftRisks || invalidRunnableCount > 0}
          variant="secondary"
        >
          Run Simulation
        </Button>
        <Button
          type="button"
          onClick={() => {
            setLockedRunPinned(false);
            clearSimulationHistory();
          }}
          variant="secondary"
        >
          Clear History
        </Button>
        <Button
          type="button"
          onClick={async () => {
            setLockedRunLoadWarning(null);
            setLoadingLockedRun(true);
            try {
              const row = await getLatestLockedDbSnapshot(projectId ?? undefined);
              if (!row) {
                setLockedRunLoadWarning("No locked reporting run found for this project.");
                return;
              }
              hydrateSimulationFromDbSnapshot(row);
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
        {hasDraftRisks && (
          <p className={STATUS_TEXT_MUTED} role="status">
            Review and save all draft risks in the Risk Register before running simulation.
          </p>
        )}
        {invalidRunnableCount > 0 && (
          <p className={STATUS_TEXT_MUTED} role="status">
            Fix {invalidRunnableCount} risk{invalidRunnableCount !== 1 ? "s" : ""} to run simulation.
          </p>
        )}
        {runBlockedInvalidCount != null && runBlockedInvalidCount > 0 && (
          <p className={STATUS_TEXT_WARN_ALERT} role="alert">
            Simulation blocked: fix {runBlockedInvalidCount} risk{runBlockedInvalidCount !== 1 ? "s" : ""} to run simulation.
          </p>
        )}
        {snapshotPersistWarning && (
          <p className={STATUS_TEXT_FAIL_ALERT_WIDE} role="alert">
            Could not save run to the database: {snapshotPersistWarning}
          </p>
        )}
        {lockedRunLoadWarning && (
          <p className={STATUS_TEXT_WARN_ALERT_WIDE} role="alert">
            {lockedRunLoadWarning}
          </p>
        )}
      </div>


      {!current ? (
        <p className={EMPTY_STATE_TEXT}>
          No simulation run yet. Add risks in the Risk Register, then run a simulation.
        </p>
      ) : (
        <>
          {/* ——— BASELINE: inputs that were run ——— */}
          {/* Run Metadata: run identity, config, status. Source: current (simulation run snapshot). */}
          <section
            className={SECTION_SHELL_MT8}
            aria-label="Run metadata"
          >
            <h2 className={SECTION_HEADER}>
              Run Metadata
            </h2>
            <div className={SECTION_BODY}>
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
                        <span
                          className={`${STATUS_PILL_BASE} ${
                            runStatus === "Complete"
                              ? STATUS_PILL_SUCCESS
                              : STATUS_PILL_WARN
                          }`}
                        >
                          {runStatus}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className={META_DT}>Run Data Completeness</dt>
                      <dd className="mt-0.5">
                        <span
                          className={`${STATUS_PILL_BASE} ${
                            runDataCompleteness === "Complete"
                              ? STATUS_PILL_SUCCESS
                              : STATUS_PILL_NEUTRAL
                          }`}
                        >
                          {runDataCompleteness}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className={META_DT}>Reporting version</dt>
                      <dd className="mt-0.5">
                        {reportingDbRow?.locked_for_reporting ? (
                          <span className={`${STATUS_PILL_BASE} ${STATUS_PILL_SUCCESS}`}>
                            Yes
                          </span>
                        ) : (
                          <span className="text-neutral-500 dark:text-neutral-400">No</span>
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
                              <span className="text-neutral-500 dark:text-neutral-400">Not set</span>
                            );
                          }
                          const label = formatReportMonthLabel(reportingDbRow.report_month);
                          return label !== "—" ? (
                            label
                          ) : (
                            <span className="text-neutral-500 dark:text-neutral-400">Not set</span>
                          );
                        })()}
                      </dd>
                    </div>
                    <div>
                      <dt className={META_DT}>Locked by</dt>
                      <dd className={META_DD}>
                        {(reportingLockedByLabel ?? reportingDbRow?.locked_by?.trim()) || (
                          <span className="text-neutral-500 dark:text-neutral-400">Not set</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className={META_DT}>Locked on</dt>
                      <dd className={META_DD}>
                        {reportingDbRow?.locked_at ? (
                          formatRunTimestamp(reportingDbRow.locked_at)
                        ) : (
                          <span className="text-neutral-500 dark:text-neutral-400">Not set</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className={META_DT}>Reporting note</dt>
                      <dd className={META_DD}>
                        {reportingDbRow?.lock_note?.trim() || (
                          <span className="text-neutral-500 dark:text-neutral-400">Not available</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </section>

          {/* RUN VERDICT: single summary from Simulation Warnings + Consistency Checks. Internal diagnostic only. */}
          <section
            className={SECTION_SHELL_MT6}
            aria-label="Run verdict"
          >
            <h2 className={SECTION_HEADER}>
              RUN VERDICT
            </h2>
            <div className={`${SECTION_BODY} space-y-2`}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={
                    runVerdict.status === "Healthy run"
                      ? STATUS_TEXT_SUCCESS
                      : runVerdict.status === "Valid with warnings"
                        ? STATUS_TEXT_WARN
                        : STATUS_TEXT_FAIL
                  }
                >
                  {runVerdict.status}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">—</span>
                <span className="text-sm text-neutral-700 dark:text-neutral-300">{runVerdict.summary}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                <span>High warnings: {runVerdict.counts.highWarnings}</span>
                <span>Review warnings: {runVerdict.counts.reviewWarnings}</span>
                <span>PASS checks: {runVerdict.counts.passCount}</span>
                <span>WARN checks: {runVerdict.counts.warnCount}</span>
                <span>FAIL checks: {runVerdict.counts.failCount}</span>
              </div>
            </div>
          </section>

          {/* Risk Register Snapshot: risk set that fed the run (current.risks). Counts and mix validate input. */}
          <section
            className={SECTION_SHELL_MT6}
            aria-label="Risk register snapshot"
          >
            <h2 className={SECTION_HEADER}>
              Risk Register Snapshot
            </h2>
            <div className={SECTION_BODY}>
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
            </div>
          </section>

          {/* ——— SIMULATION: Monte Carlo outputs ——— */}
          {/* Cost Distribution: percentiles from neutral run. Source: neutralMc.costSamples or snapshot summary. */}
          <section className={SECTION_SHELL_MT6}>
            <h2 className={SECTION_HEADER}>
              Cost Distribution
            </h2>
            <div className={SECTION_BODY}>
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
            </div>
          </section>

          {/* Schedule Distribution: percentiles from neutral run. Source: neutralMc.timeSamples or snapshot summary. */}
          <section className={SECTION_SHELL_MT6}>
            <h2 className={SECTION_HEADER}>
              Schedule Distribution
            </h2>
            <div className={SECTION_BODY}>
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
            </div>
          </section>

          {/* ——— SIMULATION INTEGRITY: Monte Carlo distribution diagnostics ——— */}
          <section
            className={SECTION_SHELL_MT6}
            aria-label="Simulation integrity"
          >
            <h2 className={SECTION_HEADER}>
              Simulation Integrity
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 px-4 pt-2 m-0">
              Monte Carlo distribution diagnostics
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 px-4 pt-0.5 pb-2 m-0">
              Kurtosis is raw (normal ≈ 3), not excess kurtosis. CV = std dev / mean.
            </p>
            <div className={`${SECTION_BODY} grid grid-cols-1 lg:grid-cols-2 gap-4`}>
              {/* Cost distribution diagnostics */}
              <div className={`rounded-lg ${SUB_PANEL_SHELL_BASE}`}>
                <h3 className={`${SUB_PANEL_HEADER_BASE} m-0`}>
                  Cost distribution diagnostics
                </h3>
                <div className={SUB_PANEL_BODY}>
                  {simulationIntegrity.cost ? (
                    <table className={DIAG_TABLE}>
                      <thead>
                        <tr className={DIAG_THEAD_ROW}>
                          <th className={DIAG_TH_LEFT_PR2}>Metric</th>
                          <th className={DIAG_TH_RIGHT_PX2}>Value</th>
                          <th className={DIAG_TH_LEFT_PL2}>Interpretation</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Sample size</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationIntegrity.cost.n.toLocaleString()}</td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>{simulationIntegrity.cost.sampleSizeInterpretation}</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Mean</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.mean != null && Number.isFinite(simulationIntegrity.cost.mean) ? formatCost(simulationIntegrity.cost.mean) : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Variance</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.variance != null && Number.isFinite(simulationIntegrity.cost.variance)
                              ? simulationIntegrity.cost.variance.toLocaleString(undefined, { maximumFractionDigits: 0 })
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Standard deviation</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.stdDev != null && Number.isFinite(simulationIntegrity.cost.stdDev) ? formatCost(simulationIntegrity.cost.stdDev) : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Coefficient of variation (CV)</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.cv != null && Number.isFinite(simulationIntegrity.cost.cv)
                              ? simulationIntegrity.cost.cv.toFixed(2)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>{simulationIntegrity.cost.cvInterpretation}</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Skewness</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.skewness != null && Number.isFinite(simulationIntegrity.cost.skewness)
                              ? simulationIntegrity.cost.skewness.toFixed(2)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>{simulationIntegrity.cost.skewnessInterpretation}</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Kurtosis (raw, normal ≈ 3)</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.kurtosis != null && Number.isFinite(simulationIntegrity.cost.kurtosis)
                              ? simulationIntegrity.cost.kurtosis.toFixed(2)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>{simulationIntegrity.cost.kurtosisInterpretation}</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Minimum</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.min != null && Number.isFinite(simulationIntegrity.cost.min) ? formatCost(simulationIntegrity.cost.min) : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                        <tr>
                          <td className={DIAG_TD_LEFT_PR2}>Maximum</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.cost.max != null && Number.isFinite(simulationIntegrity.cost.max) ? formatCost(simulationIntegrity.cost.max) : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 m-0">
                      Diagnostics unavailable — sample data not stored for this run.
                    </p>
                  )}
                </div>
              </div>

              {/* Schedule distribution diagnostics */}
              <div className={`rounded-lg ${SUB_PANEL_SHELL_BASE}`}>
                <h3 className={`${SUB_PANEL_HEADER_BASE} m-0`}>
                  Schedule distribution diagnostics
                </h3>
                <div className={SUB_PANEL_BODY}>
                  {simulationIntegrity.schedule ? (
                    <table className={DIAG_TABLE}>
                      <thead>
                        <tr className={DIAG_THEAD_ROW}>
                          <th className={DIAG_TH_LEFT_PR2}>Metric</th>
                          <th className={DIAG_TH_RIGHT_PX2}>Value</th>
                          <th className={DIAG_TH_LEFT_PL2}>Interpretation</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Sample size</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationIntegrity.schedule.n.toLocaleString()}</td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>{simulationIntegrity.schedule.sampleSizeInterpretation}</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Mean</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.mean != null && Number.isFinite(simulationIntegrity.schedule.mean)
                              ? formatDurationDays(simulationIntegrity.schedule.mean)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Variance</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.variance != null && Number.isFinite(simulationIntegrity.schedule.variance)
                              ? simulationIntegrity.schedule.variance.toLocaleString(undefined, { maximumFractionDigits: 1 })
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Standard deviation</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.stdDev != null && Number.isFinite(simulationIntegrity.schedule.stdDev)
                              ? formatDurationDays(simulationIntegrity.schedule.stdDev)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Coefficient of variation (CV)</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.cv != null && Number.isFinite(simulationIntegrity.schedule.cv)
                              ? simulationIntegrity.schedule.cv.toFixed(2)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>{simulationIntegrity.schedule.cvInterpretation}</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Skewness</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.skewness != null && Number.isFinite(simulationIntegrity.schedule.skewness)
                              ? simulationIntegrity.schedule.skewness.toFixed(2)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>{simulationIntegrity.schedule.skewnessInterpretation}</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Kurtosis (raw, normal ≈ 3)</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.kurtosis != null && Number.isFinite(simulationIntegrity.schedule.kurtosis)
                              ? simulationIntegrity.schedule.kurtosis.toFixed(2)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>{simulationIntegrity.schedule.kurtosisInterpretation}</td>
                        </tr>
                        <tr className={DIAG_TBODY_ROW}>
                          <td className={DIAG_TD_LEFT_PR2}>Minimum</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.min != null && Number.isFinite(simulationIntegrity.schedule.min)
                              ? formatDurationDays(simulationIntegrity.schedule.min)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                        <tr>
                          <td className={DIAG_TD_LEFT_PR2}>Maximum</td>
                          <td className={DIAG_TD_RIGHT_PX2_NUM}>
                            {simulationIntegrity.schedule.max != null && Number.isFinite(simulationIntegrity.schedule.max)
                              ? formatDurationDays(simulationIntegrity.schedule.max)
                              : "—"}
                          </td>
                          <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 m-0">
                      Diagnostics unavailable — sample data not stored for this run.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ——— SIMULATION ASSUMPTIONS: input quality checks for Monte Carlo readiness ——— */}
          <section
            className={SECTION_SHELL_MT6}
            aria-label="Simulation assumptions"
          >
            <h2 className={SECTION_HEADER}>
              Simulation Assumptions
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 px-4 pt-2 m-0">
              Input quality checks for Monte Carlo readiness
            </p>
            <div className={`${SECTION_BODY} space-y-4`}>
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
                  <div className={`rounded ${SUB_PANEL_SHELL_BASE}`}>
                    <div className={SUB_PANEL_HEADER_BASE}>
                      Simulation Warnings
                    </div>
                    <div className={SUB_PANEL_BODY}>
                      {warnings.length === 0 ? (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0">
                          No material input warnings detected
                        </p>
                      ) : (
                        <table className={DIAG_TABLE}>
                          <thead>
                            <tr className={DIAG_THEAD_ROW}>
                              <th className={DIAG_WARN_TH_SEVERITY}>Severity</th>
                              <th className={DIAG_WARN_TH_MESSAGE}>Message</th>
                            </tr>
                          </thead>
                          <tbody>
                            {warnings.map((w, i) => (
                              <tr key={i} className={DIAG_TBODY_ROW_LAST}>
                                <td className={DIAG_TD_ALIGN_TOP}>
                                  <span
                                    className={
                                      w.severity === "High"
                                        ? STATUS_TEXT_FAIL
                                        : STATUS_TEXT_WARN
                                    }
                                  >
                                    {w.severity}
                                  </span>
                                </td>
                                <td className={`${DIAG_TD_LEFT_PR2} pl-2 pr-0`}>{w.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                );
              })()}
              <table className={DIAG_TABLE}>
                <thead>
                  <tr className={DIAG_THEAD_ROW}>
                    <th className={DIAG_TH_LEFT_PR2}>Metric</th>
                    <th className={DIAG_TH_RIGHT_PX2}>Count</th>
                    <th className={DIAG_TH_LEFT_PL2}>Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Total risks in run</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.totalInRun}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with cost range</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withCostRange}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with schedule range</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withScheduleRange}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with both ranges</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withBothRanges}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>Higher = stronger simulation readiness</td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with no variability</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withNoVariability}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>
                      {simulationAssumptionCounts.withNoVariability === 0
                        ? "Good"
                        : simulationAssumptionCounts.withNoVariability <= 3
                          ? "Review"
                          : "High — may reduce Monte Carlo realism"}
                    </td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with min = max cost</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withMinEqualsMaxCost}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>Zero spread on cost</td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with min = max schedule</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.withMinEqualsMaxSchedule}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>Zero spread on schedule</td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with missing pre probability</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.missingPreProbability}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>
                      {simulationAssumptionCounts.missingPreProbability === 0 ? "Good" : "Data gap"}
                    </td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with missing post probability</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.missingPostProbability}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>
                      {simulationAssumptionCounts.missingPostProbability === 0 ? "Good" : "Data gap"}
                    </td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with unchanged mitigation</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.unchangedMitigation}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>
                      {simulationAssumptionCounts.unchangedMitigation === 0 ? "Good" : "Review mitigation assumptions"}
                    </td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with cost-only profile</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.costOnlyProfile}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                  </tr>
                  <tr className={DIAG_TBODY_ROW}>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with schedule-only profile</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.scheduleOnlyProfile}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                  </tr>
                  <tr>
                    <td className={DIAG_TD_LEFT_PR2}>Risks with cost + schedule profile</td>
                    <td className={DIAG_TD_RIGHT_PX2_NUM}>{simulationAssumptionCounts.costAndScheduleProfile}</td>
                    <td className={DIAG_TD_LEFT_PL2_MUTED}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ——— CONSISTENCY CHECKS: cross-section reconciliation ——— */}
          <section
            className={SECTION_SHELL_MT6}
            aria-label="Consistency checks"
          >
            <h2 className={SECTION_HEADER}>
              Consistency Checks
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 px-4 pt-2 m-0">
              Cross-section reconciliation checks
            </p>
            <div className={SECTION_BODY}>
              <table className={DIAG_TABLE}>
                <thead>
                  <tr className={DIAG_THEAD_ROW}>
                    <th className={DIAG_TH_LEFT_PR2}>Check</th>
                    <th className={DIAG_TH_LEFT_PX2}>Result</th>
                    <th className={DIAG_TH_RIGHT_PL2_W20}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {consistencyChecks.map((row, i) => (
                    <tr key={i} className={DIAG_TBODY_ROW_LAST}>
                      <td className={DIAG_TD_LEFT_PR2}>{row.check}</td>
                      <td className={DIAG_TD_LEFT_PX2_MUTED}>{row.result}</td>
                      <td className="py-1.5 pl-2 text-right">
                        <span
                          className={
                            row.status === "PASS"
                              ? STATUS_TEXT_SUCCESS
                              : row.status === "WARN"
                                ? STATUS_TEXT_WARN
                                : STATUS_TEXT_FAIL
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ——— ANALYSIS: why the results occur ——— */}
          {/* Simulation Drivers: cost from forwardExposure.results.neutral.topDrivers; schedule from current.risks by simMeanDays/expectedDays. */}
          <section className={SECTION_SHELL_MT6}>
            <h2 className={SECTION_HEADER}>
              Simulation Drivers
            </h2>
            <div className={`${SECTION_BODY} space-y-6`}>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
                  <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                    Cost Drivers
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Contribution % = each row&apos;s share of total portfolio exposure (neutral baseline). Denominator = forward exposure engine neutral total.
                  </p>
                </div>
                <div className={DRIVER_TABLE_WRAP}>
                  <table className={DRIVER_TABLE}>
                    <thead>
                      <tr className={DRIVER_HEAD_ROW}>
                        <th className={DRIVER_TH_LEFT}>Rank</th>
                        <th className={DRIVER_TH_LEFT}>Risk name</th>
                        <th className={DRIVER_TH_LEFT}>Impact type</th>
                        <th className={DRIVER_TH_LEFT}>Category</th>
                        <th className={DRIVER_TH_RIGHT}>Total impact</th>
                        <th className={DRIVER_TH_RIGHT}>Contribution %</th>
                        <th className={DRIVER_TH_RIGHT}>Pre-mitigation</th>
                        <th className={DRIVER_TH_RIGHT}>Post-mitigation</th>
                        <th className={DRIVER_TH_RIGHT}>Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className={DRIVER_EMPTY}>
                            No cost drivers. Run simulation to populate.
                          </td>
                        </tr>
                      ) : (
                        costDrivers.map((d) => (
                          <tr key={d.riskId} className={DRIVER_ROW}>
                            <td className={DRIVER_CELL_RANK}>{d.rank}</td>
                            <td className={DRIVER_CELL_NAME} title={d.riskName}>
                              {d.riskName}
                            </td>
                            <td className={DRIVER_CELL_MUTED}>{d.impactType}</td>
                            <td className={DRIVER_CELL_MUTED}>{d.category}</td>
                            <td className={DRIVER_CELL_VALUE}>
                              {formatCost(d.total)}
                            </td>
                            <td className={DRIVER_CELL_NUMERIC_MUTED}>
                              {d.contributionPct != null ? `${d.contributionPct.toFixed(1)}%` : "—"}
                            </td>
                            <td className={DRIVER_CELL_NUMERIC}>
                              {formatCost(d.preMitigation)}
                            </td>
                            <td className={DRIVER_CELL_NUMERIC}>
                              {formatCost(d.postMitigation)}
                            </td>
                            <td className={DRIVER_CELL_NUMERIC}>
                              {formatCost(d.delta)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
                  <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                    Schedule Drivers
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Contribution % = each row&apos;s share of total schedule impact (sum of simMeanDays/expectedDays over risks in run).
                  </p>
                </div>
                <div className={DRIVER_TABLE_WRAP}>
                  <table className={DRIVER_TABLE}>
                    <thead>
                      <tr className={DRIVER_HEAD_ROW}>
                        <th className={DRIVER_TH_LEFT}>Rank</th>
                        <th className={DRIVER_TH_LEFT}>Risk name</th>
                        <th className={DRIVER_TH_LEFT}>Impact type</th>
                        <th className={DRIVER_TH_LEFT}>Category</th>
                        <th className={DRIVER_TH_RIGHT}>Total impact</th>
                        <th className={DRIVER_TH_RIGHT}>Contribution %</th>
                        <th className={DRIVER_TH_RIGHT}>Pre-mitigation</th>
                        <th className={DRIVER_TH_RIGHT}>Post-mitigation</th>
                        <th className={DRIVER_TH_RIGHT}>Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className={DRIVER_EMPTY}>
                            No schedule drivers. Run simulation to populate.
                          </td>
                        </tr>
                      ) : (
                        scheduleDrivers.map((d) => (
                          <tr key={d.riskId} className={DRIVER_ROW}>
                            <td className={DRIVER_CELL_RANK}>{d.rank}</td>
                            <td className={DRIVER_CELL_NAME} title={d.riskName}>
                              {d.riskName}
                            </td>
                            <td className={DRIVER_CELL_MUTED}>{d.impactType}</td>
                            <td className={DRIVER_CELL_MUTED}>{d.category}</td>
                            <td className={DRIVER_CELL_VALUE}>
                              {formatDurationDays(d.totalDays)}
                            </td>
                            <td className={DRIVER_CELL_NUMERIC_MUTED}>
                              {d.contributionPct != null ? `${d.contributionPct.toFixed(1)}%` : "—"}
                            </td>
                            <td className={DRIVER_CELL_NUMERIC}>
                              {formatDurationDays(d.preMitigation)}
                            </td>
                            <td className={DRIVER_CELL_NUMERIC}>
                              {formatDurationDays(d.postMitigation)}
                            </td>
                            <td className={DRIVER_CELL_NUMERIC}>
                              {d.delta < 0
                                ? `−${formatDurationDays(-d.delta)}`
                                : formatDurationDays(d.delta)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* ——— EXPOSURE: project-level summary from forward exposure engine ——— */}
          {/* Baseline Exposure: answers "What exposure does the project currently carry?"
              All values from computePortfolioExposure (forward exposure engine); total = sum of risk curves. */}
          <section className={SECTION_SHELL_MT6}>
            <h2 className={SECTION_HEADER}>
              Baseline Exposure
            </h2>
            <div className={SECTION_BODY}>
              {/* Core exposure metrics from neutral baseline only. */}
              {(() => {
                const expectedTotal = forwardExposure.result?.total ?? 0;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                    <div className={H_TILE_WRAP}>
                      <div className={H_TILE_LABEL}>
                        Expected exposure
                      </div>
                      <div className={H_TILE_VALUE}>{formatCost(expectedTotal)}</div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 m-0">Neutral baseline total (forward exposure engine)</p>
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
                  <div className="mb-4">
                    <div className={H_SUBSECTION_TITLE}>
                      Exposure concentration
                    </div>
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm m-0">
                      <div><dt className="text-neutral-500 dark:text-neutral-400 font-normal">Top 3 share</dt><dd className="mt-0 tabular-nums">{top3SharePct.toFixed(1)}%</dd></div>
                      <div><dt className="text-neutral-500 dark:text-neutral-400 font-normal">Top 5 share</dt><dd className="mt-0 tabular-nums">{top5SharePct.toFixed(1)}%</dd></div>
                      <div><dt className="text-neutral-500 dark:text-neutral-400 font-normal">HHI</dt><dd className="mt-0 tabular-nums">{hhi.toFixed(3)}</dd></div>
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
            </div>
          </section>

          {/* ——— FORWARD LOOKING: how exposure evolves over the project timeline ——— */}
          {/* Forecasting: exposure over time from forward exposure engine; pressure/early-warning from risk forecast. */}
          <section className={SECTION_SHELL_MT6}>
            <h2 className={SECTION_HEADER}>
              Forecasting
            </h2>
            <div className={`${SECTION_BODY} space-y-4`}>
              {/* Exposure over time: real data from portfolio.monthlyTotal (forward exposure engine). Cost only. */}
              {selectedResult?.monthlyTotal && selectedResult.monthlyTotal.length > 0 && (
                <div>
                  <div className={H_SUBSECTION_TITLE}>
                    Cost exposure over time
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 m-0">
                    Source: forward exposure engine portfolio.monthlyTotal (sum of risk curves per month). Units: cost only.
                  </p>
                  <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-700">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/50">
                          <th className="text-left py-1.5 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">Month</th>
                          {selectedResult.monthlyTotal.slice(0, forwardExposure.horizonMonths).map((_, i) => (
                            <th key={i} className="text-right py-1.5 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">{i + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-1.5 px-2 text-neutral-600 dark:text-neutral-400">Exposure</td>
                          {selectedResult.monthlyTotal.slice(0, forwardExposure.horizonMonths).map((v, i) => (
                            <td key={i} className="text-right py-1.5 px-2 tabular-nums">{formatCost(v)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
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
                      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-sm">
                        <div>
                          <dt className="text-neutral-500 dark:text-neutral-400 font-normal text-xs">Peak exposure period</dt>
                          <dd className="mt-0 font-medium tabular-nums">Month {peakIdx + 1}</dd>
                        </div>
                        <div>
                          <dt className="text-neutral-500 dark:text-neutral-400 font-normal text-xs">Peak value</dt>
                          <dd className="mt-0 font-medium tabular-nums">{formatCost(peakVal)}</dd>
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
                <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1 m-0 list-disc list-inside">
                  <li>Exposure decay — TBD</li>
                  <li>Risk burn-down — TBD</li>
                </ul>
              </div>
              {/* Forward pressure and early warning: from risk forecast engine (validates risk trajectory). Separate data layer from exposure engine above. */}
              <div>
                <div className={H_SUBSECTION_TITLE}>
                  Pressure and trajectory
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 m-0">
                  Source: risk forecast engine (composite score projection, EII, TTC). Not from exposure engine.
                </p>
                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm m-0">
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400 font-normal text-xs">Forward pressure</dt>
                    <dd className="mt-0.5 font-medium">{meetingPressureLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400 font-normal text-xs">Projected critical</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{forwardPressure.projectedCriticalCount}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400 font-normal text-xs">Escalating</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{momentumSummary.escalatingCount}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400 font-normal text-xs">Early warning</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{earlyWarningCount}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400 font-normal text-xs">Median TTC</dt>
                    <dd className="mt-0.5 font-medium">{meetingMedianTtc != null ? meetingMedianTtc : "—"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {/* ——— DECISION SUPPORT: effect of mitigations ——— */}
          {/* Mitigation Results: pre/post exposure and reduction from cost drivers (validates mitigation logic). */}
          <section className={SECTION_SHELL_MT6}>
            <h2 className={SECTION_HEADER}>
              Mitigation Results
            </h2>
            <div className={SECTION_BODY}>
              {costDrivers.length > 0 ? (
                (() => {
                  const preTotal = costDrivers.reduce((s, d) => s + d.preMitigation, 0);
                  const postTotal = costDrivers.reduce((s, d) => s + d.postMitigation, 0);
                  const reduction = preTotal - postTotal;
                  const reductionPct = preTotal > 0 ? (reduction / preTotal) * 100 : 0;
                  const topByReduction = [...costDrivers].filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
                  return (
                    <>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 m-0">
                        Cost exposure only (schedule not included). Pre = sum(cost drivers preMitigation), post = sum(cost drivers postMitigation). Validates mitigation impact on cost.
                      </p>
                      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                        <div className={H_TILE_WRAP}>
                          <dt className={H_TILE_LABEL}>Pre-mitigation cost exposure</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">{formatCost(preTotal)}</dd>
                        </div>
                        <div className={H_TILE_WRAP}>
                          <dt className={H_TILE_LABEL}>Post-mitigation cost exposure</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">{formatCost(postTotal)}</dd>
                        </div>
                        <div className={H_TILE_WRAP}>
                          <dt className={H_TILE_LABEL}>Cost exposure reduction</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">{formatCost(reduction)}</dd>
                        </div>
                        <div className={H_TILE_WRAP}>
                          <dt className={H_TILE_LABEL}>Reduction %</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">{preTotal > 0 ? `${reductionPct.toFixed(1)}%` : "—"}</dd>
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
            </div>
          </section>

          {/* Mitigation leverage (ROI): API; requires simulation snapshot. */}
          {snapshotNeutral ? (
            <MitigationOptimisationPanel />
          ) : (
            <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
              Run simulation to see mitigation leverage.
            </p>
          )}

        </>
      )}
    </main>
  );
}
