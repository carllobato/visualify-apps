/**
 * riskTriggerProbability01 + effectiveForwardCostImpact: canonical lifecycle selection.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import type { Risk } from "@/domain/risk/risk.schema";
import { effectiveForwardCostImpact, probability01FromScale, riskTriggerProbability01 } from "@/domain/risk/risk.logic";

const ISO = "2026-01-01T00:00:00.000Z";
const preRating = { probability: 5 as const, consequence: 3 as const, score: 15 as const, level: "high" as const };
const postRating = { probability: 1 as const, consequence: 2 as const, score: 2 as const, level: "low" as const };

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    title: "Risk",
    category: "programme",
    status: "Open",
    inherentRating: preRating,
    residualRating: postRating,
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

describe("riskTriggerProbability01", () => {
  it("Open + mitigation text / active legacy profile uses pre probability", () => {
    const open = makeRisk({
      status: "Open",
      mitigation: "Has mitigation narrative",
      mitigationProfile: { status: "active", effectiveness: 0.5, confidence: 0.5, reduces: 0.2, lagMonths: 0 },
    });
    assert.strictEqual(riskTriggerProbability01(open), probability01FromScale(5));
    assert.notStrictEqual(riskTriggerProbability01(open), probability01FromScale(1));
  });

  it("Monitoring uses pre probability", () => {
    const monitoring = makeRisk({
      status: "Monitoring",
      mitigation: "Planned mitigation",
    });
    assert.strictEqual(riskTriggerProbability01(monitoring), probability01FromScale(5));
  });

  it("Mitigating uses post probability", () => {
    const mitigating = makeRisk({ status: "Mitigating" });
    assert.strictEqual(riskTriggerProbability01(mitigating), probability01FromScale(1));
  });

  it("prefers explicit 0–1 probability when present", () => {
    const risk = makeRisk({ status: "Open", probability: 0.35 });
    assert.strictEqual(riskTriggerProbability01(risk), 0.35);
  });
});

describe("effectiveForwardCostImpact", () => {
  it("Open and Monitoring use pre cost even when mitigation text is present", () => {
    const open = makeRisk({
      status: "Open",
      mitigation: "Mitigation narrative",
      preMitigationCostML: 100_000,
      postMitigationCostML: 40_000,
    });
    assert.strictEqual(effectiveForwardCostImpact(open), 100_000);

    const monitoring = makeRisk({
      status: "Monitoring",
      mitigation: "Planned mitigation",
      preMitigationCostML: 80_000,
      postMitigationCostML: 20_000,
    });
    assert.strictEqual(effectiveForwardCostImpact(monitoring), 80_000);
  });

  it("Mitigating uses post cost; missing post does not fall back to pre", () => {
    const complete = makeRisk({
      status: "Mitigating",
      preMitigationCostML: 100_000,
      postMitigationCostML: 40_000,
    });
    assert.strictEqual(effectiveForwardCostImpact(complete), 40_000);

    const incomplete = makeRisk({
      status: "Mitigating",
      mitigation: "Has text",
      preMitigationCostML: 100_000,
      postMitigationCostML: undefined,
    });
    assert.strictEqual(effectiveForwardCostImpact(incomplete, 55_000), 55_000);
    assert.notStrictEqual(effectiveForwardCostImpact(incomplete, 55_000), 100_000);
  });
});
