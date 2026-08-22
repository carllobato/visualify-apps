/**
 * `risks.status` and `risks.applies_to` are free text (lookup table names; legacy lowercase values supported).
 * Use these helpers for simulation, validation, and analytics so casing and minor variants still work.
 */

import type { MitigationMode, Risk, RiskLevel } from "./risk.schema";

/** Canonical `riskai_risk_statuses.name` for soft-deleted risks (`risks.status`). */
export const RISK_STATUS_ARCHIVED_LOOKUP = "Archived";

/** Canonical `riskai_risk_statuses.name` for draft risks (`risks.status`). */
export const RISK_STATUS_DRAFT_LOOKUP = "Draft";

/**
 * @deprecated Prefer {@link RISK_STATUS_DRAFT_LOOKUP} for archive restore / closed reopen.
 * Kept for callers that still default new risks to Open.
 */
export const RISK_STATUS_OPEN_LOOKUP = "Open";

/** Canonical `riskai_risk_statuses.name` for closed risks (`risks.status`). */
export const RISK_STATUS_CLOSED_LOOKUP = "Closed";

/** Default status when restoring an archived risk (prior status not preserved). */
export const RISK_STATUS_RESTORE_LOOKUP = RISK_STATUS_DRAFT_LOOKUP;

export function normalizeRiskStatusKey(status: string | undefined | null): string {
  return (status ?? "").toString().trim().toLowerCase();
}

const RATING_LETTER: Record<RiskLevel, string> = { low: "L", medium: "M", high: "H", extreme: "E" };

function inherentLetter(risk: Risk): string {
  return RATING_LETTER[risk.inherentRating.level] ?? "M";
}

/**
 * Register table "Rating" column: which letter (or N/A) to show from lifecycle status.
 * — draft / closed / archived → N/A
 * — open / monitoring → pre-mitigation (inherent), even with mitigation text / legacy active mode
 * — mitigating / mitigated → post-mitigation (residual), or N/A when applicable post data unavailable
 */
export function isCurrentRiskRatingNA(risk: Risk): boolean {
  const s = normalizeRiskStatusKey(risk.status);
  if (s === "draft" || s === "closed" || s === "archived") return true;
  if (s === "mitigating" || s === "mitigated") return !hasApplicablePostMitigationInputs(risk);
  return false;
}

/** Register-table rating level (or null when the register shows N/A). */
export function getCurrentRiskRatingLevel(risk: Risk): RiskLevel | null {
  if (isCurrentRiskRatingNA(risk)) return null;
  const s = normalizeRiskStatusKey(risk.status);
  if (s === "mitigating" || s === "mitigated") return risk.residualRating.level;
  return risk.inherentRating.level;
}

export function getCurrentRiskRatingLetter(risk: Risk): string {
  const level = getCurrentRiskRatingLevel(risk);
  if (level == null) return "N/A";
  return RATING_LETTER[level] ?? "M";
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
    if (!hasApplicablePostMitigationInputs(risk)) {
      return "Post-mitigation: N/A (applicable post data unavailable)";
    }
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
 * Map a free-text label to the canonical string from a lookup list (trim; case-insensitive match).
 * Use for `riskai_risk_categories.name` / `riskai_risk_statuses.name` when persisting AI or imports.
 * Returns trimmed `raw` when there is no match (unknown or legacy value).
 */
export function resolveCanonicalLookupLabel(raw: string | undefined | null, candidates: string[]): string {
  const t = (raw ?? "").trim();
  if (!t || candidates.length === 0) return t;
  const key = normalizeRiskStatusKey(t);
  const hit = candidates.find((c) => normalizeRiskStatusKey(c) === key);
  return hit ?? t;
}

/** Fold for fuzzy category matching (alphanumeric only, lowercased). */
function foldCategoryKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Legacy slug keys from older extract prompts (lowercase single tokens) → tokens to match inside
 * canonical `riskai_risk_categories.name` (folded substring checks).
 */
const LEGACY_CATEGORY_SLUG_HINTS: Record<string, readonly string[]> = {
  hse: ["safety", "health", "environment", "hse"],
  commercial: ["commercial"],
  programme: ["programme", "schedule"],
  design: ["design"],
  construction: ["construction"],
  procurement: ["procurement", "supplier", "vendor", "lead", "equipment"],
  authority: ["authority", "approval", "permit", "utility", "planning", "consent"],
  operations: ["operations", "handover"],
  other: ["other"],
};

/**
 * Map a free-text or legacy-slug category string to the canonical label from `candidates`
 * (tenant category names). Uses case-insensitive equality first, then legacy slug / synonym
 * scoring against candidate names, then light token overlap. Does not invent labels outside
 * the candidate list.
 */
export function resolveCanonicalCategoryLabel(raw: string | undefined | null, candidates: string[]): string {
  const t = (raw ?? "").trim();
  if (!t || candidates.length === 0) return t;

  const exact = candidates.find((c) => normalizeRiskStatusKey(c) === normalizeRiskStatusKey(t));
  if (exact) return exact;

  const rawKey = normalizeRiskStatusKey(t);
  const rawFold = foldCategoryKey(t);
  const slugHints = LEGACY_CATEGORY_SLUG_HINTS[rawKey];

  let bestLabel: string | null = null;
  let bestScore = 0;
  const consider = (label: string, score: number) => {
    if (score <= 0) return;
    if (score > bestScore || (score === bestScore && (bestLabel === null || label < bestLabel))) {
      bestLabel = label;
      bestScore = score;
    }
  };

  for (const c of candidates) {
    const ck = normalizeRiskStatusKey(c);
    const cFold = foldCategoryKey(c);
    let score = 0;

    if (rawFold.length >= 3 && rawFold === cFold) {
      score += 40;
    }

    if (slugHints) {
      for (const h of slugHints) {
        if (ck.includes(h) || cFold.includes(foldCategoryKey(h))) score += h.length;
      }
    }

    const rawTokens = rawKey.split(/[^a-z0-9]+/).filter((x) => x.length >= 3);
    for (const tok of rawTokens) {
      if (tok.length >= 3 && (ck.includes(tok) || cFold.includes(tok))) score += tok.length;
    }

    if (rawFold.length >= 4 && (cFold.includes(rawFold) || rawFold.includes(cFold))) {
      score += 12;
    }

    consider(c, score);
  }

  if (bestLabel !== null && bestScore >= 6) {
    return bestLabel;
  }

  return t;
}

/**
 * Default lifecycle status for risks created manually in Add Risk (not AI extraction).
 * Matches `riskai_risk_statuses.name` for "open".
 */
export function getDefaultUserCreatedRiskStatusName(rows: { name: string }[]): string {
  return findRiskStatusNameByKeys(rows, ["open"]) ?? "";
}

/**
 * One-way display default when canonical status changes.
 * Mitigating → Post (`active`). Open / Monitoring / Draft preserve the current selection.
 * Does not clear mitigation/post data and must never be inverted into a status mutation.
 */
export function displayedMitigationModeAfterStatusChange(
  nextStatus: string,
  currentMode: MitigationMode
): MitigationMode {
  const k = normalizeRiskStatusKey(nextStatus);
  if (k === "mitigating" || k === "mitigated") return "active";
  return currentMode;
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
 * (some tenants use that lookup name).
 * Canonical `risks.status` is the source of truth — do not infer Mitigating from
 * `mitigationProfile.status` when the stored status is Open / Monitoring / etc.
 */
export function riskLifecycleBucketForRegisterSnapshot(risk: Risk): RiskLifecycleBucketKey | null {
  const s = normalizeRiskStatusKey(risk.status);
  if (!s) return null;
  if (s === "archived") return "archived";
  if (s === "closed") return "closed";
  if (s === "draft") return "draft";
  if (s === "mitigating" || s === "mitigated") return "mitigating";
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
 * Schedule impact (working days) for Monte Carlo and portfolio schedule exposure, by lifecycle status:
 * - Open / Monitoring → pre-mitigation working days
 * - Mitigating → post-mitigation working days only (null when schedule-applicable and post ML missing;
 *   never falls back to pre)
 * - Cost-only (`appliesTo`) → null (schedule-inapplicable)
 * - Draft / Closed / Archived / unknown → null
 *
 * Uses {@link riskLifecycleBucketForRegisterSnapshot} (canonical status authority).
 */
export function scheduleImpactDaysMLForSimulation(risk: Risk): number | null {
  const bucket = riskLifecycleBucketForRegisterSnapshot(risk);
  if (bucket !== "open" && bucket !== "monitoring" && bucket !== "mitigating") {
    return null;
  }
  if (appliesToExcludesTime(risk.appliesTo)) {
    return null;
  }
  if (bucket === "open" || bucket === "monitoring") {
    const pre = risk.preMitigationTimeML;
    return typeof pre === "number" && Number.isFinite(pre) ? Math.max(0, pre) : 0;
  }
  const post = risk.postMitigationTimeML;
  if (typeof post === "number" && Number.isFinite(post) && post >= 0) {
    return Math.max(0, post);
  }
  return null;
}

/** Upper bound on schedule impact working days before MC triangular spread (`simulatePortfolio`). */
export const SCHEDULE_IMPACT_DAYS_CAP = 30;

export function scheduleImpactDaysMLCappedForMonteCarlo(risk: Risk): number | null {
  const days = scheduleImpactDaysMLForSimulation(risk);
  if (days == null) return null;
  return Math.min(SCHEDULE_IMPACT_DAYS_CAP, days);
}

export function isRiskStatusClosed(status: string | undefined | null): boolean {
  return normalizeRiskStatusKey(status) === "closed";
}

/** Draft, closed, or archived risks are excluded from Monte Carlo inputs. */
export function isRiskStatusExcludedFromSimulation(status: string | undefined | null): boolean {
  return isRiskStatusDraft(status) || isRiskStatusClosed(status) || isRiskStatusArchived(status);
}

/** Canonical `riskai_risks.applies_to` values enforced by DB check constraint. */
export const APPLIES_TO_DB_COST = "Cost";
export const APPLIES_TO_DB_SCHEDULE = "Schedule";
export const APPLIES_TO_DB_BOTH = "Both";

export type AppliesToDbValue =
  | typeof APPLIES_TO_DB_COST
  | typeof APPLIES_TO_DB_SCHEDULE
  | typeof APPLIES_TO_DB_BOTH;

export const APPLIES_TO_REQUIRED_FOR_NON_DRAFT_ERROR =
  "Applies to is required when status is not Draft.";

/**
 * Semantic kind for cost/time/both. Returns null when the stored text does not match those words (case-insensitive).
 * Accepts legacy lowercase UI values and DB-canonical Title Case (`Cost`, `Schedule`, `Both`).
 * Callers typically treat null like "both" for consequence math and validation.
 */
export function normalizeAppliesToKey(appliesTo: string | undefined | null): "time" | "cost" | "both" | null {
  const raw = (appliesTo ?? "").toString().trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "time" || lower === "schedule") return "time";
  if (lower === "cost") return "cost";
  if (lower === "both" || lower === "cost & time" || lower === "cost and time") return "both";
  return null;
}

/** Map UI / legacy text to DB-canonical applies_to (null when unset or unrecognized). */
export function canonicalAppliesToForDb(
  appliesTo: string | undefined | null
): AppliesToDbValue | null {
  const key = normalizeAppliesToKey(appliesTo);
  if (key === "cost") return APPLIES_TO_DB_COST;
  if (key === "time") return APPLIES_TO_DB_SCHEDULE;
  if (key === "both") return APPLIES_TO_DB_BOTH;
  return null;
}

/** Whether a row satisfies `riskai_risks_impact_type_allowed_check` for the given status. */
export function appliesToAllowedForRiskStatus(
  status: string | undefined | null,
  appliesTo: string | undefined | null
): boolean {
  if (isRiskStatusDraft(status)) {
    if (appliesTo == null || String(appliesTo).trim() === "") return true;
    return canonicalAppliesToForDb(appliesTo) != null;
  }
  return canonicalAppliesToForDb(appliesTo) != null;
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

function isPresentNonNegNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/**
 * Whether applicable post-mitigation ML inputs are present (Cost / Time / Both).
 * Does not consult mitigation description text or legacy mitigation-profile status.
 */
export function hasApplicablePostMitigationInputs(risk: Risk): boolean {
  const needsCost = !appliesToExcludesCost(risk.appliesTo);
  const needsTime = !appliesToExcludesTime(risk.appliesTo);
  if (needsCost && !isPresentNonNegNum(risk.postMitigationCostML)) return false;
  if (needsTime && !isPresentNonNegNum(risk.postMitigationTimeML)) return false;
  return true;
}

/**
 * Current/effective Monte Carlo scenario uses post inputs only for Mitigating.
 * Monitoring may still show planned post values elsewhere; Open remains pre.
 */
export function simulationUsesPostMitigationInputs(risk: Risk): boolean {
  return riskLifecycleBucketForRegisterSnapshot(risk) === "mitigating";
}
