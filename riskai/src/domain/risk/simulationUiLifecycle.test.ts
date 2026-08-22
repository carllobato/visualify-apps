/**
 * Simulation page display helpers: post completeness vs current/effective lifecycle.
 * Source-level guards keep Closed reopen → Draft and Archived restore wiring intact.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const simulationPageSource = readFileSync(
  fileURLToPath(new URL("../../../app/(protected)/simulation/SimulationPageContent.tsx", import.meta.url)),
  "utf8"
);

const detailModalSource = readFileSync(
  fileURLToPath(new URL("../../components/risk-register/RiskDetailModal.tsx", import.meta.url)),
  "utf8"
);

describe("simulation display lifecycle labelling", () => {
  it("uses applicable post-input completeness, not mitigation text", () => {
    assert.match(simulationPageSource, /hasApplicablePostMitigationInputs/);
    assert.match(simulationPageSource, /simulationUsesPostMitigationInputs/);
    assert.equal(simulationPageSource.includes("Boolean(risk.mitigation?.trim())"), false);
  });
});

describe("Closed / Archived modal workflows preserved", () => {
  it("Closed reopen still maps to Draft; Archived restore callback remains", () => {
    assert.match(detailModalSource, /isRiskStatusClosed\(status\) && !isRiskStatusClosed\(next\)/);
    assert.match(detailModalSource, /RISK_STATUS_DRAFT_LOOKUP/);
    assert.match(detailModalSource, /onRestoreRisk/);
    assert.match(detailModalSource, /isRiskStatusArchived\(currentRisk\.status\)/);
    assert.match(detailModalSource, /A closure note is required when closing a risk/);
  });
});
