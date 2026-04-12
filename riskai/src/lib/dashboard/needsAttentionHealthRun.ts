/** Aligned with {@link RagStatus} in `projectTileServerData`. */
export type NeedsAttentionHealthRag = "green" | "amber" | "red";

/**
 * Portfolio “Needs Attention” health run: 0–100 (100 = best). Penalties are capped so one dimension cannot zero the score alone.
 */
export type PortfolioNeedsAttentionHealthRun = {
  healthScore: number;
  primaryRagDot: NeedsAttentionHealthRag;
  /** Projects with ≥1 active analytics risk — denominator for simulation freshness. */
  projectsWithActiveRisksCount: number;
  /**
   * Penalty dimension for “simulation / reporting freshness”: in default portfolio view, counts projects
   * with no snapshot `created_at` in the current UTC month; when the portfolio overview is scoped to a
   * reporting month, counts projects whose reporting lock for that month is older than 30 days.
   */
  staleSimulationProjectCount: number;
  /** Unique risks in the union of top-5 cost + top-5 schedule drivers (0–10). */
  topDriverPoolSize: number;
  /** Subset of that pool with no mitigation description. */
  topDriversWithoutMitigationCount: number;
  /** Distinct projects in top cost or schedule opportunity lists (material modeled upside). */
  materialOpportunityProjectCount: number;
  /** High / Extreme active risks missing owner and/or mitigation (same rows as the register table). */
  registerGapCount: number;
};

const MAX_PENALTY_STALE = 30;
const PENALTY_PER_STALE = 6;
const MAX_PENALTY_REGISTER = 35;
const PENALTY_PER_REGISTER_GAP = 5;
const MAX_PENALTY_TOP_DRIVERS = 25;
const PENALTY_PER_TOP_DRIVER_NO_MIT = 5;

function healthRagFromScore(score: number): NeedsAttentionHealthRag {
  if (score >= 80) return "green";
  if (score >= 55) return "amber";
  return "red";
}

export function utcBoundsForMonthContaining(refMs: number): { startMs: number; endMs: number } {
  const d = new Date(refMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const startMs = Date.UTC(y, m, 1, 0, 0, 0, 0);
  const endMs = Date.UTC(y, m + 1, 1, 0, 0, 0, 0);
  return { startMs, endMs };
}

/** True when `createdAt` falls in the same UTC calendar month as `referenceNow`. */
export function simulationTimestampInCurrentUtcMonth(createdAt: string | null, referenceNow: Date): boolean {
  if (createdAt == null || createdAt === "") return false;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  const { startMs, endMs } = utcBoundsForMonthContaining(referenceNow.getTime());
  return t >= startMs && t < endMs;
}

export function computeNeedsAttentionHealthRun(input: {
  staleSimulationProjectCount: number;
  registerGapCount: number;
  topDriversWithoutMitigationCount: number;
}): { healthScore: number; primaryRagDot: NeedsAttentionHealthRag } {
  let score = 100;
  score -= Math.min(MAX_PENALTY_STALE, Math.max(0, input.staleSimulationProjectCount) * PENALTY_PER_STALE);
  score -= Math.min(MAX_PENALTY_REGISTER, Math.max(0, input.registerGapCount) * PENALTY_PER_REGISTER_GAP);
  score -= Math.min(MAX_PENALTY_TOP_DRIVERS, Math.max(0, input.topDriversWithoutMitigationCount) * PENALTY_PER_TOP_DRIVER_NO_MIT);
  const healthScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    healthScore,
    primaryRagDot: healthRagFromScore(healthScore),
  };
}

/** One row in the Needs Attention KPI score card — penalty bars match {@link computeNeedsAttentionHealthRun}. */
export type NeedsAttentionScoreCardLine = {
  id: "simulation" | "register" | "topDrivers";
  title: string;
  detail: string;
  appliedPenalty: number;
  maxPenalty: number;
};

/** How to describe the “stale” dimension in portfolio Needs Attention copy (aligned with server logic). */
export type NeedsAttentionStaleCopyMode = "utcMonthSnapshot" | "reportingMonthLock";

export function buildNeedsAttentionScoreCard(
  health: PortfolioNeedsAttentionHealthRun,
  options?: { staleCopyMode?: NeedsAttentionStaleCopyMode }
): {
  lines: NeedsAttentionScoreCardLine[];
  opportunityDetail: string;
  totalPenalty: number;
} {
  const staleCopyMode = options?.staleCopyMode ?? "utcMonthSnapshot";
  const staleApplied = Math.min(
    MAX_PENALTY_STALE,
    Math.max(0, health.staleSimulationProjectCount) * PENALTY_PER_STALE
  );
  const registerApplied = Math.min(
    MAX_PENALTY_REGISTER,
    Math.max(0, health.registerGapCount) * PENALTY_PER_REGISTER_GAP
  );
  const topApplied = Math.min(
    MAX_PENALTY_TOP_DRIVERS,
    Math.max(0, health.topDriversWithoutMitigationCount) * PENALTY_PER_TOP_DRIVER_NO_MIT
  );
  const totalPenalty = staleApplied + registerApplied + topApplied;

  const simulationDetail =
    health.projectsWithActiveRisksCount === 0
      ? "No projects with active risks."
      : staleCopyMode === "reportingMonthLock"
        ? `${health.staleSimulationProjectCount} of ${health.projectsWithActiveRisksCount} project${
            health.projectsWithActiveRisksCount === 1 ? "" : "s"
          } with active risks have a stale reporting lock for the selected month (more than 30 days since lock).`
        : `${health.staleSimulationProjectCount} of ${health.projectsWithActiveRisksCount} project${
            health.projectsWithActiveRisksCount === 1 ? "" : "s"
          } with active risks have no simulation in the current UTC month (latest snapshot).`;

  const registerDetail =
    health.registerGapCount === 0
      ? "No High / Extreme risks missing an owner or mitigation text."
      : `${health.registerGapCount} risk${health.registerGapCount === 1 ? "" : "s"} rated High or Extreme with no owner and/or no mitigation (register gaps).`;

  const topDetail =
    health.topDriverPoolSize === 0
      ? "No combined top cost / schedule driver pool."
      : `${health.topDriversWithoutMitigationCount} of ${health.topDriverPoolSize} union top drivers lack a mitigation description.`;

  const opportunityDetail =
    health.materialOpportunityProjectCount === 0
      ? "No material opportunity in the top cost or schedule opportunity lists (Monitoring upside is informational only — not scored)."
      : `${health.materialOpportunityProjectCount} project${
          health.materialOpportunityProjectCount === 1 ? "" : "s"
        } in those lists — modeled pre- vs post-mitigation upside (not scored).`;

  const simulationLineTitle =
    staleCopyMode === "reportingMonthLock" ? "Reporting lock staleness" : "Simulation freshness";

  return {
    lines: [
      {
        id: "simulation",
        title: simulationLineTitle,
        detail: simulationDetail,
        appliedPenalty: staleApplied,
        maxPenalty: MAX_PENALTY_STALE,
      },
      {
        id: "register",
        title: "Register gaps",
        detail: registerDetail,
        appliedPenalty: registerApplied,
        maxPenalty: MAX_PENALTY_REGISTER,
      },
      {
        id: "topDrivers",
        title: "Top drivers (cost ∪ schedule)",
        detail: topDetail,
        appliedPenalty: topApplied,
        maxPenalty: MAX_PENALTY_TOP_DRIVERS,
      },
    ],
    opportunityDetail,
    totalPenalty,
  };
}
