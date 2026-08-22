/**
 * Shared Add Risk / Risk Detail save validation — canonical lifecycle rules.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getRiskRegisterRequiredIndicators,
  getRiskRegisterSaveValidationErrors,
  riskRegisterHasMitigationOrPostData,
  shouldShowRiskRegisterMitigationFields,
} from "@/domain/risk/riskRegisterSaveValidation";
import type { RiskRegisterSaveFormFields } from "@/domain/risk/riskRegisterSaveValidation";

function baseOpenForm(overrides: Partial<RiskRegisterSaveFormFields> = {}): RiskRegisterSaveFormFields {
  return {
    status: "Open",
    title: "Risk title",
    description: "Description",
    category: "programme",
    ownerResolved: "Owner",
    appliesTo: "both",
    preMitigationProbabilityPct: "50",
    preMitigationCostMin: "10000",
    preMitigationCostML: "20000",
    preMitigationCostMax: "30000",
    preMitigationTimeMin: "5",
    preMitigationTimeML: "10",
    preMitigationTimeMax: "15",
    mitigation: "",
    mitigationCost: "",
    postMitigationProbabilityPct: "",
    postMitigationCostMin: "",
    postMitigationCostML: "",
    postMitigationCostMax: "",
    postMitigationTimeMin: "",
    postMitigationTimeML: "",
    postMitigationTimeMax: "",
    ...overrides,
  };
}

describe("getRiskRegisterSaveValidationErrors", () => {
  it("Draft saves incomplete (no assessment blockers)", () => {
    const errs = getRiskRegisterSaveValidationErrors(
      baseOpenForm({
        status: "Draft",
        title: "",
        description: "",
        category: "",
        ownerResolved: "",
        appliesTo: "",
        preMitigationProbabilityPct: "",
        mitigation: "text present",
        postMitigationProbabilityPct: "",
      })
    );
    assert.deepStrictEqual(errs, []);
  });

  it("Open + mitigation text saves without post fields", () => {
    const errs = getRiskRegisterSaveValidationErrors(
      baseOpenForm({
        status: "Open",
        mitigation: "Would have forced post under legacy mode rule",
        mitigationCost: "",
        postMitigationProbabilityPct: "",
        postMitigationCostML: "",
        postMitigationTimeML: "",
      })
    );
    assert.deepStrictEqual(errs, []);
  });

  it("Monitoring requires description and cost but not post fields", () => {
    const missingDesc = getRiskRegisterSaveValidationErrors(
      baseOpenForm({ status: "Monitoring", mitigation: "", mitigationCost: "" })
    );
    assert.ok(missingDesc.includes("Mitigation description"));

    const missingCost = getRiskRegisterSaveValidationErrors(
      baseOpenForm({
        status: "Monitoring",
        mitigation: "Approved plan",
        mitigationCost: "",
        postMitigationProbabilityPct: "",
        postMitigationCostML: "",
      })
    );
    assert.ok(missingCost.includes("Mitigation Cost"));
    assert.ok(!missingCost.some((e) => /post-mitigation/i.test(e)));

    const ok = getRiskRegisterSaveValidationErrors(
      baseOpenForm({
        status: "Monitoring",
        mitigation: "Approved plan",
        mitigationCost: "0",
        postMitigationProbabilityPct: "",
        postMitigationCostMin: "",
        postMitigationCostML: "",
        postMitigationCostMax: "",
        postMitigationTimeMin: "",
        postMitigationTimeML: "",
        postMitigationTimeMax: "",
      })
    );
    assert.deepStrictEqual(ok, []);
  });

  it("Mitigating requires applicable post fields (Both)", () => {
    const incomplete = getRiskRegisterSaveValidationErrors(
      baseOpenForm({
        status: "Mitigating",
        appliesTo: "both",
        mitigation: "Active plan",
        mitigationCost: "1000",
      })
    );
    assert.ok(incomplete.includes("Post-Mitigation Probability"));
    assert.ok(incomplete.includes("Post-Mitigation Cost Min"));
    assert.ok(incomplete.includes("Post-Mitigation Time Min (working days)"));

    const complete = getRiskRegisterSaveValidationErrors(
      baseOpenForm({
        status: "Mitigating",
        appliesTo: "both",
        mitigation: "Active plan",
        mitigationCost: "1000",
        postMitigationProbabilityPct: "20",
        postMitigationCostMin: "1",
        postMitigationCostML: "2",
        postMitigationCostMax: "3",
        postMitigationTimeMin: "1",
        postMitigationTimeML: "2",
        postMitigationTimeMax: "3",
      })
    );
    assert.deepStrictEqual(complete, []);
  });

  it("Mitigating Cost-only does not require post schedule fields", () => {
    const errs = getRiskRegisterSaveValidationErrors(
      baseOpenForm({
        status: "Mitigating",
        appliesTo: "cost",
        mitigation: "Active plan",
        mitigationCost: "500",
        postMitigationProbabilityPct: "10",
        postMitigationCostMin: "1",
        postMitigationCostML: "2",
        postMitigationCostMax: "3",
        postMitigationTimeMin: "",
        postMitigationTimeML: "",
        postMitigationTimeMax: "",
      })
    );
    assert.deepStrictEqual(errs, []);
  });

  it("Mitigating Schedule-only does not require post cost fields", () => {
    const errs = getRiskRegisterSaveValidationErrors(
      baseOpenForm({
        status: "Mitigating",
        appliesTo: "time",
        mitigation: "Active plan",
        mitigationCost: "500",
        postMitigationProbabilityPct: "10",
        postMitigationCostMin: "",
        postMitigationCostML: "",
        postMitigationCostMax: "",
        postMitigationTimeMin: "1",
        postMitigationTimeML: "2",
        postMitigationTimeMax: "3",
      })
    );
    assert.deepStrictEqual(errs, []);
  });

  it("Closed and Archived skip assessment but require Applies to", () => {
    assert.deepStrictEqual(
      getRiskRegisterSaveValidationErrors(
        baseOpenForm({ status: "Closed", title: "", ownerResolved: "", appliesTo: "", preMitigationProbabilityPct: "" })
      ),
      ["Applies to"]
    );
    assert.deepStrictEqual(
      getRiskRegisterSaveValidationErrors(
        baseOpenForm({ status: "Archived", title: "", ownerResolved: "", appliesTo: "", preMitigationProbabilityPct: "" })
      ),
      ["Applies to"]
    );
    assert.deepStrictEqual(
      getRiskRegisterSaveValidationErrors(
        baseOpenForm({ status: "Closed", title: "", ownerResolved: "", appliesTo: "both", preMitigationProbabilityPct: "" })
      ),
      []
    );
  });
});

describe("getRiskRegisterRequiredIndicators", () => {
  it("Draft, Closed and Archived show no assessment asterisks", () => {
    for (const status of ["Draft", "Closed", "Archived"] as const) {
      assert.deepStrictEqual(
        getRiskRegisterRequiredIndicators({
          status,
          appliesTo: "both",
          mitigation: "text",
        }),
        {
          assessmentBasics: false,
          preProbability: false,
          preCost: false,
          preTime: false,
          mitigationDescription: false,
          mitigationCost: false,
          postProbability: false,
          postCost: false,
          postTime: false,
        },
        status
      );
    }
  });

  it("Open marks assessment/pre only — never post", () => {
    assert.deepStrictEqual(
      getRiskRegisterRequiredIndicators({
        status: "Open",
        appliesTo: "both",
        mitigation: "Legacy text must not force post asterisks",
      }),
      {
        assessmentBasics: true,
        preProbability: true,
        preCost: true,
        preTime: true,
        mitigationDescription: false,
        mitigationCost: false,
        postProbability: false,
        postCost: false,
        postTime: false,
      }
    );
  });

  it("Monitoring requires description; cost when description exists; post optional", () => {
    assert.deepStrictEqual(
      getRiskRegisterRequiredIndicators({ status: "Monitoring", appliesTo: "both", mitigation: "" }),
      {
        assessmentBasics: true,
        preProbability: true,
        preCost: true,
        preTime: true,
        mitigationDescription: true,
        mitigationCost: false,
        postProbability: false,
        postCost: false,
        postTime: false,
      }
    );
    assert.deepStrictEqual(
      getRiskRegisterRequiredIndicators({
        status: "Monitoring",
        appliesTo: "both",
        mitigation: "Approved plan",
      }),
      {
        assessmentBasics: true,
        preProbability: true,
        preCost: true,
        preTime: true,
        mitigationDescription: true,
        mitigationCost: true,
        postProbability: false,
        postCost: false,
        postTime: false,
      }
    );
  });

  it("Mitigating marks description, cost, post probability, and applicable impact by Cost/Schedule/Both", () => {
    assert.deepStrictEqual(
      getRiskRegisterRequiredIndicators({ status: "Mitigating", appliesTo: "both", mitigation: "" }),
      {
        assessmentBasics: true,
        preProbability: true,
        preCost: true,
        preTime: true,
        mitigationDescription: true,
        mitigationCost: true,
        postProbability: true,
        postCost: true,
        postTime: true,
      }
    );
    assert.deepStrictEqual(
      getRiskRegisterRequiredIndicators({ status: "Mitigating", appliesTo: "cost", mitigation: "x" }),
      {
        assessmentBasics: true,
        preProbability: true,
        preCost: true,
        preTime: false,
        mitigationDescription: true,
        mitigationCost: true,
        postProbability: true,
        postCost: true,
        postTime: false,
      }
    );
    assert.deepStrictEqual(
      getRiskRegisterRequiredIndicators({ status: "Mitigating", appliesTo: "time", mitigation: "x" }),
      {
        assessmentBasics: true,
        preProbability: true,
        preCost: false,
        preTime: true,
        mitigationDescription: true,
        mitigationCost: true,
        postProbability: true,
        postCost: false,
        postTime: true,
      }
    );
  });
});

describe("shouldShowRiskRegisterMitigationFields / persistence visibility", () => {
  it("Monitoring and Mitigating always show mitigation fields", () => {
    assert.strictEqual(
      shouldShowRiskRegisterMitigationFields({
        status: "Monitoring",
        mitigationExpanded: false,
        hasMitigationOrPostData: false,
      }),
      true
    );
    assert.strictEqual(
      shouldShowRiskRegisterMitigationFields({
        status: "Mitigating",
        mitigationExpanded: false,
        hasMitigationOrPostData: false,
      }),
      true
    );
  });

  it("Open shows optional mitigation when expanded or existing data is present", () => {
    assert.strictEqual(
      shouldShowRiskRegisterMitigationFields({
        status: "Open",
        mitigationExpanded: false,
        hasMitigationOrPostData: false,
      }),
      false
    );
    assert.strictEqual(
      shouldShowRiskRegisterMitigationFields({
        status: "Open",
        mitigationExpanded: true,
        hasMitigationOrPostData: false,
      }),
      true
    );
    assert.strictEqual(
      shouldShowRiskRegisterMitigationFields({
        status: "Open",
        mitigationExpanded: false,
        hasMitigationOrPostData: true,
      }),
      true
    );
  });

  it("status change does not erase presence of mitigation/post data flags", () => {
    const fields = {
      mitigation: "Plan remains",
      mitigationCost: "1000",
      postMitigationProbabilityPct: "20",
      postMitigationCostML: "5000",
      postMitigationTimeML: "3",
    };
    assert.strictEqual(riskRegisterHasMitigationOrPostData(fields), true);
    // Switching Monitoring → Open keeps hasData true so fields stay visible.
    assert.strictEqual(
      shouldShowRiskRegisterMitigationFields({
        status: "Open",
        mitigationExpanded: false,
        hasMitigationOrPostData: riskRegisterHasMitigationOrPostData(fields),
      }),
      true
    );
  });
});
