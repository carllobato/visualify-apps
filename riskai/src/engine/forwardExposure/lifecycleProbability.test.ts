/**
 * Forward-exposure baseline probability follows canonical lifecycle via riskTriggerProbability01.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import type { Risk } from "@/domain/risk/risk.schema";
import { probability01FromScale } from "@/domain/risk/risk.logic";
import { applyBaseline } from "@/engine/forwardExposure/baseline";
import { sanitizeRiskForExposure } from "@/engine/forwardExposure/validate";

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
    preMitigationCostML: 100_000,
    postMitigationCostML: 20_000,
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

describe("forward exposure lifecycle probability", () => {
  it("Open with mitigation text uses pre probability", () => {
    const risk = makeRisk({
      status: "Open",
      mitigation: "Narrative",
      mitigationProfile: { status: "active", effectiveness: 0.5, confidence: 0.5, reduces: 0.2, lagMonths: 0 },
    });
    const { sanitized } = sanitizeRiskForExposure(risk);
    assert.strictEqual(sanitized.probability, probability01FromScale(5));
    assert.strictEqual(applyBaseline(sanitized, "neutral").probability, probability01FromScale(5));
  });

  it("Monitoring uses pre probability; Mitigating uses post", () => {
    const monitoring = sanitizeRiskForExposure(makeRisk({ status: "Monitoring", mitigation: "Plan" })).sanitized;
    assert.strictEqual(monitoring.probability, probability01FromScale(5));

    const mitigating = sanitizeRiskForExposure(makeRisk({ status: "Mitigating" })).sanitized;
    assert.strictEqual(mitigating.probability, probability01FromScale(1));
    assert.strictEqual(applyBaseline(mitigating, "neutral").probability, probability01FromScale(1));
  });
});
