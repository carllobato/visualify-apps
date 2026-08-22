import { describe, it } from "node:test";
import assert from "node:assert";
import { computeMitigationOptimisation } from "./computeMitigationOptimisation";
import type { SimulationSnapshot } from "@/domain/simulation/simulation.types";

/** Minimal stub matching snapshot.p80Cost path used by getNeutralP80Cost (Outputs page uses snapshot.p80Cost). */
function makeNeutralSnapshot(p80Cost: number): SimulationSnapshot {
  return {
    id: "stub",
    timestampIso: new Date().toISOString(),
    iterations: 100,
    p20Cost: p80Cost * 0.6,
    p50Cost: p80Cost * 0.8,
    p80Cost,
    p90Cost: p80Cost * 1.2,
    totalExpectedCost: p80Cost,
    totalExpectedDays: 0,
    risks: [],
  };
}

describe("computeMitigationOptimisation", () => {
  it("zero spend band yields 0 benefit at spend=0", () => {
    const snapshot = makeNeutralSnapshot(100_000);
    const result = computeMitigationOptimisation({
      risks: [
        {
          id: "r1",
          title: "R1",
          mitigationProfile: { effectiveness: 0.5, confidence: 0.5 },
        },
      ],
      neutralSnapshot: snapshot,
      spendSteps: [0, 50_000, 100_000],
    });
    const first = result.ranked[0];
    assert(first);
    const zeroBand = first.curve.find((p) => p.cumulativeSpend === 0);
    assert(zeroBand);
    assert.strictEqual(zeroBand.cumulativeBenefit, 0);
    assert.strictEqual(zeroBand.incrementalSpend, 0);
    assert.strictEqual(zeroBand.marginalBenefit, 0);
  });

  it("cumulativeBenefit non-decreasing", () => {
    const snapshot = makeNeutralSnapshot(200_000);
    const result = computeMitigationOptimisation({
      risks: [
        {
          id: "r1",
          title: "Risk One",
          mitigationProfile: { effectiveness: 0.4, confidence: 0.6 },
        },
      ],
      neutralSnapshot: snapshot,
      spendSteps: [0, 25_000, 50_000, 100_000, 200_000],
    });
    const first = result.ranked[0];
    assert(first);
    for (let i = 1; i < first.curve.length; i++) {
      assert(
        first.curve[i].cumulativeBenefit >= first.curve[i - 1].cumulativeBenefit - 1e-9,
        `cumulativeBenefit should be non-decreasing at index ${i}`
      );
    }
  });

  it("benefitPerDollar non-increasing (diminishing returns) for single risk with fixed params", () => {
    const snapshot = makeNeutralSnapshot(150_000);
    const result = computeMitigationOptimisation({
      risks: [
        {
          id: "r1",
          title: "Single",
          mitigationProfile: { effectiveness: 0.5, confidence: 0.5 },
        },
      ],
      neutralSnapshot: snapshot,
      spendSteps: [0, 25_000, 50_000, 100_000, 200_000],
    });
    const first = result.ranked[0];
    assert(first);
    for (let i = 2; i < first.curve.length; i++) {
      const prevRate = first.curve[i - 1].benefitPerDollar;
      const currRate = first.curve[i].benefitPerDollar;
      assert(
        currRate <= prevRate + 1e-9,
        `benefitPerDollar should be non-increasing (diminishing returns) at index ${i}`
      );
    }
  });

  it("deterministic deepEqual", () => {
    const snapshot = makeNeutralSnapshot(100_000);
    const risks = [
      { id: "a", title: "A", mitigationProfile: { effectiveness: 0.3, confidence: 0.5 } },
      { id: "b", title: "B", mitigationStrength: 0.5 },
    ];
    const a = computeMitigationOptimisation({ risks, neutralSnapshot: snapshot });
    const b = computeMitigationOptimisation({ risks, neutralSnapshot: snapshot });
    assert.deepStrictEqual(a.baseline, b.baseline);
    assert.strictEqual(a.ranked.length, b.ranked.length);
    for (let i = 0; i < a.ranked.length; i++) {
      assert.strictEqual(a.ranked[i].riskId, b.ranked[i].riskId);
      assert.strictEqual(a.ranked[i].riskName, b.ranked[i].riskName);
      assert.strictEqual(a.ranked[i].leverageScore, b.ranked[i].leverageScore);
      assert.deepStrictEqual(a.ranked[i].curve, b.ranked[i].curve);
    }
    assert.deepStrictEqual(a.meta, b.meta);
  });

  it("ranking stability on fixed dataset of 3 risks", () => {
    const snapshot = makeNeutralSnapshot(300_000);
    snapshot.risks = [
      { id: "r1", title: "Low", expectedCost: 30_000, expectedDays: 0, simMeanCost: 30_000, simMeanDays: 0 },
      { id: "r2", title: "Mid", expectedCost: 100_000, expectedDays: 0, simMeanCost: 100_000, simMeanDays: 0 },
      { id: "r3", title: "High", expectedCost: 170_000, expectedDays: 0, simMeanCost: 170_000, simMeanDays: 0 },
    ];
    const risks = [
      { id: "r1", title: "Low", mitigationProfile: { effectiveness: 0.2, confidence: 0.4 } },
      { id: "r2", title: "Mid", mitigationProfile: { effectiveness: 0.5, confidence: 0.6 } },
      { id: "r3", title: "High", mitigationProfile: { effectiveness: 0.8, confidence: 0.7 } },
    ];
    const result = computeMitigationOptimisation({ risks, neutralSnapshot: snapshot });
    assert.strictEqual(result.ranked.length, 3);
    const ids = result.ranked.map((r) => r.riskId);
    const run2 = computeMitigationOptimisation({ risks, neutralSnapshot: snapshot });
    assert.deepStrictEqual(run2.ranked.map((r) => r.riskId), ids, "ranking order should be stable");
  });

  it("materiality fallback uses lifecycle status, not mitigation text", () => {
    // Empty snapshot.risks forces p×impact materiality fallback.
    const snapshot = makeNeutralSnapshot(100_000);
    const profile = { effectiveness: 0.5, confidence: 0.5 };

    const openWithText = computeMitigationOptimisation({
      risks: [
        {
          id: "big-pre",
          title: "BigPre",
          status: "Open",
          mitigation: "Would have forced post under legacy text rule",
          probability: 1,
          preMitigationCostML: 200_000,
          postMitigationCostML: 1_000,
          mitigationProfile: profile,
        },
        {
          id: "small-pre",
          title: "SmallPre",
          status: "Open",
          probability: 1,
          preMitigationCostML: 50_000,
          postMitigationCostML: 50_000,
          mitigationProfile: profile,
        },
      ],
      neutralSnapshot: snapshot,
      spendSteps: [0, 50_000],
    });
    assert.strictEqual(openWithText.ranked[0].riskId, "big-pre");
    assert.ok(openWithText.meta.usedFallbackMaterialityCount > 0);

    const mitigating = computeMitigationOptimisation({
      risks: [
        {
          id: "post-small",
          title: "PostSmall",
          status: "Mitigating",
          mitigation: "text present",
          probability: 1,
          preMitigationCostML: 200_000,
          postMitigationCostML: 10_000,
          mitigationProfile: profile,
        },
        {
          id: "post-large",
          title: "PostLarge",
          status: "Mitigating",
          probability: 1,
          preMitigationCostML: 5_000,
          postMitigationCostML: 80_000,
          mitigationProfile: profile,
        },
      ],
      neutralSnapshot: snapshot,
      spendSteps: [0, 50_000],
    });
    assert.strictEqual(mitigating.ranked[0].riskId, "post-large");
  });

  it("explicit Mitigating status uses post/residual probability for materiality", () => {
    const snapshot = makeNeutralSnapshot(100_000);
    const profile = { effectiveness: 0.5, confidence: 0.5 };
    const result = computeMitigationOptimisation({
      risks: [
        {
          id: "high-post-prob",
          title: "HighPostProb",
          status: "Mitigating",
          preMitigationCostML: 100_000,
          postMitigationCostML: 100_000,
          inherentRating: { probability: 1 },
          residualRating: { probability: 5 },
          mitigationProfile: profile,
        },
        {
          id: "low-post-prob",
          title: "LowPostProb",
          status: "Mitigating",
          preMitigationCostML: 100_000,
          postMitigationCostML: 100_000,
          inherentRating: { probability: 5 },
          residualRating: { probability: 1 },
          mitigationProfile: profile,
        },
      ],
      neutralSnapshot: snapshot,
      spendSteps: [0, 50_000],
    });
    assert.strictEqual(result.ranked[0].riskId, "high-post-prob");
  });

  it("legacy optimisation input without status defaults to pre/inherent, not residual", () => {
    const snapshot = makeNeutralSnapshot(100_000);
    const profile = { effectiveness: 0.5, confidence: 0.5 };
    const result = computeMitigationOptimisation({
      risks: [
        {
          id: "high-inherent",
          title: "HighInherent",
          // no status — compatibility default
          mitigation: "text must not force residual",
          preMitigationCostML: 100_000,
          postMitigationCostML: 100_000,
          inherentRating: { probability: 5 },
          residualRating: { probability: 1 },
          mitigationProfile: profile,
        },
        {
          id: "low-inherent",
          title: "LowInherent",
          preMitigationCostML: 100_000,
          postMitigationCostML: 100_000,
          inherentRating: { probability: 1 },
          residualRating: { probability: 5 },
          mitigationProfile: profile,
        },
      ],
      neutralSnapshot: snapshot,
      spendSteps: [0, 50_000],
    });
    assert.strictEqual(result.ranked[0].riskId, "high-inherent");
  });

  it("still ranks from neutral snapshot scenario targets when per-risk expectedCost is present", () => {
    const snapshot = makeNeutralSnapshot(300_000);
    snapshot.risks = [
      { id: "r1", title: "FromSnapshotLow", expectedCost: 10_000, expectedDays: 0, simMeanCost: 10_000, simMeanDays: 0 },
      { id: "r2", title: "FromSnapshotHigh", expectedCost: 200_000, expectedDays: 0, simMeanCost: 200_000, simMeanDays: 0 },
    ];
    const result = computeMitigationOptimisation({
      risks: [
        {
          id: "r1",
          title: "FromSnapshotLow",
          status: "Open",
          preMitigationCostML: 999_000,
          postMitigationCostML: 999_000,
          mitigationProfile: { effectiveness: 0.5, confidence: 0.5 },
        },
        {
          id: "r2",
          title: "FromSnapshotHigh",
          status: "Open",
          preMitigationCostML: 1,
          postMitigationCostML: 1,
          mitigationProfile: { effectiveness: 0.5, confidence: 0.5 },
        },
      ],
      neutralSnapshot: snapshot,
    });
    assert.strictEqual(result.ranked[0].riskId, "r2");
    assert.strictEqual(result.baseline.neutralTargetCost, 300_000);
  });
});
