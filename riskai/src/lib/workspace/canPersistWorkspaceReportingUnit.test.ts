import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canPersistWorkspaceReportingUnit } from "./canPersistWorkspaceReportingUnit";

describe("canPersistWorkspaceReportingUnit", () => {
  it("allows owner/admin when a unique internal Portfolio exists", () => {
    assert.equal(
      canPersistWorkspaceReportingUnit({
        canEditWorkspaceDetails: true,
        uniquePortfolioId: "portfolio-1",
      }),
      true
    );
  });

  it("blocks save when there is no unique internal Portfolio", () => {
    assert.equal(
      canPersistWorkspaceReportingUnit({
        canEditWorkspaceDetails: true,
        uniquePortfolioId: null,
      }),
      false
    );
  });

  it("blocks members and viewers even when a unique Portfolio exists", () => {
    assert.equal(
      canPersistWorkspaceReportingUnit({
        canEditWorkspaceDetails: false,
        uniquePortfolioId: "portfolio-1",
      }),
      false
    );
  });
});
