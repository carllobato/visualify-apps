import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_REPORTING_UNIT,
  reportingUnitForPortfolioDashboard,
} from "./reportingPreferences";

describe("reportingUnitForPortfolioDashboard", () => {
  it("uses the Workspace reporting unit when Settings has saved a different value", () => {
    assert.equal(
      reportingUnitForPortfolioDashboard({
        workspaceReportingUnit: "THOUSANDS",
        portfolioReportingUnit: "MILLIONS",
      }),
      "THOUSANDS",
    );
  });

  it("falls back to the Portfolio reporting unit when the Workspace has none", () => {
    assert.equal(
      reportingUnitForPortfolioDashboard({
        workspaceReportingUnit: null,
        portfolioReportingUnit: "BILLIONS",
      }),
      "BILLIONS",
    );
  });

  it("defaults when neither Workspace nor Portfolio has a unit", () => {
    assert.equal(
      reportingUnitForPortfolioDashboard({
        workspaceReportingUnit: null,
        portfolioReportingUnit: null,
      }),
      DEFAULT_REPORTING_UNIT,
    );
  });
});
