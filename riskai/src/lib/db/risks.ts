import type { RiskRow } from "@/types/risk";
import type { Risk } from "@/domain/risk/risk.schema";
import { buildRating, probabilityPctToScale } from "@/domain/risk/risk.logic";
import { costToConsequenceScale, timeDaysToConsequenceScale } from "@/domain/risk/risk.logic";
import {
  APPLIES_TO_REQUIRED_FOR_NON_DRAFT_ERROR,
  appliesToAllowedForRiskStatus,
  canonicalAppliesToForDb,
  resolveCanonicalLookupLabel,
} from "@/domain/risk/riskFieldSemantics";
import {
  applyRiskClosureAndReview,
  type RiskClosureReviewExisting,
} from "@/lib/db/riskClosureReview";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Legacy 1–5 → pre_probability_pct backfill used by
 * `20260820120000_riskai_risks_null_vs_zero_persistence.sql`.
 * Keep in sync with that migration CASE expression.
 */
export const LEGACY_PRE_PROBABILITY_PCT_BACKFILL: Readonly<Record<1 | 2 | 3 | 4 | 5, number>> = {
  1: 10,
  2: 30,
  3: 50,
  4: 70,
  5: 90,
};

export function requireRiskProjectId(projectId?: string): string {
  const trimmed = projectId?.trim();
  if (!trimmed) {
    throw new Error("projectId is required for risk access");
  }
  return trimmed;
}

/** Supabase `public.riskai_risks` column list — keep in sync with DB (no `*`). */
export const RISK_DB_SELECT_COLUMNS =
  "id,project_id,risk_number,title,description,category,owner,applies_to,status,pre_probability,pre_probability_pct,pre_cost_min,pre_cost_ml,pre_cost_max,pre_time_min,pre_time_ml,pre_time_max,mitigation_description,mitigation_cost,post_probability,post_probability_pct,post_cost_min,post_cost_ml,post_cost_max,post_time_min,post_time_ml,post_time_max,created_at,updated_at,closure_note,closed_at,closed_by,created_by,last_reviewed_at,last_reviewed_by,last_review_month";

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

/** In-memory rating fallback only — never written as a placeholder DB score. */
function ratingProbabilityFromRow(
  pct: number | null | undefined,
  legacyScore: number | null | undefined
): number {
  if (pct != null) return probabilityPctToScale(pct);
  if (legacyScore != null && Number.isFinite(legacyScore)) return legacyScore;
  return 1;
}

/**
 * Map a DB row to domain Risk (for listRisks and server loaders).
 */
function rowToRisk(row: RiskRow): Risk {
  const preConsequence = Math.max(
    costToConsequenceScale(row.pre_cost_ml ?? 0),
    timeDaysToConsequenceScale(row.pre_time_ml ?? 0)
  );
  const postConsequence = Math.max(
    costToConsequenceScale(row.post_cost_ml ?? 0),
    timeDaysToConsequenceScale(row.post_time_ml ?? 0)
  );
  const appliesRaw = row.applies_to?.trim();
  const appliesTo = appliesRaw && appliesRaw.length > 0 ? appliesRaw : undefined;
  const hasMitigation = Boolean(row.mitigation_description?.trim());
  const preProb = ratingProbabilityFromRow(row.pre_probability_pct, row.pre_probability);
  const postProb = hasMitigation
    ? ratingProbabilityFromRow(row.post_probability_pct, row.post_probability)
    : preProb;
  return {
    id: row.id,
    riskNumber: row.risk_number ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    category: (row.category ?? "") as Risk["category"],
    status: row.status as Risk["status"],
    owner: row.owner ?? undefined,
    mitigation: row.mitigation_description ?? undefined,
    inherentRating: buildRating(preProb, preConsequence),
    residualRating: buildRating(postProb, postConsequence),
    preMitigationProbabilityPct: row.pre_probability_pct ?? undefined,
    postMitigationProbabilityPct: hasMitigation ? (row.post_probability_pct ?? undefined) : undefined,
    appliesTo,
    preMitigationCostMin: row.pre_cost_min ?? undefined,
    preMitigationCostML: row.pre_cost_ml ?? undefined,
    preMitigationCostMax: row.pre_cost_max ?? undefined,
    preMitigationTimeMin: row.pre_time_min ?? undefined,
    preMitigationTimeML: row.pre_time_ml ?? undefined,
    preMitigationTimeMax: row.pre_time_max ?? undefined,
    mitigationCost: hasMitigation ? (row.mitigation_cost ?? undefined) : undefined,
    postMitigationCostMin: hasMitigation ? (row.post_cost_min ?? undefined) : undefined,
    postMitigationCostML: hasMitigation ? (row.post_cost_ml ?? undefined) : undefined,
    postMitigationCostMax: hasMitigation ? (row.post_cost_max ?? undefined) : undefined,
    postMitigationTimeMin: hasMitigation ? (row.post_time_min ?? undefined) : undefined,
    postMitigationTimeML: hasMitigation ? (row.post_time_ml ?? undefined) : undefined,
    postMitigationTimeMax: hasMitigation ? (row.post_time_max ?? undefined) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closureNote: row.closure_note?.trim() ? row.closure_note : undefined,
    closedAt: row.closed_at ?? undefined,
    closedBy: row.closed_by ?? undefined,
    createdBy: row.created_by ?? undefined,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
    lastReviewedBy: row.last_reviewed_by ?? undefined,
    scoreHistory: [],
  };
}

/** Public alias for server-side portfolio loaders and tests. */
export function mapRiskRowToDomain(row: RiskRow): Risk {
  return rowToRisk(row);
}

export type RiskInsertRow = {
  id: string;
  project_id: string;
  risk_number: number | null;
  title: string;
  description: string | null;
  category: string;
  owner: string | null;
  applies_to: string | null;
  status: string;
  pre_probability: number | null;
  pre_probability_pct: number | null;
  pre_cost_min: number | null;
  pre_cost_ml: number | null;
  pre_cost_max: number | null;
  pre_time_min: number | null;
  pre_time_ml: number | null;
  pre_time_max: number | null;
  mitigation_description: string | null;
  mitigation_cost: number | null;
  post_probability: number | null;
  post_probability_pct: number | null;
  post_cost_min: number | null;
  post_cost_ml: number | null;
  post_cost_max: number | null;
  post_time_min: number | null;
  post_time_ml: number | null;
  post_time_max: number | null;
  created_at: string;
  updated_at: string;
  /** Client may supply when entering Closed; server validates and stamps closed_*. */
  closure_note: string | null;
  /**
   * Server-stamped audit fields. Client values in normalizeRiskRow are stripped to null;
   * API routes overlay stamps from the authenticated session before upsert.
   */
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  last_review_month: string | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

/**
 * Narrow nullable-number parser for Risk DB boundary mapping.
 * Preserves explicit 0; blank/null/invalid → null (never coerces to 0).
 */
export function parseNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Derive legacy 1–5 score from a supplied percentage only — never invent placeholders. */
function legacyProbabilityFromPct(pct: number | null | undefined): number | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  return probabilityPctToScale(pct);
}

export function withCanonicalRiskStatus<T extends { status: string }>(row: T, statusNames: string[]): T {
  if (statusNames.length === 0) return row;
  return { ...row, status: resolveCanonicalLookupLabel(row.status, statusNames) };
}

/** Columns needed from existing rows to apply closure/review stamps. */
export const RISK_CLOSURE_REVIEW_EXISTING_COLUMNS =
  "id,status,closure_note,closed_at,closed_by,created_by";

export function toClosureReviewExisting(
  row: {
    status?: string | null;
    closure_note?: string | null;
    closed_at?: string | null;
    closed_by?: string | null;
    created_by?: string | null;
  } | null
): RiskClosureReviewExisting | null {
  if (!row) return null;
  return {
    status: row.status ?? "",
    closure_note: row.closure_note ?? null,
    closed_at: row.closed_at ?? null,
    closed_by: row.closed_by ?? null,
    created_by: row.created_by ?? null,
  };
}

/**
 * Overlay server-side closure + review stamps onto a normalized insert row.
 * Rejects transitions into Closed without a trimmed non-empty closure note.
 */
export function stampRiskInsertRowForPersistence(args: {
  row: RiskInsertRow;
  existing: RiskClosureReviewExisting | null;
  authenticatedUserId: string;
  nowIso: string;
}): { ok: true; row: RiskInsertRow } | { ok: false; error: string } {
  const applied = applyRiskClosureAndReview({
    existing: args.existing,
    incoming: {
      status: args.row.status,
      closure_note: args.row.closure_note,
    },
    authenticatedUserId: args.authenticatedUserId,
    nowIso: args.nowIso,
  });
  if (!applied.ok) return applied;

  const canonicalAppliesTo = canonicalAppliesToForDb(args.row.applies_to);

  if (!appliesToAllowedForRiskStatus(applied.stamp.status, args.row.applies_to)) {
    return { ok: false, error: APPLIES_TO_REQUIRED_FOR_NON_DRAFT_ERROR };
  }

  return {
    ok: true,
    row: {
      ...args.row,
      applies_to: canonicalAppliesTo,
      status: applied.stamp.status,
      closure_note: applied.stamp.closure_note,
      closed_at: applied.stamp.closed_at,
      closed_by: applied.stamp.closed_by,
      created_by: applied.stamp.created_by,
      last_reviewed_at: applied.stamp.last_reviewed_at,
      last_reviewed_by: applied.stamp.last_reviewed_by,
      last_review_month: applied.stamp.last_review_month,
      updated_at: args.nowIso,
    },
  };
}

export function normalizeRiskRow(raw: unknown, projectId: string): RiskInsertRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = asString(row.id).trim();
  const title = asString(row.title).trim();
  if (!id || !title) return null;
  const createdAt = asString(row.created_at).trim();
  const updatedAt = asString(row.updated_at).trim();
  if (!createdAt || !updatedAt) return null;

  return {
    id,
    project_id: projectId,
    risk_number: parseNullableNumber(row.risk_number),
    title,
    description:
      typeof row.description === "string" && row.description.length > 0 ? row.description : null,
    category: asString(row.category),
    owner: typeof row.owner === "string" && row.owner.length > 0 ? row.owner : null,
    applies_to:
      typeof row.applies_to === "string" && row.applies_to.length > 0
        ? canonicalAppliesToForDb(row.applies_to)
        : null,
    status: asString(row.status),
    pre_probability: parseNullableNumber(row.pre_probability),
    pre_probability_pct: parseNullableNumber(row.pre_probability_pct),
    pre_cost_min: parseNullableNumber(row.pre_cost_min),
    pre_cost_ml: parseNullableNumber(row.pre_cost_ml),
    pre_cost_max: parseNullableNumber(row.pre_cost_max),
    pre_time_min: parseNullableNumber(row.pre_time_min),
    pre_time_ml: parseNullableNumber(row.pre_time_ml),
    pre_time_max: parseNullableNumber(row.pre_time_max),
    mitigation_description:
      typeof row.mitigation_description === "string" && row.mitigation_description.length > 0
        ? row.mitigation_description
        : null,
    mitigation_cost: parseNullableNumber(row.mitigation_cost),
    post_probability: parseNullableNumber(row.post_probability),
    post_probability_pct: parseNullableNumber(row.post_probability_pct),
    post_cost_min: parseNullableNumber(row.post_cost_min),
    post_cost_ml: parseNullableNumber(row.post_cost_ml),
    post_cost_max: parseNullableNumber(row.post_cost_max),
    post_time_min: parseNullableNumber(row.post_time_min),
    post_time_ml: parseNullableNumber(row.post_time_ml),
    post_time_max: parseNullableNumber(row.post_time_max),
    created_at: createdAt,
    updated_at: updatedAt,
    // Closure note is client-writable content; audit IDs/timestamps are never taken from the client.
    closure_note:
      typeof row.closure_note === "string" && row.closure_note.trim().length > 0
        ? row.closure_note.trim()
        : null,
    closed_at: null,
    closed_by: null,
    created_by: null,
    last_reviewed_at: null,
    last_reviewed_by: null,
    last_review_month: null,
  };
}

/**
 * Map domain Risk to DB insert row. Only columns that exist on `public.risks`.
 * Blank/undefined → null; explicit 0 → 0. Legacy 1–5 scores only when a % is supplied.
 */
function riskToRow(risk: Risk, projectId: string): RiskInsertRow {
  const rowId = isUuid(risk.id) ? risk.id : crypto.randomUUID();
  const prePct = risk.preMitigationProbabilityPct ?? null;
  const postPct = risk.postMitigationProbabilityPct ?? null;
  return {
    id: rowId,
    project_id: projectId,
    risk_number: risk.riskNumber ?? null,
    title: risk.title,
    description: risk.description ?? null,
    category: risk.category,
    owner: risk.owner ?? null,
    applies_to: canonicalAppliesToForDb(risk.appliesTo),
    status: risk.status,
    pre_probability: legacyProbabilityFromPct(prePct),
    pre_probability_pct: prePct,
    pre_cost_min: risk.preMitigationCostMin ?? null,
    pre_cost_ml: risk.preMitigationCostML ?? null,
    pre_cost_max: risk.preMitigationCostMax ?? null,
    pre_time_min: risk.preMitigationTimeMin ?? null,
    pre_time_ml: risk.preMitigationTimeML ?? null,
    pre_time_max: risk.preMitigationTimeMax ?? null,
    mitigation_description: risk.mitigation ?? null,
    mitigation_cost: risk.mitigationCost ?? null,
    post_probability: legacyProbabilityFromPct(postPct),
    post_probability_pct: postPct,
    post_cost_min: risk.postMitigationCostMin ?? null,
    post_cost_ml: risk.postMitigationCostML ?? null,
    post_cost_max: risk.postMitigationCostMax ?? null,
    post_time_min: risk.postMitigationTimeMin ?? null,
    post_time_ml: risk.postMitigationTimeML ?? null,
    post_time_max: risk.postMitigationTimeMax ?? null,
    created_at: risk.createdAt,
    updated_at: risk.updatedAt,
    closure_note: risk.closureNote?.trim() ? risk.closureNote.trim() : null,
    // Audit fields are stamped server-side from the authenticated session.
    closed_at: null,
    closed_by: null,
    created_by: null,
    last_reviewed_at: null,
    last_reviewed_by: null,
    last_review_month: null,
  };
}

/** Public alias for tests and API boundary callers. */
export function mapRiskToRow(risk: Risk, projectId: string): RiskInsertRow {
  return riskToRow(risk, projectId);
}

/**
 * Fetch all risks for the active project, ordered by created_at ascending.
 * Returns domain Risk[] for use in the store.
 * @param projectId - Project UUID (required).
 */
export async function listRisks(projectId?: string): Promise<Risk[]> {
  const pid = requireRiskProjectId(projectId);
  const res = await fetch(`/api/projects/${encodeURIComponent(pid)}/risks`, {
    method: "GET",
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { risks?: RiskRow[]; error?: string };
  if (!res.ok) {
    const message = json.error?.trim() || `Failed to load risks (${res.status})`;
    console.error("[risks] listRisks", message);
    throw new Error(message);
  }
  const rows = (json.risks ?? []) as RiskRow[];
  return rows.map(rowToRisk);
}

/**
 * Sync risks for the active project: upsert the given list; any DB rows for the project not in
 * the list are soft-deleted (archived) by the server route, never hard-deleted.
 * Returns the saved risks (with DB-assigned ids for rows that had non-UUID ids) so the
 * client can merge local-only fields by position and avoid losing data for newly created risks.
 * @param projectId - Project UUID (required).
 */
export async function replaceRisks(risks: Risk[], projectId?: string): Promise<Risk[]> {
  const pid = requireRiskProjectId(projectId);
  const rows = risks.map((r) => riskToRow(r, pid));

  const res = await fetch(`/api/projects/${encodeURIComponent(pid)}/risks`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ risks: rows }),
  });
  const json = (await res.json().catch(() => ({}))) as { risks?: RiskRow[]; error?: string };
  if (!res.ok) {
    const message = json.error?.trim() || `Failed to save risks (${res.status})`;
    console.error("[risks] replaceRisks", message);
    throw new Error(message);
  }
  const savedRows = (json.risks ?? []) as RiskRow[];
  return savedRows.map(rowToRisk);
}

/**
 * Update a single existing risk row for the active project.
 * @param projectId - Project UUID (required).
 */
export async function updateRiskRow(risk: Risk, projectId?: string): Promise<Risk> {
  const pid = requireRiskProjectId(projectId);
  const row = riskToRow(risk, pid);

  const res = await fetch(
    `/api/projects/${encodeURIComponent(pid)}/risks/${encodeURIComponent(risk.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ risk: row }),
    }
  );
  const json = (await res.json().catch(() => ({}))) as { risk?: RiskRow; error?: string };
  if (!res.ok) {
    const message = json.error?.trim() || `Failed to save risk (${res.status})`;
    console.error("[risks] updateRiskRow failed", message);
    throw new Error(message);
  }
  if (!json.risk) {
    const message = "Failed to save risk: missing saved row";
    console.error("[risks] updateRiskRow failed", message);
    throw new Error(message);
  }
  const saved = rowToRisk(json.risk);
  return saved;
}

/** Mark a single existing risk as reviewed for freshness tracking. Does not return or mutate risk content. */
export async function markRiskReviewed(riskId: string, projectId?: string): Promise<void> {
  const pid = requireRiskProjectId(projectId);
  const rid = riskId.trim();
  if (!rid) {
    throw new Error("riskId is required for risk review tracking");
  }

  const res = await fetch(
    `/api/projects/${encodeURIComponent(pid)}/risks/${encodeURIComponent(rid)}/review`,
    {
      method: "PATCH",
      cache: "no-store",
    }
  );
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    const message = json.error?.trim() || `Failed to mark risk reviewed (${res.status})`;
    console.error("[risks] markRiskReviewed", message);
    throw new Error(message);
  }
}
