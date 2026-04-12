/**
 * Server-safe reconstruction of {@link MonteCarloNeutralSnapshot} from a DB snapshot row.
 * Duplicates the neutral half of {@link buildSimulationFromDbRow} in `risk-register.store.tsx`
 * without importing the client store module.
 */
import type { MonteCarloNeutralSnapshot } from "@/domain/simulation/simulation.types";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";

function finiteNum(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function p80OrP50P90Midpoint(p50: number, p80Column: number | null | undefined, p90: number): number {
  if (p80Column != null && Number.isFinite(Number(p80Column))) {
    return finiteNum(p80Column);
  }
  return (p50 + p90) / 2;
}

function expandHistogramToSamples(
  bins: { cost?: number; time?: number; frequency: number }[] | undefined,
  axis: "cost" | "time"
): number[] {
  if (!Array.isArray(bins) || bins.length === 0) return [];
  const out: number[] = [];
  for (const bin of bins) {
    const value = axis === "cost" ? finiteNum(bin.cost) : finiteNum(bin.time);
    const count = Math.max(0, Math.round(finiteNum(bin.frequency)));
    for (let i = 0; i < count; i++) out.push(value);
  }
  return out;
}

/** Build neutral snapshot for CDF reconstruction — same numerics as the simulation page hydrate path. */
export function neutralSnapshotFromDbRow(row: SimulationSnapshotRow): MonteCarloNeutralSnapshot | null {
  if (!row || typeof row !== "object") return null;
  const iter = Number(row.iterations) || 0;
  const createdAt = row.created_at ?? new Date().toISOString();
  const ts = new Date(createdAt).getTime();

  const pl = row.payload;
  const sum = pl?.summary;

  const hasReportingScalars = row.cost_p20 != null && Number.isFinite(Number(row.cost_p20));

  let p20c: number;
  let p50c: number;
  let p80c: number;
  let p90c: number;
  let meanC: number;
  let minC: number;
  let maxC: number;
  let p20t: number;
  let p50t: number;
  let p80t: number;
  let p90t: number;
  let meanT: number;
  let minT: number;
  let maxT: number;

  if (hasReportingScalars) {
    p20c = finiteNum(row.cost_p20);
    p50c = finiteNum(row.cost_p50);
    p90c = finiteNum(row.cost_p90);
    p80c = p80OrP50P90Midpoint(p50c, row.cost_p80, p90c);
    meanC = finiteNum(row.cost_mean);
    p20t = finiteNum(row.time_p20);
    p50t = finiteNum(row.time_p50);
    p90t = finiteNum(row.time_p90);
    p80t = p80OrP50P90Midpoint(p50t, row.time_p80, p90t);
    meanT = finiteNum(row.time_mean);
    const sumRec = sum && typeof sum === "object" ? (sum as Record<string, unknown>) : null;
    minC =
      row.cost_min != null && Number.isFinite(Number(row.cost_min))
        ? finiteNum(row.cost_min)
        : sumRec != null && sumRec.minCost != null
          ? finiteNum(sumRec.minCost, p20c)
          : p20c;
    maxC =
      row.cost_max != null && Number.isFinite(Number(row.cost_max))
        ? finiteNum(row.cost_max)
        : sumRec != null && sumRec.maxCost != null
          ? finiteNum(sumRec.maxCost, p90c)
          : p90c;
    minT =
      row.time_min != null && Number.isFinite(Number(row.time_min))
        ? finiteNum(row.time_min)
        : sumRec != null && sumRec.minTime != null
          ? finiteNum(sumRec.minTime, p20t)
          : p20t;
    maxT =
      row.time_max != null && Number.isFinite(Number(row.time_max))
        ? finiteNum(row.time_max)
        : sumRec != null && sumRec.maxTime != null
          ? finiteNum(sumRec.maxTime, p90t)
          : p90t;
  } else if (sum && typeof sum === "object") {
    p20c = finiteNum((sum as Record<string, unknown>).p20Cost);
    p50c = finiteNum((sum as Record<string, unknown>).p50Cost);
    p80c = finiteNum((sum as Record<string, unknown>).p80Cost);
    p90c = finiteNum((sum as Record<string, unknown>).p90Cost);
    meanC = finiteNum((sum as Record<string, unknown>).meanCost);
    minC = finiteNum((sum as Record<string, unknown>).minCost);
    maxC = finiteNum((sum as Record<string, unknown>).maxCost);
    p20t = finiteNum((sum as Record<string, unknown>).p20Time);
    p50t = finiteNum((sum as Record<string, unknown>).p50Time);
    p80t = finiteNum((sum as Record<string, unknown>).p80Time);
    p90t = finiteNum((sum as Record<string, unknown>).p90Time);
    meanT = finiteNum((sum as Record<string, unknown>).meanTime);
    minT = finiteNum((sum as Record<string, unknown>).minTime);
    maxT = finiteNum((sum as Record<string, unknown>).maxTime);
  } else {
    p20c = p50c = p80c = p90c = meanC = minC = maxC = 0;
    p20t = p50t = p80t = p90t = meanT = minT = maxT = 0;
  }

  const costSamples = expandHistogramToSamples(
    pl?.distributions?.costHistogram as { cost: number; frequency: number }[] | undefined,
    "cost"
  );
  const timeSamples = expandHistogramToSamples(
    pl?.distributions?.timeHistogram as { time: number; frequency: number }[] | undefined,
    "time"
  );

  return {
    costSamples,
    timeSamples,
    summary: {
      meanCost: meanC,
      p20Cost: p20c,
      p50Cost: p50c,
      p80Cost: p80c,
      p90Cost: p90c,
      minCost: minC,
      maxCost: maxC,
      meanTime: meanT,
      p20Time: p20t,
      p50Time: p50t,
      p80Time: p80t,
      p90Time: p90t,
      minTime: minT,
      maxTime: maxT,
    },
    summaryReport: pl?.summaryReport
      ? {
          iterationCount: iter,
          averageCost: finiteNum(pl.summaryReport.averageCost, meanC),
          averageTime: finiteNum(pl.summaryReport.averageTime, meanT),
          costVolatility: pl.summaryReport.costVolatility,
          p50Cost: finiteNum(pl.summaryReport.p50Cost, p50c),
          p80Cost: finiteNum(pl.summaryReport.p80Cost, p80c),
          p90Cost: finiteNum(pl.summaryReport.p90Cost, p90c),
          minCost: finiteNum(pl.summaryReport.minCost, minC),
          maxCost: finiteNum(pl.summaryReport.maxCost, maxC),
        }
      : {
          iterationCount: iter,
          averageCost: meanC,
          averageTime: meanT,
          p50Cost: p50c,
          p80Cost: p80c,
          p90Cost: p90c,
          minCost: minC,
          maxCost: maxC,
        },
    lastRunAt: ts,
    iterationCount: iter,
  };
}
