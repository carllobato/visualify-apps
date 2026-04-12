/**
 * `risks.status` and `risks.applies_to` are free text (lookup table names; legacy lowercase values supported).
 * Use these helpers for simulation, validation, and analytics so casing and minor variants still work.
 */

import type { MitigationMode, Risk, RiskLevel } from "./risk.schema";

/** Canonical `riskai_risk_statuses.name` for soft-deleted risks (`risks.status`). */
export const RISK_STATUS_ARCHIVED_LOOKUP = "Archived";

/** Default status when restoring an archived risk (first version; prior status not preserved). */
export const RISK_STATUS_OPEN_LOOKUP = "Open";

/** Canonical `riskai_risk_statuses.name` for closed risks (`risks.status`). */
export const RISK_STATUS_CLOSED_LOOKUP = "Closed";

export function normalizeRiskStatusKey(status: string | undefined | null): string {
  return (status ?? "").toString().trim().toLowerCase();
}

const RATING_LETTER: Record<RiskLevel, string> = { low: "L", medium: "M", high: "H", extreme: "E" };

function inherentLetter(risk: Risk): string {
  return RATING_LETTER[risk.inherentRating.level] ?? "M";
}

function residualLetter(risk: Risk): string {
  return RATING_LETTER[risk.residualRating.level] ?? "M";
}

/**
 * Register table "Rating" column: which letter (or N/A) to show from lifecycle status.
 * — draft / closed / archived → N/A
 * — open / monitoring → pre-mitigation (inherent)
 * — mitigating / mitigated → post-mitigation (residual), or N/A if no mitigation text
 */
export function isCurrentRiskRatingNA(risk: Risk): boolean {
  const s = normalizeRiskStatusKey(risk.status);
  if (s === "draft" || s === "closed" || s === "archived") return true;
  if (s === "mitigating" || s === "mitigated") return !risk.mitigation?.trim();
  return false;
}

export function getCurrentRiskRatingLetter(risk: Risk): string {
  if (isCurrentRiskRatingNA(risk)) return "N/A";
  const s = normalizeRiskStatusKey(risk.status);
  if (s === "mitigating" || s === "mitigated") return residualLetter(risk);
  if (s === "open" || s === "monitoring") return inherentLetter(risk);
  return inherentLetter(risk);
}

/** Numeric score for the rating shown in {@link getCurrentRiskRatingLetter} (undefined when N/A). */
export function getCurrentRiskRatingScoreForSort(risk: Risk): number | undefined {
  if (isCurrentRiskRatingNA(risk)) return undefined;
  const s = normalizeRiskStatusKey(risk.status);
  if (s === "mitigating" || s === "mitigated") return risk.residualRating.score;
  return risk.inherentRating.score;
}

export function getCurrentRiskRatingTitle(risk: Risk): string {
  const s = normalizeRiskStatusKey(risk.status);
  if (s === "draft" || s === "closed" || s === "archived") return "Rating: N/A for this status";
  if (s === "open" || s === "monitoring") {
    return `Pre-mitigation: ${risk.inherentRating.level} (score ${risk.inherentRating.score})`;
  }
  if (s === "mitigating" || s === "mitigated") {
    if (!risk.mitigation?.trim()) return "Post-mitigation: N/A (no mitigation)";
    return `Post-mitigation: ${risk.residualRating.level} (score ${risk.residualRating.score})`;
  }
  return `Pre-mitigation: ${risk.inherentRating.level} (score ${risk.inherentRating.score})`;
}

/**
 * Preferred default status for newly created risks (matches `riskai_risk_statuses.name`, any casing).
 * Do not use `statuses[0]` — DB order-by-name yields `archived` first alphabetically.
 */
export function getDefaultNewRiskStatusName(rows: { name: string }[]): string {
  const draft = rows.find((r) => normalizeRiskStatusKey(r.name) === "draft");
  return draft?.name ?? "";
}

/** Resolve a configured status display name by one or more semantic keys (first match wins). */
export function findRiskStatusNameByKeys(rows: { name: string }[], keys: string[]): string | undefined {
  for (const key of keys) {
    const found = rows.find((r) => normalizeRiskStatusKey(r.name) === key);
    if (found) return found.name;
  }
  return undefined;
}

/**
 * Default lifecycle status for risks created manually in Add Risk (not AI extraction).
 * Matches `riskai_risk_statuses.name` for "open".
 */
export function getDefaultUserCreatedRiskStatusName(rows: { name: string }[]): string {
  return findRiskStatusNameByKeys(rows, ["open"]) ?? "";
}

/**
 * Lifecycle status implied by modelling mitigation mode (register lookup names).
 * Does not handle "none" — callers map that to Open except when status should stay Draft.
 */
export function statusAutoFromMitigationMode(mode: MitigationMode, rows: { name: string }[]): string | undefined {
  if (mode === "forecast") return findRiskStatusNameByKeys(rows, ["monitoring"]);
  if (mode === "active") return findRiskStatusNameByKeys(rows, ["mitigating", "mitigated"]);
  return undefined;
}

export function isRiskStatusDraft(status: string | undefined | null): boolean {
  return normalizeRiskStatusKey(status) === "draft";
}

export function isRiskStatusArchived(status: string | undefined | null): boolean {
  return normalizeRiskStatusKey(status) === "archived";
}

/** Keys aligned with default `riskai_risk_statuses` lifecycle rows (Run Data, analytics). */
export type RiskLifecycleBucketKey =
  | "draft"
  | "open"
  | "monitoring"
  | "mitigating"
  | "closed"
  | "archived";

/**
 * Single lifecycle bucket per risk for register snapshots. Maps synonym `mitigated` → `mitigating`
 * (some tenants use that lookup name; see `statusAutoFromMitigationMode`). Counts risks whose
 * modelling has `mitigationProfile.status === 'active'` as mitigating even when `risks.status`
 * was not yet updated (e.g. legacy rows).
 */
export function riskLifecycleBucketForRegisterSnapshot(risk: Risk): RiskLifecycleBucketKey | null {
  const s = normalizeRiskStatusKey(risk.status);
  if (!s) return null;
  if (s === "archived") return "archived";
  if (s === "closed") return "closed";
  if (s === "draft") return "draft";
  if (s === "mitigating" || s === "mitigated") return "mitigating";
  if (risk.mitigationProfile?.status === "active") return "mitigating";
  if (s === "monitoring") return "monitoring";
  if (s === "open") return "open";
  return null;
}

/**
 * Portfolio analytics “active” risk: Open, Monitoring, or Mitigating only.
 * Excludes Draft, Closed, Archived, and unknown lifecycle buckets.
 */
export function isRiskActiveForPortfolioAnalytics(risk: Risk): boolean {
  const b = riskLifecycleBucketForRegisterSnapshot(risk);
  return b === "open" || b === "monitoring" || b === "mitigating";
}

/**
 * Schedule impact (days) for Monte Carlo and portfolio schedule exposure, by lifecycle bucket:
 * Open / Monitoring → pre-mitigation days only
 * Mitigating → post-mitigation days when modelled; otherwise pre-mitigation fallback
 *
 * Uses {@link riskLifecycleBucketForRegisterSnapshot} (same as register / portfolio analytics).
 */
export function scheduleImpactDaysMLForSimulation(risk: Risk): number {
  const bucket = riskLifecycleBucketForRegisterSnapshot(risk);
  if (bucket === "open" || bucket === "monitoring") {
    const pre = risk.preMitigationTimeML;
    return typeof pre === "number" && Number.isFinite(pre) ? Math.max(0, pre) : 0;
  }
  if (bucket === "mitigating") {
    const post = risk.postMitigationTimeML;
    if (typeof post === "number" && Number.isFinite(post)) {
      return Math.max(0, post);
    }
    const pre = risk.preMitigationTimeML;
    return typeof pre === "number" && Number.isFinite(pre) ? Math.max(0, pre) : 0;
  }
  return 0;
}

/** Upper bound on schedule impact days before MC triangular spread (`simulatePortfolio`). */
export const SCHEDULE_IMPACT_DAYS_CAP = 30;

export function scheduleImpactDaysMLCappedForMonteCarlo(risk: Risk): number {
  return Math.min(SCHEDULE_IMPACT_DAYS_CAP, scheduleImpactDaysMLForSimulation(risk));
}

export function isRiskStatusClosed(status: string | undefined | null): boolean {
  return normalizeRiskStatusKey(status) === "closed";
}

/** Closed or archived risks are excluded from Monte Carlo inputs. */
export function isRiskStatusExcludedFromSimulation(status: string | undefined | null): boolean {
  return isRiskStatusClosed(status) || isRiskStatusArchived(status);
}

/**
 * Semantic kind for cost/time/both. Returns null when the stored text does not match those words (case-insensitive).
 * Callers typically treat null like "both" for consequence math and validation.
 */
export function normalizeAppliesToKey(appliesTo: string | undefined | null): "time" | "cost" | "both" | null {
  const raw = (appliesTo ?? "").toString().trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "time") return "time";
  if (lower === "cost") return "cost";
  if (lower === "both") return "both";
  return null;
}

export function appliesToAffectsCost(appliesTo: string | undefined | null): boolean {
  const k = normalizeAppliesToKey(appliesTo);
  return k === "cost" || k === "both" || k === null;
}

export function appliesToAffectsTime(appliesTo: string | undefined | null): boolean {
  const k = normalizeAppliesToKey(appliesTo);
  return k === "time" || k === "both" || k === null;
}

export function appliesToExcludesCost(appliesTo: string | undefined | null): boolean {
  return normalizeAppliesToKey(appliesTo) === "time";
}

export function appliesToExcludesTime(appliesTo: string | undefined | null): boolean {
  return normalizeAppliesToKey(appliesTo) === "cost";
}
