import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  overviewProjectsHref,
  overviewSettingsHref,
  overviewSettingsLabel,
  workspaceActiveProjectsCoverageSubtext,
  workspaceOverviewEmptyBody,
  workspaceOverviewEmptyTitle,
  workspaceProjectsOmittedFromReportingMonth,
  workspaceUnreportedProjectsHeading,
} from "./overviewCustomerCopy";

describe("overviewCustomerCopy", () => {
  it("sends Workspace Overview project/settings actions to workspace routes", () => {
    assert.equal(overviewProjectsHref("workspace", "ws-1"), "/workspaces/ws-1/projects");
    assert.equal(overviewSettingsHref("workspace", "ws-1"), "/workspaces/ws-1/settings");
    assert.equal(overviewSettingsLabel("workspace"), "Workspace Settings");
  });

  it("keeps Portfolio Overview project/settings actions on portfolio routes", () => {
    assert.equal(overviewProjectsHref("portfolio", "pf-1"), "/portfolios/pf-1/projects");
    assert.equal(
      overviewSettingsHref("portfolio", "pf-1"),
      "/portfolios/pf-1/portfolio-settings"
    );
    assert.equal(overviewSettingsLabel("portfolio"), "Portfolio Settings");
  });

  it("names Workspace reporting coverage without implying all Projects are included", () => {
    assert.equal(
      workspaceActiveProjectsCoverageSubtext({
        reportedCount: 5,
        totalCount: 7,
        reportingMonthLabel: "May 2026",
      }),
      "5 of 7 projects reported for May"
    );
    assert.equal(
      workspaceActiveProjectsCoverageSubtext({
        reportedCount: 7,
        totalCount: 7,
        reportingMonthLabel: "May 2026",
      }),
      "7 of 7 projects reported for May"
    );
    assert.equal(workspaceUnreportedProjectsHeading("May 2026"), "Not reported for May");
  });

  it("lists omitted Workspace Projects from the existing scope minus reported tile IDs", () => {
    assert.deepEqual(
      workspaceProjectsOmittedFromReportingMonth(
        [
          { id: "p2", name: "SYD1 Stage 2" },
          { id: "p1", name: "MEL1" },
          { id: "p3", name: "Reported" },
        ],
        ["p3"]
      ),
      [
        { id: "p1", name: "MEL1" },
        { id: "p2", name: "SYD1 Stage 2" },
      ]
    );
  });

  it("distinguishes no Workspace Projects from Projects with no reporting data", () => {
    assert.equal(workspaceOverviewEmptyTitle(false), "No projects in this workspace yet");
    assert.equal(
      workspaceOverviewEmptyTitle(true),
      "Workspace overview will appear once reporting data is available"
    );
    assert.equal(
      workspaceOverviewEmptyBody(false),
      "Create a project to start building risk registers and monthly reporting."
    );
    assert.equal(
      workspaceOverviewEmptyBody(true),
      "Run and lock monthly reporting for at least one project to populate workspace risk rating, exposure, health, drivers, and breakdowns."
    );
  });
});
