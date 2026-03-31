import { describe, it } from "node:test";
import assert from "node:assert";
import type { Risk } from "@/domain/risk/risk.schema";
import { buildSimulationInputAuditRows } from "@/lib/runDataSimulationInputAudit";

const ISO = "2026-01-01T00:00:00.000Z";

function rating(probability: 1 | 2 | 3 | 4 | 5) {
  return {
    probability,
    consequence: 3 as const,
    score: (probability * 3) as 3 | 6 | 9 | 12 | 15,
    level: "high" as const,
  };
}

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "risk-1",
    title: "Risk 1",
    category: "programme",
    status: "Monitoring",
    inherentRating: rating(5),
    residualRating: rating(2),
    preMitigationCostML: 100,
    preMitigationTimeML: 20,
    postMitigationCostML: 40,
    postMitigationTimeML: 5,
    mitigationCost: 20,
    appliesTo: "both",
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function rowFor(risk: Risk) {
  const rows = buildSimulationInputAuditRows([risk], null);
  assert.strictEqual(rows.length, 1);
  return rows[0];
}

describe("runDataSimulationInputAudit", () => {
  it("calculates cost reduction and cost efficiency for monitoring risk", () => {
    const row = rowFor(makeRisk());
    // pre_expected_cost = 1.0 * 100 = 100; post_expected_cost = 0.4 * 40 = 16; reduction = 84
    assert.strictEqual(row.potentialReductionCost, 84);
    assert.strictEqual(row.costEfficiency, 4.2);
  });

  it("calculates time reduction and time efficiency for monitoring risk", () => {
    const row = rowFor(makeRisk());
    // pre_expected_time = 1.0 * 20 = 20; post_expected_time = 0.4 * 5 = 2; reduction = 18
    assert.strictEqual(row.potentialReductionTime, 18);
    assert.strictEqual(row.timeEfficiency, 0.9);
  });

  it("respects appliesTo: cost-only -> time=0, time-only -> cost=0, both -> both > 0", () => {
    const costOnly = rowFor(
      makeRisk({
        id: "cost-only",
        appliesTo: "cost",
        postMitigationCostML: 50,
        postMitigationTimeML: undefined,
      })
    );
    assert.strictEqual(costOnly.potentialReductionTime, 0);
    assert.ok((costOnly.potentialReductionCost ?? 0) > 0);

    const timeOnly = rowFor(
      makeRisk({
        id: "time-only",
        appliesTo: "time",
        postMitigationCostML: undefined,
        postMitigationTimeML: 8,
      })
    );
    assert.strictEqual(timeOnly.potentialReductionCost, 0);
    assert.ok((timeOnly.potentialReductionTime ?? 0) > 0);

    const both = rowFor(makeRisk({ id: "both", appliesTo: "both" }));
    assert.ok((both.potentialReductionCost ?? 0) > 0);
    assert.ok((both.potentialReductionTime ?? 0) > 0);
  });

  it("keeps monitoring opportunity fields null for non-monitoring lifecycle buckets", () => {
    const open = rowFor(makeRisk({ id: "open", status: "Open" }));
    const mitigating = rowFor(makeRisk({ id: "mitigating", status: "Mitigating" }));
    const closed = rowFor(makeRisk({ id: "closed", status: "Closed" }));
    const archived = rowFor(makeRisk({ id: "archived", status: "Archived" }));

    for (const row of [open, mitigating, closed, archived]) {
      assert.strictEqual(row.potentialReductionCost, null);
      assert.strictEqual(row.potentialReductionTime, null);
      assert.strictEqual(row.costEfficiency, null);
      assert.strictEqual(row.timeEfficiency, null);
    }
    assert.strictEqual(closed.included, false);
    assert.strictEqual(archived.included, false);
  });

  it("guards incomplete post data without crashing (missing post cost)", () => {
    const row = rowFor(
      makeRisk({
        id: "missing-post-cost",
        postMitigationCostML: undefined,
        postMitigationTimeML: 5,
      })
    );
    assert.strictEqual(row.flags.postDataIncomplete, true);
    assert.strictEqual(row.potentialReductionCost, null);
    assert.strictEqual(row.potentialReductionTime, 18);
  });

  it("guards incomplete post data without crashing (missing post time)", () => {
    const row = rowFor(
      makeRisk({
        id: "missing-post-time",
        postMitigationCostML: 40,
        postMitigationTimeML: undefined,
      })
    );
    assert.strictEqual(row.flags.postDataIncomplete, true);
    assert.strictEqual(row.potentialReductionCost, 84);
    assert.strictEqual(row.potentialReductionTime, null);
  });

  it("supports view-aware eligibility inputs (qualify cost-only vs schedule-only)", () => {
    const costOnly = rowFor(
      makeRisk({
        id: "eligible-cost-only",
        appliesTo: "cost",
        postMitigationCostML: 20,
        postMitigationTimeML: undefined,
      })
    );
    assert.ok((costOnly.potentialReductionCost ?? 0) > 0);
    assert.strictEqual(costOnly.potentialReductionTime, 0);
    assert.strictEqual(costOnly.flags.postDataIncomplete, false);

    const scheduleOnly = rowFor(
      makeRisk({
        id: "eligible-schedule-only",
        appliesTo: "time",
        postMitigationCostML: undefined,
        postMitigationTimeML: 2,
      })
    );
    assert.strictEqual(scheduleOnly.potentialReductionCost, 0);
    assert.ok((scheduleOnly.potentialReductionTime ?? 0) > 0);
    assert.strictEqual(scheduleOnly.flags.postDataIncomplete, false);
  });

  it("handles mitigation cost edge cases: missing, zero, negative", () => {
    const missingCost = rowFor(makeRisk({ id: "missing-cost", mitigationCost: undefined }));
    assert.strictEqual(missingCost.costEfficiency, null);
    assert.strictEqual(missingCost.timeEfficiency, null);

    const zeroCost = rowFor(makeRisk({ id: "zero-cost", mitigationCost: 0 }));
    assert.strictEqual(zeroCost.costEfficiency, null);
    assert.strictEqual(zeroCost.timeEfficiency, null);

    const negativeCost = rowFor(makeRisk({ id: "negative-cost", mitigationCost: -1 as unknown as number }));
    assert.strictEqual(negativeCost.mitigationCost, null);
    assert.strictEqual(negativeCost.costEfficiency, null);
    assert.strictEqual(negativeCost.timeEfficiency, null);
  });

  it("computes zero/negative reductions correctly for probability-driven edge cases", () => {
    const zeroReduction = rowFor(
      makeRisk({
        id: "zero-reduction",
        inherentRating: rating(2), // 0.4
        residualRating: rating(2), // 0.4
        preMitigationCostML: 50,
        postMitigationCostML: 50,
        preMitigationTimeML: 10,
        postMitigationTimeML: 10,
      })
    );
    assert.strictEqual(zeroReduction.potentialReductionCost, 0);
    assert.strictEqual(zeroReduction.potentialReductionTime, 0);

    const negativeReduction = rowFor(
      makeRisk({
        id: "negative-reduction",
        inherentRating: rating(2), // 0.4
        residualRating: rating(5), // 1.0
        preMitigationCostML: 100,
        postMitigationCostML: 50,
        preMitigationTimeML: 20,
        postMitigationTimeML: 10,
      })
    );
    assert.strictEqual(negativeReduction.potentialReductionCost, -10);
    assert.strictEqual(negativeReduction.potentialReductionTime, -2);
  });
});
