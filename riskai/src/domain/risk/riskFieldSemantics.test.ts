/**
 * Focused regression tests for lifecycle status authority and schedule simulation inputs.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import type { Risk } from "@/domain/risk/risk.schema";
import {
  APPLIES_TO_DB_BOTH,
  APPLIES_TO_DB_COST,
  APPLIES_TO_DB_SCHEDULE,
  canonicalAppliesToForDb,
  displayedMitigationModeAfterStatusChange,
  getCurrentRiskRatingLetter,
  getCurrentRiskRatingLevel,
  hasApplicablePostMitigationInputs,
  isCurrentRiskRatingNA,
  normalizeAppliesToKey,
  riskLifecycleBucketForRegisterSnapshot,
  scheduleImpactDaysMLForSimulation,
  simulationUsesPostMitigationInputs,
} from "./riskFieldSemantics";

const iso = "2025-01-01T00:00:00.000Z";
const baseRating = { probability: 3 as const, consequence: 3 as const, score: 9 as const, level: "high" as const };

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    title: "Test Risk",
    category: "programme",
    status: "open",
    inherentRating: baseRating,
    residualRating: baseRating,
    createdAt: iso,
    updatedAt: iso,
    ...overrides,
  };
}

const activeProfile = {
  status: "active" as const,
  effectiveness: 0.5,
  confidence: 0.5,
  reduces: 0.5,
  lagMonths: 0,
};

describe("riskLifecycleBucketForRegisterSnapshot", () => {
  it("Open with active legacy mitigation profile remains Open", () => {
    const risk = makeRisk({
      status: "Open",
      mitigationProfile: activeProfile,
    });
    assert.strictEqual(riskLifecycleBucketForRegisterSnapshot(risk), "open");
  });

  it("maps Monitoring / Mitigating / Draft / Closed / Archived from canonical status", () => {
    assert.strictEqual(riskLifecycleBucketForRegisterSnapshot(makeRisk({ status: "Monitoring" })), "monitoring");
    assert.strictEqual(riskLifecycleBucketForRegisterSnapshot(makeRisk({ status: "Mitigating" })), "mitigating");
    assert.strictEqual(riskLifecycleBucketForRegisterSnapshot(makeRisk({ status: "Draft" })), "draft");
    assert.strictEqual(riskLifecycleBucketForRegisterSnapshot(makeRisk({ status: "Closed" })), "closed");
    assert.strictEqual(riskLifecycleBucketForRegisterSnapshot(makeRisk({ status: "Archived" })), "archived");
  });

  it("maps mitigated synonym to mitigating without consulting mitigation profile", () => {
    assert.strictEqual(
      riskLifecycleBucketForRegisterSnapshot(makeRisk({ status: "mitigated", mitigationProfile: undefined })),
      "mitigating"
    );
  });
});

describe("scheduleImpactDaysMLForSimulation", () => {
  it("Open with active legacy profile uses pre-mitigation schedule ML", () => {
    const risk = makeRisk({
      status: "Open",
      mitigationProfile: activeProfile,
      preMitigationTimeML: 18,
      postMitigationTimeML: 4,
      appliesTo: "both",
    });
    assert.strictEqual(scheduleImpactDaysMLForSimulation(risk), 18);
  });

  it("Monitoring uses pre-mitigation schedule ML", () => {
    const risk = makeRisk({
      status: "Monitoring",
      preMitigationTimeML: 12,
      postMitigationTimeML: 3,
      appliesTo: "both",
    });
    assert.strictEqual(scheduleImpactDaysMLForSimulation(risk), 12);
  });

  it("Mitigating uses post-mitigation schedule ML", () => {
    const risk = makeRisk({
      status: "Mitigating",
      preMitigationTimeML: 20,
      postMitigationTimeML: 7,
      appliesTo: "both",
    });
    assert.strictEqual(scheduleImpactDaysMLForSimulation(risk), 7);
  });

  it("Mitigating with missing applicable post schedule ML returns null (no pre fallback)", () => {
    const risk = makeRisk({
      status: "Mitigating",
      preMitigationTimeML: 20,
      appliesTo: "both",
    });
    assert.strictEqual(scheduleImpactDaysMLForSimulation(risk), null);
  });

  it("Cost-only Mitigating risk does not require schedule ML (schedule-inapplicable)", () => {
    const risk = makeRisk({
      status: "Mitigating",
      appliesTo: "cost",
      preMitigationTimeML: 20,
      postMitigationCostML: 50_000,
    });
    assert.strictEqual(scheduleImpactDaysMLForSimulation(risk), null);
  });

  it("Draft, Closed and Archived return no simulation schedule input", () => {
    for (const status of ["Draft", "Closed", "Archived"] as const) {
      const risk = makeRisk({
        status,
        preMitigationTimeML: 15,
        postMitigationTimeML: 5,
        appliesTo: "both",
      });
      assert.strictEqual(scheduleImpactDaysMLForSimulation(risk), null, status);
    }
  });
});

describe("hasApplicablePostMitigationInputs / simulationUsesPostMitigationInputs", () => {
  it("post completeness does not depend on mitigation text", () => {
    const withTextMissingPost = makeRisk({
      status: "Open",
      appliesTo: "both",
      mitigation: "Narrative only",
      postMitigationCostML: undefined,
      postMitigationTimeML: undefined,
    });
    assert.strictEqual(hasApplicablePostMitigationInputs(withTextMissingPost), false);

    const noTextCompletePost = makeRisk({
      status: "Open",
      appliesTo: "both",
      mitigation: "",
      postMitigationCostML: 10_000,
      postMitigationTimeML: 5,
    });
    assert.strictEqual(hasApplicablePostMitigationInputs(noTextCompletePost), true);
  });

  it("respects Cost / Schedule / Both applicability", () => {
    assert.strictEqual(
      hasApplicablePostMitigationInputs(
        makeRisk({ status: "Open", appliesTo: "cost", postMitigationCostML: 1, postMitigationTimeML: undefined })
      ),
      true
    );
    assert.strictEqual(
      hasApplicablePostMitigationInputs(
        makeRisk({ status: "Open", appliesTo: "time", postMitigationCostML: undefined, postMitigationTimeML: 2 })
      ),
      true
    );
    assert.strictEqual(
      hasApplicablePostMitigationInputs(
        makeRisk({ status: "Open", appliesTo: "both", postMitigationCostML: 1, postMitigationTimeML: undefined })
      ),
      false
    );
  });

  it("effective/current labelling uses post only for Mitigating", () => {
    assert.strictEqual(simulationUsesPostMitigationInputs(makeRisk({ status: "Open", mitigation: "text" })), false);
    assert.strictEqual(
      simulationUsesPostMitigationInputs(
        makeRisk({
          status: "Open",
          mitigationProfile: activeProfile,
          postMitigationCostML: 1,
          postMitigationTimeML: 1,
        })
      ),
      false
    );
    assert.strictEqual(
      simulationUsesPostMitigationInputs(makeRisk({ status: "Monitoring", mitigation: "plan" })),
      false
    );
    assert.strictEqual(simulationUsesPostMitigationInputs(makeRisk({ status: "Mitigating" })), true);
  });
});

describe("register rating pre/post by lifecycle status", () => {
  const inherent = { probability: 5 as const, consequence: 5 as const, score: 25 as const, level: "extreme" as const };
  const residual = { probability: 1 as const, consequence: 1 as const, score: 1 as const, level: "low" as const };

  it("Open + mitigation text / legacy active mode still shows pre rating", () => {
    const risk = makeRisk({
      status: "Open",
      mitigation: "Legacy narrative",
      mitigationProfile: activeProfile,
      inherentRating: inherent,
      residualRating: residual,
      postMitigationCostML: 1,
      postMitigationTimeML: 1,
      appliesTo: "both",
    });
    assert.strictEqual(isCurrentRiskRatingNA(risk), false);
    assert.strictEqual(getCurrentRiskRatingLevel(risk), "extreme");
    assert.strictEqual(getCurrentRiskRatingLetter(risk), "E");
  });

  it("Monitoring shows pre rating", () => {
    const risk = makeRisk({
      status: "Monitoring",
      mitigation: "Plan",
      inherentRating: inherent,
      residualRating: residual,
      postMitigationCostML: 1,
      postMitigationTimeML: 1,
      appliesTo: "both",
    });
    assert.strictEqual(getCurrentRiskRatingLetter(risk), "E");
  });

  it("Mitigating shows post rating when applicable post data exists", () => {
    const risk = makeRisk({
      status: "Mitigating",
      mitigation: "Active",
      inherentRating: inherent,
      residualRating: residual,
      postMitigationCostML: 10_000,
      postMitigationTimeML: 4,
      appliesTo: "both",
    });
    assert.strictEqual(isCurrentRiskRatingNA(risk), false);
    assert.strictEqual(getCurrentRiskRatingLetter(risk), "L");
  });

  it("Mitigating with unavailable applicable post data shows N/A (not mitigation-text gated)", () => {
    const risk = makeRisk({
      status: "Mitigating",
      mitigation: "Has narrative only",
      inherentRating: inherent,
      residualRating: residual,
      appliesTo: "both",
    });
    assert.strictEqual(isCurrentRiskRatingNA(risk), true);
    assert.strictEqual(getCurrentRiskRatingLetter(risk), "N/A");
  });

  it("Draft / Closed / Archived remain N/A", () => {
    for (const status of ["Draft", "Closed", "Archived"] as const) {
      assert.strictEqual(
        getCurrentRiskRatingLetter(
          makeRisk({
            status,
            inherentRating: inherent,
            residualRating: residual,
            postMitigationCostML: 1,
            postMitigationTimeML: 1,
          })
        ),
        "N/A",
        status
      );
    }
  });
});

describe("normalizeAppliesToKey / canonicalAppliesToForDb", () => {
  it("maps legacy lowercase and DB-canonical Title Case to semantic keys", () => {
    assert.strictEqual(normalizeAppliesToKey("cost"), "cost");
    assert.strictEqual(normalizeAppliesToKey("Cost"), "cost");
    assert.strictEqual(normalizeAppliesToKey("time"), "time");
    assert.strictEqual(normalizeAppliesToKey("Schedule"), "time");
    assert.strictEqual(normalizeAppliesToKey("both"), "both");
    assert.strictEqual(normalizeAppliesToKey("Both"), "both");
    assert.strictEqual(normalizeAppliesToKey("cost & time"), "both");
  });

  it("writes DB-canonical applies_to labels from UI values", () => {
    assert.strictEqual(canonicalAppliesToForDb("cost"), APPLIES_TO_DB_COST);
    assert.strictEqual(canonicalAppliesToForDb("time"), APPLIES_TO_DB_SCHEDULE);
    assert.strictEqual(canonicalAppliesToForDb("both"), APPLIES_TO_DB_BOTH);
    assert.strictEqual(canonicalAppliesToForDb("Schedule"), APPLIES_TO_DB_SCHEDULE);
    assert.strictEqual(canonicalAppliesToForDb(""), null);
  });

  it("Schedule-only risks exclude cost impact", () => {
    const risk = makeRisk({ appliesTo: APPLIES_TO_DB_SCHEDULE, preMitigationTimeML: 12 });
    assert.strictEqual(scheduleImpactDaysMLForSimulation(risk), 12);
  });
});

describe("displayedMitigationModeAfterStatusChange (one-way)", () => {
  it("Mitigating defaults display to Post (active)", () => {
    assert.strictEqual(displayedMitigationModeAfterStatusChange("Mitigating", "none"), "active");
    assert.strictEqual(displayedMitigationModeAfterStatusChange("Mitigating", "forecast"), "active");
  });

  it("Open and Monitoring preserve the current selection", () => {
    assert.strictEqual(displayedMitigationModeAfterStatusChange("Open", "active"), "active");
    assert.strictEqual(displayedMitigationModeAfterStatusChange("Open", "forecast"), "forecast");
    assert.strictEqual(displayedMitigationModeAfterStatusChange("Monitoring", "none"), "none");
    assert.strictEqual(displayedMitigationModeAfterStatusChange("Monitoring", "active"), "active");
  });
});
