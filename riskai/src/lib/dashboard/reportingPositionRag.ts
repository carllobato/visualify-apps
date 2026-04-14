/**
 * Server-side approximation of Simulation page “Overall position” → portfolio tile RAG.
 *
 * TODO: Revisit and harden — share one implementation with `SimulationPageContent` (same CDF
 * construction, snapshot selection, and edge cases), consider persisting reporting position at
 * lock time to avoid drift and reduce portfolio load.
 */
import type { MonteCarloNeutralSnapshot } from "@/domain/simulation/simulation.types";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";
import type { ProjectContext, ProjectCurrency } from "@/lib/projectContext";
import { parseProjectContextFromVisualifyProjectSettingsRow, riskAppetiteToPercent } from "@/lib/projectContext";
import { neutralSnapshotFromDbRow } from "@/lib/simulationNeutralFromDbRow";
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
} from "@/lib/simulationDisplayUtils";

/** Aligned with `SimulationPageContent` (`DISTRIBUTION_BIN_COUNT`). */
const DISTRIBUTION_BIN_COUNT = 100;

type PortfolioRag = "green" | "amber" | "red";

export type ReportingLineSeverity = "on" | "risk" | "off";

export type ReportingPositionBreakdown = {
  rag: PortfolioRag;
  costLine: ReportingLineSeverity | null;
  timeLine: ReportingLineSeverity | null;
  overallStatus: "On Track" | "At Risk" | "Off Track";
};

/** Portfolio total row in the KPI modal — aggregate held vs at-target-P (single currency only). */
export type PortfolioReportingFooterRow = {
  costStatus: string;
  timeStatus: string;
  overallStatus: "On Track" | "At Risk" | "Off Track";
  rag: PortfolioRag;
  /** Σ(simulated cost at P) − Σ(contingency) when > 0 — KPI modal driver line. */
  costShortfallAbs?: number;
  /** Σ(contingency) − Σ(simulated cost at P) when > 0 — KPI modal driver line. */
  costSurplusAbs?: number;
  /** Σ(delay at P) − Σ(schedule contingency days) when > 0 — KPI modal driver line. */
  timeShortfallDays?: number;
  /** Σ(schedule contingency days) − Σ(delay at P) when > 0 — KPI modal driver line. */
  timeSurplusDays?: number;
  /** Mean risk-appetite P across projects in the aggregate (display). */
  driverTargetP: number;
  driverCurrency: ProjectCurrency;
  /** Σ simulated cost at target P (same as cost line denominator). */
  sumCostAtTargetPDollars?: number;
  /** Σ simulated delay at target P (days). */
  sumDelayAtTargetPDays?: number;
};

type LineSeverity = ReportingLineSeverity;

function cdfsFromNeutralForReporting(neutral: MonteCarloNeutralSnapshot): {
  costCdf: ReturnType<typeof distributionToCostCdf>;
  timeCdf: ReturnType<typeof distributionToTimeCdf>;
} {
  const s = neutral.summary;
  const costCdf =
    neutral.costSamples.length > 0
      ? distributionToCostCdf(binSamplesIntoHistogram(neutral.costSamples, DISTRIBUTION_BIN_COUNT))
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
    neutral.timeSamples.length > 0
      ? distributionToTimeCdf(binSamplesIntoTimeHistogram(neutral.timeSamples, DISTRIBUTION_BIN_COUNT))
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

function lineStatus(current: number | null, target: number): LineSeverity | null {
  if (current == null) return null;
  if (current >= target) return "on";
  if (current >= target - 10) return "risk";
  return "off";
}

/**
 * If contingency/buffer is still below the simulated P-target in absolute terms, do not show “on track”
 * from percentile/ratio bands alone — floor at “risk” unless already “off”.
 */
function escalateSeverityIfAbsoluteGapToPTarget(
  line: LineSeverity | null,
  gap: number
): LineSeverity | null {
  if (line == null || !Number.isFinite(gap) || gap <= 0) return line;
  if (line === "off") return "off";
  return "risk";
}

/** Display label for a cost/time line (simulation position bands). */
export function formatReportingLineStatus(line: ReportingLineSeverity | null): string {
  if (line == null) return "—";
  if (line === "on") return "On track";
  if (line === "risk") return "At risk";
  return "Off track";
}

export type ReportingFundingScalars = {
  currency: ProjectCurrency;
  /** Contingency held in dollars (from project settings). */
  contingencyDollars: number;
  /** Simulated total cost at risk-appetite target P (reporting run). */
  costAtTargetPDollars: number | null;
  scheduleContingencyDays: number | null;
  /** Simulated schedule (delay days) at target P. */
  timeAtTargetPDays: number | null;
  targetPNumeric: number;
};

/** Values for “held vs at-target-P” comparisons (same CDFs as position breakdown). */
/** Gap metrics for KPI copy — aligned with {@link reportingFundingScalars} and breakdown “held” basis. */
export type ReportingPositionDriverScalars = {
  /** max(0, simulated cost at target P − held funds: contingency, else approved budget). */
  costShortfallDollars: number | null;
  /** max(0, held funds − simulated cost at target P). */
  costSurplusDollars: number | null;
  /** max(0, simulated delay at target P − schedule contingency days); null when no schedule buffer. */
  timeShortfallDays: number | null;
  /** max(0, schedule contingency − simulated delay at target P). */
  timeSurplusDays: number | null;
  /** Simulated total cost at appetite P (for KPI sublines vs bare “P90”). */
  costAtTargetPDollars: number | null;
  /** Simulated delay at appetite P (days). */
  timeAtTargetPDays: number | null;
  currency: ProjectCurrency;
  targetPNumeric: number;
};

/**
 * Dollar / schedule buffer shortfalls vs simulated outcomes at the project’s risk-appetite percentile.
 * Used to explain cost/time line status in portfolio reporting tables.
 */
export function tryReportingPositionDriverScalars(
  lockedRow: SimulationSnapshotRow | null | undefined,
  settingsRow: Record<string, unknown> | null | undefined
): ReportingPositionDriverScalars | null {
  if (!lockedRow || !settingsRow) return null;
  const ctx = parseProjectContextFromVisualifyProjectSettingsRow(settingsRow);
  if (!ctx) return null;
  const scalar = reportingFundingScalars(lockedRow, ctx);
  if (!scalar) return null;

  const approvedBudgetBase = ctx.approvedBudget_m * 1e6;
  const contingencyValueDollars =
    ctx != null && Number.isFinite(ctx.contingencyValue_m) ? ctx.contingencyValue_m * 1e6 : null;
  const costHeld =
    contingencyValueDollars != null && Number.isFinite(contingencyValueDollars)
      ? contingencyValueDollars
      : approvedBudgetBase;

  let costShortfallDollars: number | null = null;
  let costSurplusDollars: number | null = null;
  if (scalar.costAtTargetPDollars != null && Number.isFinite(scalar.costAtTargetPDollars)) {
    const gap = scalar.costAtTargetPDollars - costHeld;
    if (gap > 0) costShortfallDollars = gap;
    else if (gap < 0) costSurplusDollars = -gap;
  }

  const schedDays = scalar.scheduleContingencyDays;
  let timeShortfallDays: number | null = null;
  let timeSurplusDays: number | null = null;
  if (
    schedDays != null &&
    Number.isFinite(schedDays) &&
    scalar.timeAtTargetPDays != null &&
    Number.isFinite(scalar.timeAtTargetPDays)
  ) {
    const gap = scalar.timeAtTargetPDays - schedDays;
    if (gap > 0) timeShortfallDays = gap;
    else if (gap < 0) timeSurplusDays = -gap;
  }

  return {
    costShortfallDollars,
    costSurplusDollars,
    timeShortfallDays,
    timeSurplusDays,
    costAtTargetPDollars: scalar.costAtTargetPDollars,
    timeAtTargetPDays: scalar.timeAtTargetPDays,
    currency: scalar.currency,
    targetPNumeric: scalar.targetPNumeric,
  };
}

export function reportingFundingScalars(
  lockedRow: SimulationSnapshotRow,
  ctx: ProjectContext
): ReportingFundingScalars | null {
  const neutral = neutralSnapshotFromDbRow(lockedRow);
  if (!neutral) return null;
  const { costCdf, timeCdf } = cdfsFromNeutralForReporting(neutral);
  const targetPNumeric = riskAppetiteToPercent(ctx.riskAppetite);

  const contingencyDollars =
    ctx != null && Number.isFinite(ctx.contingencyValue_m) ? ctx.contingencyValue_m * 1e6 : 0;

  let costAtTargetPDollars: number | null = null;
  if (costCdf.length > 0) {
    const v = costAtPercentile(costCdf, targetPNumeric);
    costAtTargetPDollars = v != null && Number.isFinite(v) ? v : null;
  }

  let timeAtTargetPDays: number | null = null;
  if (timeCdf.length > 0) {
    const v = timeAtPercentile(timeCdf, targetPNumeric);
    timeAtTargetPDays = v != null && Number.isFinite(v) ? v : null;
  }

  const w = ctx.scheduleContingency_weeks;
  const scheduleContingencyDays =
    Number.isFinite(w) && w != null && w >= 0 ? w * 7 : null;

  return {
    currency: ctx.currency,
    contingencyDollars,
    costAtTargetPDollars,
    scheduleContingencyDays,
    timeAtTargetPDays,
    targetPNumeric,
  };
}

/**
 * Portfolio aggregate row: Σ contingency held vs Σ simulated cost at target P (cost);
 * Σ schedule contingency days vs Σ delay at target P (time). Same P-band rules as project rows.
 * Returns null for mixed currencies or when no reporting projects contribute usable sums.
 */
export function computePortfolioReportingFooter(rows: ReportingFundingScalars[]): PortfolioReportingFooterRow | null {
  if (rows.length === 0) return null;
  const currency0 = rows[0].currency;
  for (const r of rows) {
    if (r.currency !== currency0) return null;
  }

  let heldCost = 0;
  let reqCost = 0;
  let heldTime = 0;
  let reqTime = 0;
  let targetSum = 0;

  for (const r of rows) {
    targetSum += r.targetPNumeric;
    heldCost += r.contingencyDollars;
    if (r.costAtTargetPDollars != null && Number.isFinite(r.costAtTargetPDollars) && r.costAtTargetPDollars > 0) {
      reqCost += r.costAtTargetPDollars;
    }
    const tHeld =
      r.scheduleContingencyDays != null && Number.isFinite(r.scheduleContingencyDays)
        ? r.scheduleContingencyDays
        : 0;
    heldTime += Math.max(0, tHeld);
    if (r.timeAtTargetPDays != null && Number.isFinite(r.timeAtTargetPDays) && r.timeAtTargetPDays > 0) {
      reqTime += r.timeAtTargetPDays;
    }
  }

  const targetP = Math.round(targetSum / rows.length);

  let costLine: LineSeverity | null = null;
  if (reqCost > 0) {
    const rawP = Math.round((heldCost / reqCost) * 100);
    const currentP = Math.min(100, rawP);
    costLine = lineStatus(currentP, targetP);
  }

  let timeLine: LineSeverity | null = null;
  if (reqTime > 0) {
    const rawP = Math.round((heldTime / reqTime) * 100);
    const currentP = Math.min(100, rawP);
    timeLine = lineStatus(currentP, targetP);
  }

  const costShortfallAbs = reqCost > 0 ? Math.max(0, reqCost - heldCost) : 0;
  const timeShortfallDays = reqTime > 0 ? Math.max(0, reqTime - heldTime) : 0;
  const costSurplusAbs = reqCost > 0 ? Math.max(0, heldCost - reqCost) : 0;
  const timeSurplusDays = reqTime > 0 ? Math.max(0, heldTime - reqTime) : 0;

  costLine = escalateSeverityIfAbsoluteGapToPTarget(costLine, costShortfallAbs);
  timeLine = escalateSeverityIfAbsoluteGapToPTarget(timeLine, timeShortfallDays);

  const severities: LineSeverity[] = [];
  if (costLine != null) severities.push(costLine);
  if (timeLine != null) severities.push(timeLine);
  if (severities.length === 0) return null;

  let worstRank = 2;
  for (const s of severities) {
    const rank = s === "off" ? 0 : s === "risk" ? 1 : 2;
    if (rank < worstRank) worstRank = rank;
  }
  const overallStatus: PortfolioReportingFooterRow["overallStatus"] =
    worstRank === 0 ? "Off Track" : worstRank === 1 ? "At Risk" : "On Track";
  const rag: PortfolioRag = worstRank === 0 ? "red" : worstRank === 1 ? "amber" : "green";

  return {
    costStatus: formatReportingLineStatus(costLine),
    timeStatus: formatReportingLineStatus(timeLine),
    overallStatus,
    rag,
    driverTargetP: targetP,
    driverCurrency: currency0,
    ...(reqCost > 0 ? { sumCostAtTargetPDollars: reqCost } : {}),
    ...(reqTime > 0 ? { sumDelayAtTargetPDays: reqTime } : {}),
    ...(costShortfallAbs > 0 ? { costShortfallAbs } : {}),
    ...(costSurplusAbs > 0 ? { costSurplusAbs } : {}),
    ...(timeShortfallDays > 0 ? { timeShortfallDays } : {}),
    ...(timeSurplusDays > 0 ? { timeSurplusDays } : {}),
  };
}

/**
 * Full cost/time/overcome breakdown from latest **reporting-locked** snapshot + settings
 * (same bands as `projectPositionMetrics` on the simulation page).
 */
export function reportingPositionBreakdownFromLockedSnapshot(
  lockedRow: SimulationSnapshotRow,
  ctx: ProjectContext
): ReportingPositionBreakdown | null {
  const neutral = neutralSnapshotFromDbRow(lockedRow);
  if (!neutral) return null;
  const { costCdf, timeCdf } = cdfsFromNeutralForReporting(neutral);
  const targetPNumeric = riskAppetiteToPercent(ctx.riskAppetite);

  const approvedBudgetBase = ctx.approvedBudget_m * 1e6;
  const contingencyValueDollars =
    ctx != null && Number.isFinite(ctx.contingencyValue_m) ? ctx.contingencyValue_m * 1e6 : null;
  const costRef =
    contingencyValueDollars != null && Number.isFinite(contingencyValueDollars)
      ? contingencyValueDollars
      : approvedBudgetBase;

  const plannedDurationDays = (ctx.plannedDuration_months * 365) / 12;
  const w = ctx.scheduleContingency_weeks;
  const scheduleContingencyDays =
    Number.isFinite(w) && w != null && w >= 0 ? w * 7 : null;
  const timeRef =
    scheduleContingencyDays != null && Number.isFinite(scheduleContingencyDays)
      ? scheduleContingencyDays
      : plannedDurationDays;

  let costCurrentP: number | null = null;
  if (costCdf.length > 0 && costRef != null && costRef > 0) {
    const p = percentileAtCost(costCdf, costRef);
    costCurrentP = p != null ? Math.round(p) : null;
  }

  let timeCurrentP: number | null = null;
  if (timeCdf.length > 0 && timeRef != null && timeRef > 0) {
    const p = percentileAtTime(timeCdf, timeRef);
    timeCurrentP = p != null ? Math.round(p) : null;
  }

  let c = lineStatus(costCurrentP, targetPNumeric);
  let t = lineStatus(timeCurrentP, targetPNumeric);

  const scalar = reportingFundingScalars(lockedRow, ctx);
  if (scalar != null) {
    const costHeldForGap =
      contingencyValueDollars != null && Number.isFinite(contingencyValueDollars)
        ? contingencyValueDollars
        : approvedBudgetBase;
    if (
      scalar.costAtTargetPDollars != null &&
      Number.isFinite(scalar.costAtTargetPDollars) &&
      scalar.costAtTargetPDollars > costHeldForGap
    ) {
      c = escalateSeverityIfAbsoluteGapToPTarget(c, scalar.costAtTargetPDollars - costHeldForGap);
    }
    if (
      scalar.scheduleContingencyDays != null &&
      Number.isFinite(scalar.scheduleContingencyDays) &&
      scalar.timeAtTargetPDays != null &&
      Number.isFinite(scalar.timeAtTargetPDays) &&
      scalar.timeAtTargetPDays > scalar.scheduleContingencyDays
    ) {
      t = escalateSeverityIfAbsoluteGapToPTarget(
        t,
        scalar.timeAtTargetPDays - scalar.scheduleContingencyDays
      );
    }
  }

  const severities: LineSeverity[] = [];
  if (c != null) severities.push(c);
  if (t != null) severities.push(t);
  if (severities.length === 0) return null;

  let worstRank = 2;
  for (const s of severities) {
    const r = s === "off" ? 0 : s === "risk" ? 1 : 2;
    if (r < worstRank) worstRank = r;
  }
  const overallStatus: ReportingPositionBreakdown["overallStatus"] =
    worstRank === 0 ? "Off Track" : worstRank === 1 ? "At Risk" : "On Track";
  const rag: PortfolioRag = worstRank === 0 ? "red" : worstRank === 1 ? "amber" : "green";

  return { rag, costLine: c, timeLine: t, overallStatus };
}

export function reportingPositionRagFromLockedSnapshot(
  lockedRow: SimulationSnapshotRow,
  ctx: ProjectContext
): PortfolioRag | null {
  return reportingPositionBreakdownFromLockedSnapshot(lockedRow, ctx)?.rag ?? null;
}

export function tryReportingBreakdownFromLockedRowAndSettings(
  lockedRow: SimulationSnapshotRow | null | undefined,
  settingsRow: Record<string, unknown> | null | undefined
): ReportingPositionBreakdown | null {
  if (!lockedRow || !settingsRow) return null;
  const ctx = parseProjectContextFromVisualifyProjectSettingsRow(settingsRow);
  if (!ctx) return null;
  return reportingPositionBreakdownFromLockedSnapshot(lockedRow, ctx);
}

export function tryReportingRagFromLockedRowAndSettings(
  lockedRow: SimulationSnapshotRow | null | undefined,
  settingsRow: Record<string, unknown> | null | undefined
): PortfolioRag | null {
  return tryReportingBreakdownFromLockedRowAndSettings(lockedRow, settingsRow)?.rag ?? null;
}

export function tryReportingFundingScalars(
  lockedRow: SimulationSnapshotRow | null | undefined,
  settingsRow: Record<string, unknown> | null | undefined
): ReportingFundingScalars | null {
  if (!lockedRow || !settingsRow) return null;
  const ctx = parseProjectContextFromVisualifyProjectSettingsRow(settingsRow);
  if (!ctx) return null;
  return reportingFundingScalars(lockedRow, ctx);
}
