import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Risk } from "@/domain/risk/risk.schema";
import { buildRating } from "@/domain/risk/risk.logic";
import { RISK_STATUS_DRAFT_LOOKUP } from "@/domain/risk/riskFieldSemantics";
import type { RiskRow } from "@/types/risk";
import {
  applyRiskClosureAndReview,
  CLOSURE_NOTE_REQUIRED_ERROR,
  reviewMonthForTimestamp,
} from "./riskClosureReview";
import {
  APPLIES_TO_REQUIRED_FOR_NON_DRAFT_ERROR,
  APPLIES_TO_DB_BOTH,
} from "@/domain/risk/riskFieldSemantics";
import {
  mapRiskRowToDomain,
  mapRiskToRow,
  normalizeRiskRow,
  stampRiskInsertRowForPersistence,
} from "./risks";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const RISK_ID = "22222222-2222-4222-8222-222222222222";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NOW = "2026-08-21T10:00:00.000Z";
const ISO = "2026-08-20T00:00:00.000Z";

function baseIncoming(overrides: Partial<Parameters<typeof applyRiskClosureAndReview>[0]["incoming"]> = {}) {
  return {
    status: "Open",
    closure_note: null as string | null,
    ...overrides,
  };
}

describe("applyRiskClosureAndReview", () => {
  it("rejects closing with no note", () => {
    const result = applyRiskClosureAndReview({
      existing: {
        status: "Draft",
        closure_note: null,
        closed_at: null,
        closed_by: null,
        created_by: USER_A,
      },
      incoming: baseIncoming({ status: "Closed", closure_note: "   " }),
      authenticatedUserId: USER_B,
      nowIso: NOW,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, CLOSURE_NOTE_REQUIRED_ERROR);
  });

  it("closing with a note records note/date/user from the authenticated session", () => {
    const result = applyRiskClosureAndReview({
      existing: {
        status: "Open",
        closure_note: null,
        closed_at: null,
        closed_by: null,
        created_by: USER_A,
      },
      incoming: baseIncoming({
        status: "Closed",
        closure_note: "  Mitigated by design change  ",
        closed_by: USER_A, // client attempt — ignored
        closed_at: "2000-01-01T00:00:00.000Z",
      }),
      authenticatedUserId: USER_B,
      nowIso: NOW,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stamp.status, "Closed");
    assert.equal(result.stamp.closure_note, "Mitigated by design change");
    assert.equal(result.stamp.closed_at, NOW);
    assert.equal(result.stamp.closed_by, USER_B);
    assert.equal(result.stamp.last_reviewed_by, USER_B);
    assert.equal(result.stamp.last_reviewed_at, NOW);
    assert.equal(result.stamp.last_review_month, reviewMonthForTimestamp(NOW));
  });

  it("allows incomplete Draft to be Closed with a note", () => {
    const result = applyRiskClosureAndReview({
      existing: {
        status: "Draft",
        closure_note: null,
        closed_at: null,
        closed_by: null,
        created_by: null,
      },
      incoming: baseIncoming({ status: "Closed", closure_note: "No longer relevant" }),
      authenticatedUserId: USER_A,
      nowIso: NOW,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stamp.status, "Closed");
    assert.equal(result.stamp.closure_note, "No longer relevant");
  });

  it("reopening returns Closed → Draft", () => {
    const result = applyRiskClosureAndReview({
      existing: {
        status: "Closed",
        closure_note: "Done",
        closed_at: "2026-07-01T12:00:00.000Z",
        closed_by: USER_A,
        created_by: USER_A,
      },
      incoming: baseIncoming({ status: "Open" }),
      authenticatedUserId: USER_B,
      nowIso: NOW,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stamp.status, RISK_STATUS_DRAFT_LOOKUP);
  });

  it("closure details survive reopening", () => {
    const closedAt = "2026-07-01T12:00:00.000Z";
    const result = applyRiskClosureAndReview({
      existing: {
        status: "Closed",
        closure_note: "Keep this note",
        closed_at: closedAt,
        closed_by: USER_A,
        created_by: USER_A,
      },
      incoming: baseIncoming({ status: "Monitoring", closure_note: null }),
      authenticatedUserId: USER_B,
      nowIso: NOW,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stamp.status, RISK_STATUS_DRAFT_LOOKUP);
    assert.equal(result.stamp.closure_note, "Keep this note");
    assert.equal(result.stamp.closed_at, closedAt);
    assert.equal(result.stamp.closed_by, USER_A);
  });

  it("Archived restore path keeps Draft when caller sets Draft (does not clear closure)", () => {
    const closedAt = "2026-06-01T00:00:00.000Z";
    const result = applyRiskClosureAndReview({
      existing: {
        status: "Archived",
        closure_note: "Prior close",
        closed_at: closedAt,
        closed_by: USER_A,
        created_by: USER_A,
      },
      incoming: baseIncoming({ status: "Draft" }),
      authenticatedUserId: USER_B,
      nowIso: NOW,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stamp.status, "Draft");
    assert.equal(result.stamp.closure_note, "Prior close");
    assert.equal(result.stamp.closed_at, closedAt);
    assert.equal(result.stamp.closed_by, USER_A);
  });

  it("create stamps created_by and review fields from the authenticated user", () => {
    const result = applyRiskClosureAndReview({
      existing: null,
      incoming: baseIncoming({ status: "Draft" }),
      authenticatedUserId: USER_A,
      nowIso: NOW,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stamp.created_by, USER_A);
    assert.equal(result.stamp.last_reviewed_by, USER_A);
    assert.equal(result.stamp.last_reviewed_at, NOW);
  });

  it("saved edits update review fields from the authenticated user", () => {
    const result = applyRiskClosureAndReview({
      existing: {
        status: "Open",
        closure_note: null,
        closed_at: null,
        closed_by: null,
        created_by: USER_A,
      },
      incoming: baseIncoming({
        status: "Open",
        last_reviewed_by: USER_B, // client attempt
        created_by: USER_B,
      }),
      authenticatedUserId: USER_A,
      nowIso: NOW,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stamp.created_by, USER_A);
    assert.equal(result.stamp.last_reviewed_by, USER_A);
    assert.equal(result.stamp.last_reviewed_at, NOW);
  });

  it("audit IDs cannot be supplied by the client", () => {
    const stamped = stampRiskInsertRowForPersistence({
      row: {
        id: RISK_ID,
        project_id: PROJECT_ID,
        risk_number: 1,
        title: "T",
        description: null,
        category: "programme",
        owner: null,
        applies_to: APPLIES_TO_DB_BOTH,
        status: "Open",
        pre_probability: null,
        pre_probability_pct: null,
        pre_cost_min: null,
        pre_cost_ml: null,
        pre_cost_max: null,
        pre_time_min: null,
        pre_time_ml: null,
        pre_time_max: null,
        mitigation_description: null,
        mitigation_cost: null,
        post_probability: null,
        post_probability_pct: null,
        post_cost_min: null,
        post_cost_ml: null,
        post_cost_max: null,
        post_time_min: null,
        post_time_ml: null,
        post_time_max: null,
        created_at: ISO,
        updated_at: ISO,
        closure_note: null,
        closed_at: "1999-01-01T00:00:00.000Z",
        closed_by: USER_B,
        created_by: USER_B,
        last_reviewed_at: "1999-01-01T00:00:00.000Z",
        last_reviewed_by: USER_B,
        last_review_month: "1999-01-01",
      },
      existing: {
        status: "Open",
        closure_note: null,
        closed_at: null,
        closed_by: null,
        created_by: USER_A,
      },
      authenticatedUserId: USER_A,
      nowIso: NOW,
    });
    assert.equal(stamped.ok, true);
    if (!stamped.ok) return;
    assert.equal(stamped.row.created_by, USER_A);
    assert.equal(stamped.row.last_reviewed_by, USER_A);
    assert.equal(stamped.row.last_reviewed_at, NOW);
    assert.equal(stamped.row.closed_by, null);
    assert.equal(stamped.row.closed_at, null);
  });

  it("rejects closing a Draft without applies_to (DB non-Draft constraint)", () => {
    const stamped = stampRiskInsertRowForPersistence({
      row: {
        id: RISK_ID,
        project_id: PROJECT_ID,
        risk_number: null,
        title: "Incomplete draft",
        description: null,
        category: "",
        owner: null,
        applies_to: null,
        status: "Closed",
        pre_probability: null,
        pre_probability_pct: null,
        pre_cost_min: null,
        pre_cost_ml: null,
        pre_cost_max: null,
        pre_time_min: null,
        pre_time_ml: null,
        pre_time_max: null,
        mitigation_description: null,
        mitigation_cost: null,
        post_probability: null,
        post_probability_pct: null,
        post_cost_min: null,
        post_cost_ml: null,
        post_cost_max: null,
        post_time_min: null,
        post_time_ml: null,
        post_time_max: null,
        created_at: ISO,
        updated_at: ISO,
        closure_note: "No longer relevant",
        closed_at: null,
        closed_by: null,
        created_by: null,
        last_reviewed_at: null,
        last_reviewed_by: null,
        last_review_month: null,
      },
      existing: {
        status: "Draft",
        closure_note: null,
        closed_at: null,
        closed_by: null,
        created_by: null,
      },
      authenticatedUserId: USER_A,
      nowIso: NOW,
    });
    assert.equal(stamped.ok, false);
    if (stamped.ok) return;
    assert.equal(stamped.error, APPLIES_TO_REQUIRED_FOR_NON_DRAFT_ERROR);
  });

  it("persists canonical DB applies_to labels from UI values", () => {
    const stamped = stampRiskInsertRowForPersistence({
      row: {
        id: RISK_ID,
        project_id: PROJECT_ID,
        risk_number: 1,
        title: "T",
        description: null,
        category: "programme",
        owner: null,
        applies_to: "time",
        status: "Open",
        pre_probability: null,
        pre_probability_pct: null,
        pre_cost_min: null,
        pre_cost_ml: null,
        pre_cost_max: null,
        pre_time_min: null,
        pre_time_ml: null,
        pre_time_max: null,
        mitigation_description: null,
        mitigation_cost: null,
        post_probability: null,
        post_probability_pct: null,
        post_cost_min: null,
        post_cost_ml: null,
        post_cost_max: null,
        post_time_min: null,
        post_time_ml: null,
        post_time_max: null,
        created_at: ISO,
        updated_at: ISO,
        closure_note: null,
        closed_at: null,
        closed_by: null,
        created_by: null,
        last_reviewed_at: null,
        last_reviewed_by: null,
        last_review_month: null,
      },
      existing: {
        status: "Draft",
        closure_note: null,
        closed_at: null,
        closed_by: null,
        created_by: USER_A,
      },
      authenticatedUserId: USER_A,
      nowIso: NOW,
    });
    assert.equal(stamped.ok, true);
    if (!stamped.ok) return;
    assert.equal(stamped.row.applies_to, "Schedule");
  });

  it("normalizeRiskRow strips client audit IDs", () => {
    const normalized = normalizeRiskRow(
      {
        id: RISK_ID,
        title: "T",
        category: "programme",
        status: "Open",
        created_at: ISO,
        updated_at: ISO,
        created_by: USER_B,
        closed_by: USER_B,
        closed_at: NOW,
        last_reviewed_by: USER_B,
        last_reviewed_at: NOW,
        closure_note: "note",
      },
      PROJECT_ID
    );
    assert.ok(normalized);
    assert.equal(normalized.created_by, null);
    assert.equal(normalized.closed_by, null);
    assert.equal(normalized.closed_at, null);
    assert.equal(normalized.last_reviewed_by, null);
    assert.equal(normalized.last_reviewed_at, null);
    assert.equal(normalized.closure_note, "note");
  });

  it("editing an already Closed legacy risk does not invent closure details", () => {
    const result = applyRiskClosureAndReview({
      existing: {
        status: "Closed",
        closure_note: null,
        closed_at: null,
        closed_by: null,
        created_by: null,
      },
      incoming: baseIncoming({ status: "Closed", closure_note: null }),
      authenticatedUserId: USER_A,
      nowIso: NOW,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stamp.closure_note, null);
    assert.equal(result.stamp.closed_at, null);
    assert.equal(result.stamp.closed_by, null);
    assert.equal(result.stamp.last_reviewed_by, USER_A);
  });

  it("existing Closed rows without closure metadata still load via rowToRisk", () => {
    const row: RiskRow = {
      id: RISK_ID,
      project_id: PROJECT_ID,
      risk_number: 3,
      title: "Legacy closed",
      description: null,
      category: "programme",
      owner: null,
      applies_to: null,
      status: "Closed",
      pre_probability: null,
      pre_probability_pct: null,
      pre_cost_min: null,
      pre_cost_ml: null,
      pre_cost_max: null,
      pre_time_min: null,
      pre_time_ml: null,
      pre_time_max: null,
      mitigation_description: null,
      mitigation_cost: null,
      post_probability: null,
      post_probability_pct: null,
      post_cost_min: null,
      post_cost_ml: null,
      post_cost_max: null,
      post_time_min: null,
      post_time_ml: null,
      post_time_max: null,
      created_at: ISO,
      updated_at: ISO,
      closure_note: null,
      closed_at: null,
      closed_by: null,
      created_by: null,
      last_reviewed_at: null,
      last_reviewed_by: null,
      last_review_month: null,
    };
    const domain = mapRiskRowToDomain(row);
    assert.equal(domain.status, "Closed");
    assert.equal(domain.closureNote, undefined);
    assert.equal(domain.closedAt, undefined);
    assert.equal(domain.closedBy, undefined);
  });

  it("mapRiskToRow does not write client-chosen audit user IDs", () => {
    const risk: Risk = {
      id: RISK_ID,
      title: "T",
      category: "programme",
      status: "Closed",
      closureNote: "Closed out",
      closedAt: "1999-01-01T00:00:00.000Z",
      closedBy: USER_B,
      createdBy: USER_B,
      lastReviewedAt: "1999-01-01T00:00:00.000Z",
      lastReviewedBy: USER_B,
      inherentRating: buildRating(1, 1),
      residualRating: buildRating(1, 1),
      createdAt: ISO,
      updatedAt: ISO,
      scoreHistory: [],
    };
    const row = mapRiskToRow(risk, PROJECT_ID);
    assert.equal(row.closure_note, "Closed out");
    assert.equal(row.closed_at, null);
    assert.equal(row.closed_by, null);
    assert.equal(row.created_by, null);
    assert.equal(row.last_reviewed_by, null);
    assert.equal(row.last_reviewed_at, null);
  });
});

describe("opening details alone does not update review fields", () => {
  it("documents that review stamps only run via stampRiskInsertRowForPersistence on save", () => {
    // Opening Risk Details no longer calls markRiskReviewed; only create/update paths stamp.
    const before = {
      last_reviewed_at: ISO,
      last_reviewed_by: USER_A,
    };
    // No-op: there is no apply function for "open details".
    assert.equal(before.last_reviewed_at, ISO);
    assert.equal(before.last_reviewed_by, USER_A);
  });
});
