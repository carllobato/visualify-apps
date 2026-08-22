/**
 * Runnable-risk validator: post fields gated by canonical Mitigating status only.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import type { Risk } from "@/domain/risk/risk.schema";
import { getRiskValidationErrors, isRiskValid } from "@/domain/risk/runnable-risk.validator";

const ISO = "2026-01-01T00:00:00.000Z";
const rating = { probability: 3 as const, consequence: 3 as const, score: 9 as const, level: "high" as const };

function basePreFields(): Partial<Risk> {
  return {
    title: "Runnable risk",
    owner: "Owner",
    appliesTo: "both",
    preMitigationProbabilityPct: 50,
    preMitigationCostMin: 10_000,
    preMitigationCostML: 20_000,
    preMitigationCostMax: 30_000,
    preMitigationTimeMin: 5,
    preMitigationTimeML: 10,
    preMitigationTimeMax: 15,
    inherentRating: rating,
    residualRating: rating,
  };
}

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    title: "Risk",
    category: "programme",
    status: "Open",
    inherentRating: rating,
    residualRating: rating,
    createdAt: ISO,
    updatedAt: ISO,
    ...basePreFields(),
    ...overrides,
  };
}

describe("isRiskValid / getRiskValidationErrors", () => {
  it("Open + mitigation text / active legacy profile remains valid without post fields", () => {
    const risk = makeRisk({
      status: "Open",
      mitigation: "Do something",
      mitigationProfile: { status: "active", effectiveness: 0.5, confidence: 0.5, reduces: 0.2, lagMonths: 0 },
      postMitigationProbabilityPct: undefined,
      postMitigationCostMin: undefined,
      postMitigationCostML: undefined,
      postMitigationCostMax: undefined,
      postMitigationTimeMin: undefined,
      postMitigationTimeML: undefined,
      postMitigationTimeMax: undefined,
    });
    assert.strictEqual(isRiskValid(risk), true);
    assert.deepStrictEqual(getRiskValidationErrors(risk), []);
  });

  it("Monitoring requires mitigation description and cost; post fields remain optional", () => {
    const missingDesc = makeRisk({
      status: "Monitoring",
      mitigation: "",
      postMitigationProbabilityPct: undefined,
      postMitigationCostML: undefined,
    });
    assert.strictEqual(isRiskValid(missingDesc), false);
    assert.ok(getRiskValidationErrors(missingDesc).some((e) => /mitigation description/i.test(e)));

    const missingCost = makeRisk({
      status: "Monitoring",
      mitigation: "Approved plan",
      mitigationCost: undefined,
    });
    assert.strictEqual(isRiskValid(missingCost), false);
    assert.ok(getRiskValidationErrors(missingCost).some((e) => /mitigation cost/i.test(e)));

    const withDesc = makeRisk({
      status: "Monitoring",
      mitigation: "Approved plan",
      mitigationCost: 0,
      postMitigationProbabilityPct: undefined,
      postMitigationCostMin: undefined,
      postMitigationCostML: undefined,
      postMitigationCostMax: undefined,
      postMitigationTimeMin: undefined,
      postMitigationTimeML: undefined,
      postMitigationTimeMax: undefined,
    });
    assert.strictEqual(isRiskValid(withDesc), true);
  });

  it("Mitigating missing applicable post fields is invalid", () => {
    const missing = makeRisk({
      status: "Mitigating",
      mitigation: "In progress",
      mitigationCost: 1000,
      postMitigationProbabilityPct: undefined,
      residualRating: { ...rating, probability: undefined as unknown as number },
      postMitigationCostMin: undefined,
      postMitigationCostML: undefined,
      postMitigationCostMax: undefined,
      postMitigationTimeMin: undefined,
      postMitigationTimeML: undefined,
      postMitigationTimeMax: undefined,
    });
    assert.strictEqual(isRiskValid(missing), false);
    const errs = getRiskValidationErrors(missing);
    assert.ok(errs.some((e) => /post-mitigation probability/i.test(e)));
    assert.ok(errs.some((e) => /post-mitigation cost/i.test(e)));
    assert.ok(errs.some((e) => /post-mitigation time/i.test(e)));
  });

  it("Mitigating with applicable post fields is valid", () => {
    const ok = makeRisk({
      status: "Mitigating",
      mitigation: "In progress",
      mitigationCost: 2500,
      postMitigationProbabilityPct: 20,
      postMitigationCostMin: 1_000,
      postMitigationCostML: 2_000,
      postMitigationCostMax: 3_000,
      postMitigationTimeMin: 1,
      postMitigationTimeML: 2,
      postMitigationTimeMax: 3,
    });
    assert.strictEqual(isRiskValid(ok), true);
  });

  it("Draft remains non-validated (no runnable errors)", () => {
    const draft = makeRisk({ status: "Draft", title: "", owner: "" });
    assert.strictEqual(isRiskValid(draft), true);
    assert.deepStrictEqual(getRiskValidationErrors(draft), []);
  });
});
