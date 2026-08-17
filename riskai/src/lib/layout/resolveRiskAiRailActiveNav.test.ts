import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveActivePrimaryNav, riskAiProjectRailHrefs } from "./resolveRiskAiRailActiveNav";

const PROJECT_ID = "p-1";
const WORKSPACE_ID = "ws-1";
const HREFS = riskAiProjectRailHrefs(PROJECT_ID);

describe("riskAiProjectRailHrefs", () => {
  it("builds the MVP Project destinations", () => {
    assert.equal(HREFS.overview, `/projects/${PROJECT_ID}`);
    assert.equal(HREFS.risks, `/projects/${PROJECT_ID}/risks`);
    assert.equal(HREFS.simulation, `/projects/${PROJECT_ID}/simulation`);
    assert.equal(HREFS.report, `/projects/${PROJECT_ID}/report`);
    assert.equal(HREFS.settings, `/projects/${PROJECT_ID}/settings`);
  });
});

describe("resolveActivePrimaryNav — Project", () => {
  it("activates Project Overview only on the exact project path", () => {
    assert.equal(resolveActivePrimaryNav(HREFS.overview, WORKSPACE_ID), "projectOverview");
    assert.equal(resolveActivePrimaryNav(`/riskai/projects/${PROJECT_ID}`, WORKSPACE_ID), "projectOverview");
  });

  it("activates Risks, Simulation, Report, and Project Settings on their own paths", () => {
    assert.equal(resolveActivePrimaryNav(HREFS.risks, WORKSPACE_ID), "risks");
    assert.equal(resolveActivePrimaryNav(HREFS.simulation, WORKSPACE_ID), "simulation");
    assert.equal(resolveActivePrimaryNav(HREFS.report, WORKSPACE_ID), "report");
    assert.equal(resolveActivePrimaryNav(HREFS.settings, WORKSPACE_ID), "projectSettings");
  });

  it("does not treat Report as Project Overview", () => {
    assert.notEqual(resolveActivePrimaryNav(HREFS.report, WORKSPACE_ID), "projectOverview");
    assert.equal(resolveActivePrimaryNav(`${HREFS.report}/`, WORKSPACE_ID), "report");
    assert.equal(resolveActivePrimaryNav(`/riskai/projects/${PROJECT_ID}/report`, WORKSPACE_ID), "report");
  });

  it("does not activate Project Overview on nested project routes", () => {
    assert.notEqual(resolveActivePrimaryNav(HREFS.risks, WORKSPACE_ID), "projectOverview");
    assert.notEqual(resolveActivePrimaryNav(HREFS.simulation, WORKSPACE_ID), "projectOverview");
    assert.notEqual(resolveActivePrimaryNav(HREFS.settings, WORKSPACE_ID), "projectOverview");
  });

  it("does not activate Workspace items while a Project destination is active", () => {
    assert.equal(resolveActivePrimaryNav(HREFS.overview, WORKSPACE_ID), "projectOverview");
    assert.equal(resolveActivePrimaryNav(HREFS.report, WORKSPACE_ID), "report");
  });
});

describe("resolveActivePrimaryNav — Workspace (unchanged)", () => {
  it("activates Workspace identity, Projects, and Settings on workspace paths", () => {
    assert.equal(resolveActivePrimaryNav(`/workspaces/${WORKSPACE_ID}`, WORKSPACE_ID), "workspaceOverview");
    assert.equal(
      resolveActivePrimaryNav(`/workspaces/${WORKSPACE_ID}/projects`, WORKSPACE_ID),
      "workspaceProjects"
    );
    assert.equal(
      resolveActivePrimaryNav(`/workspaces/${WORKSPACE_ID}/settings`, WORKSPACE_ID),
      "workspaceSettings"
    );
  });

  it("hides primary nav resolution on /home", () => {
    assert.equal(resolveActivePrimaryNav("/home", WORKSPACE_ID), null);
  });
});
