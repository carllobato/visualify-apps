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

  it("uses the default reporting unit when the Workspace has none, ignoring Portfolio", () => {
    assert.equal(
      reportingUnitForPortfolioDashboard({
        workspaceReportingUnit: null,
        portfolioReportingUnit: "BILLIONS",
      }),
      DEFAULT_REPORTING_UNIT,
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
