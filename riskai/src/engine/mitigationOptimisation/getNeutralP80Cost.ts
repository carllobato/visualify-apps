import type { SimulationSnapshot } from "@/domain/simulation/simulation.types";

/**
 * Reads P80 cost from the neutral snapshot. Mirrors Outputs page usage: snapshot.p80Cost.
 * @throws Error if snapshot or p80Cost is missing (lists checked paths).
 */
export function getNeutralP80Cost(neutralSnapshot: SimulationSnapshot): number {
  if (neutralSnapshot == null || typeof neutralSnapshot !== "object") {
    throw new Error(
      "MitigationOptimisation: neutral snapshot missing or invalid. Checked: neutralSnapshot (required object)."
    );
  }
  const p80 = neutralSnapshot.p80Cost;
  if (typeof p80 !== "number" || !Number.isFinite(p80)) {
    throw new Error(
      "MitigationOptimisation: neutral snapshot has no P80 cost. Checked: neutralSnapshot.p80Cost (expected finite number)."
    );
  }
  return p80;
}

/**
 * Piecewise-linear interpolation from snapshot anchors (P20/P50/P80/P90).
 * Outside [20, 90], returns nearest endpoint to avoid extrapolation noise.
 */
export function getNeutralCostAtPercentile(
  neutralSnapshot: SimulationSnapshot,
  targetPercent: number
): number {
  if (neutralSnapshot == null || typeof neutralSnapshot !== "object") {
    throw new Error(
      "MitigationOptimisation: neutral snapshot missing or invalid. Checked: neutralSnapshot (required object)."
    );
  }
  const p20 = neutralSnapshot.p20Cost;
  const p50 = neutralSnapshot.p50Cost;
  const p80 = neutralSnapshot.p80Cost;
  const p90 = neutralSnapshot.p90Cost;
  if (![p20, p50, p80, p90].every((v) => typeof v === "number" && Number.isFinite(v))) {
    throw new Error(
      "MitigationOptimisation: neutral snapshot has invalid percentiles. Expected finite p20Cost/p50Cost/p80Cost/p90Cost."
    );
  }
  const t = Math.max(0, Math.min(100, targetPercent));
  if (t <= 20) return p20;
  if (t <= 50) return p20 + ((p50 - p20) * (t - 20)) / 30;
  if (t <= 80) return p50 + ((p80 - p50) * (t - 50)) / 30;
  if (t <= 90) return p80 + ((p90 - p80) * (t - 80)) / 10;
  return p90;
}
