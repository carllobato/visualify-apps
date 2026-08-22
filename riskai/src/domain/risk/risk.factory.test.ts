import { describe, it } from "node:test";
import assert from "node:assert";
import { createRisk } from "@/domain/risk/risk.factory";
import { buildRating } from "@/domain/risk/risk.logic";

describe("createRisk", () => {
  it("keeps explicit undefined assessment numerics when partial is provided (draft add path)", () => {
    const inherentRating = buildRating(1, 1);
    const risk = createRisk({
      title: "Untitled risk",
      status: "Draft",
      category: "",
      appliesTo: "both",
      preMitigationProbabilityPct: undefined,
      preMitigationCostML: undefined,
      preMitigationTimeML: undefined,
      probability: undefined,
      mitigation: undefined,
      inherentRating,
      residualRating: inherentRating,
    });

    assert.equal(risk.preMitigationProbabilityPct, undefined);
    assert.equal(risk.preMitigationCostML, undefined);
    assert.equal(risk.preMitigationTimeML, undefined);
    assert.equal(risk.probability, undefined);
    assert.equal(risk.mitigation, undefined);
  });

  it("still applies sample defaults when called without partial (dev fixtures)", () => {
    const risk = createRisk();
    assert.equal(risk.preMitigationCostML, 50_000);
    assert.equal(risk.preMitigationTimeML, 30);
    assert.equal(typeof risk.probability, "number");
  });
});
