/**
 * Register Add/Detail modal wiring: Pre/Post input profile, required asterisks, visibility.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const addModalSource = readFileSync(
  fileURLToPath(new URL("../../components/risk-register/AddRiskModal.tsx", import.meta.url)),
  "utf8"
);
const detailModalSource = readFileSync(
  fileURLToPath(new URL("../../components/risk-register/RiskDetailModal.tsx", import.meta.url)),
  "utf8"
);

describe("register UI lifecycle wiring", () => {
  it("modals use shared required indicators (not mitigationMode for asterisks)", () => {
    for (const src of [addModalSource, detailModalSource]) {
      assert.match(src, /getRiskRegisterRequiredIndicators/);
      assert.match(src, /requiredIndicators\.assessmentBasics/);
      assert.match(src, /requiredIndicators\.preProbability/);
      assert.match(src, /requiredIndicators\.mitigationDescription/);
      assert.match(src, /requiredIndicators\.postProbability/);
      assert.equal(src.includes("!isRiskStatusDraft(status) && <RequiredStar"), false);
    }
  });

  it("modals expose Pre-mitigation / Post-mitigation input profile selector", () => {
    for (const src of [addModalSource, detailModalSource]) {
      assert.match(src, /Pre-mitigation/);
      assert.match(src, /Post-mitigation/);
      assert.match(src, /Input profile/);
      assert.match(src, /handleInputProfileChange/);
      assert.match(src, /modellingInputProfileFromMode/);
      assert.match(src, /mitigationModeFromInputProfile/);
      assert.equal(src.includes("No Mitigation"), false);
      assert.equal(src.includes("Forecast Mitigation"), false);
      assert.equal(src.includes("Active Mitigation"), false);
      assert.equal(src.includes("statusAutoFromMitigationMode"), false);
    }
  });

  it("modals show mitigation fields via lifecycle helper, not mitigationMode alone", () => {
    for (const src of [addModalSource, detailModalSource]) {
      assert.match(src, /shouldShowRiskRegisterMitigationFields/);
      assert.match(src, /showMitigationFields/);
      assert.match(src, /mitigationExpanded: inputProfile === "post"/);
    }
  });

  it("Detail modal always loads and persists mitigation/post form values", () => {
    assert.match(detailModalSource, /Always load mitigation\/post form state/);
    assert.match(detailModalSource, /Mitigation\/post form values always persist/);
    assert.equal(detailModalSource.includes("persistMitigationFields"), false);
  });

  it("Add modal persists mitigation/post without clearing on mode none", () => {
    assert.match(addModalSource, /Always persist mitigation\/post form values/);
    assert.equal(addModalSource.includes("persistMitigationFields"), false);
  });

  it("selecting input profile does not mutate canonical status", () => {
    for (const src of [addModalSource, detailModalSource]) {
      assert.match(src, /Input profile only — never mutates canonical lifecycle status/);
      const handler = src.match(
        /const handleInputProfileChange = useCallback\(\n    \(profile: ModellingInputProfile\) => \{[\s\S]*?\},\n    \[status\]\n  \);/
      );
      assert.ok(handler, "expected profile handler");
      assert.equal(handler[0].includes("setStatus"), false);
    }
  });

  it("status change uses one-way display default; Open/Monitoring preserve selection", () => {
    for (const src of [addModalSource, detailModalSource]) {
      assert.match(src, /displayedMitigationModeAfterStatusChange/);
      assert.equal(src.includes('setMitigationMode("forecast")'), false);
      assert.equal(src.includes('if (k === "open")'), false);
    }
  });

  it("Closed reopen → Draft workflow remains in Detail modal", () => {
    assert.match(detailModalSource, /isRiskStatusClosed\(status\) && !isRiskStatusClosed\(next\)/);
    assert.match(detailModalSource, /RISK_STATUS_DRAFT_LOOKUP/);
  });
});
