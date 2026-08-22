/**
 * Server-side closure + review persistence for risk create/update/status mutations.
 * Audit user IDs always come from the authenticated session — never from client payloads.
 */

import {
  isRiskStatusClosed,
  RISK_STATUS_DRAFT_LOOKUP,
} from "@/domain/risk/riskFieldSemantics";

/** Existing DB snapshot fields needed to apply closure/review rules. */
export type RiskClosureReviewExisting = {
  status: string;
  closure_note: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
};

/** Client-normalized content row plus optional closure note (audit IDs ignored if present). */
export type RiskClosureReviewIncoming = {
  status: string;
  closure_note?: string | null;
  /** Ignored when supplied by the client. */
  closed_at?: string | null;
  closed_by?: string | null;
  created_by?: string | null;
  last_reviewed_at?: string | null;
  last_reviewed_by?: string | null;
  last_review_month?: string | null;
};

export type RiskClosureReviewStamp = {
  status: string;
  closure_note: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
  last_reviewed_at: string;
  last_reviewed_by: string;
  last_review_month: string;
};

export type ApplyRiskClosureReviewResult =
  | { ok: true; stamp: RiskClosureReviewStamp }
  | { ok: false; error: string };

export const CLOSURE_NOTE_REQUIRED_ERROR =
  "A closure note is required when closing a risk.";

/** First day of the calendar month for `at` as YYYY-MM-DD (matches DB date_trunc month). */
export function reviewMonthForTimestamp(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    const y = fallback.getUTCFullYear();
    const m = String(fallback.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function trimClosureNote(note: string | null | undefined): string {
  return (note ?? "").trim();
}

/**
 * Apply closure transition rules and review stamps for one risk mutation.
 * @param existing - null for insert; otherwise current DB values
 * @param incoming - normalized client row (audit IDs ignored)
 * @param authenticatedUserId - from server session
 * @param nowIso - mutation timestamp
 */
export function applyRiskClosureAndReview(args: {
  existing: RiskClosureReviewExisting | null;
  incoming: RiskClosureReviewIncoming;
  authenticatedUserId: string;
  nowIso: string;
}): ApplyRiskClosureReviewResult {
  const { existing, incoming, authenticatedUserId, nowIso } = args;
  const userId = authenticatedUserId.trim();
  if (!userId) {
    return { ok: false, error: "Authenticated user is required for risk audit fields." };
  }

  const previousStatus = existing?.status ?? "";
  const wasClosed = isRiskStatusClosed(previousStatus);
  let nextStatus = incoming.status;
  const enteringClosed = isRiskStatusClosed(nextStatus) && !wasClosed;
  const leavingClosed = wasClosed && !isRiskStatusClosed(nextStatus);

  if (leavingClosed) {
    nextStatus = RISK_STATUS_DRAFT_LOOKUP;
  }

  const incomingNote = trimClosureNote(incoming.closure_note);
  let closureNote: string | null;
  let closedAt: string | null;
  let closedBy: string | null;

  if (enteringClosed) {
    if (!incomingNote) {
      return { ok: false, error: CLOSURE_NOTE_REQUIRED_ERROR };
    }
    closureNote = incomingNote;
    closedAt = nowIso;
    closedBy = userId;
  } else if (wasClosed) {
    // Stay closed or reopen: never invent missing legacy closure metadata.
    // Reopen keeps prior note/date/user. Stay closed may update note when provided.
    closedAt = existing?.closed_at ?? null;
    closedBy = existing?.closed_by ?? null;
    if (leavingClosed) {
      closureNote = existing?.closure_note ?? null;
    } else if (incoming.closure_note !== undefined) {
      // Explicit client value — empty keeps existing for legacy rows without a note.
      if (incomingNote) {
        closureNote = incomingNote;
      } else {
        closureNote = existing?.closure_note ?? null;
      }
    } else {
      closureNote = existing?.closure_note ?? null;
    }
  } else {
    // Not closed: preserve any prior closure history (e.g. after reopen); never invent.
    closureNote = existing?.closure_note ?? null;
    closedAt = existing?.closed_at ?? null;
    closedBy = existing?.closed_by ?? null;
  }

  const createdBy =
    existing == null ? userId : (existing.created_by ?? null);

  return {
    ok: true,
    stamp: {
      status: nextStatus,
      closure_note: closureNote,
      closed_at: closedAt,
      closed_by: closedBy,
      created_by: createdBy,
      last_reviewed_at: nowIso,
      last_reviewed_by: userId,
      last_review_month: reviewMonthForTimestamp(nowIso),
    },
  };
}

/** Soft-archive orphan rows: status → Archived + review stamp; leave closure fields untouched. */
export function archiveOrphanReviewStamp(args: {
  authenticatedUserId: string;
  nowIso: string;
}): Pick<
  RiskClosureReviewStamp,
  "last_reviewed_at" | "last_reviewed_by" | "last_review_month"
> {
  const userId = args.authenticatedUserId.trim();
  return {
    last_reviewed_at: args.nowIso,
    last_reviewed_by: userId,
    last_review_month: reviewMonthForTimestamp(args.nowIso),
  };
}
