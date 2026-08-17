import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAuthenticatedAppPath,
  isWorkspaceSelectionPath,
  pathAfterWorkspaceSelection,
  portfolioIdFromAppPathname,
  portfolioRouteTitleFromPathname,
  shouldHideAppShellPrimaryNav,
  workspaceIdFromAppPathname,
  workspaceOverviewPath,
  workspaceRouteTitleFromPathname,
  isWorkspaceOverviewPathname,
} from "./routes";

describe("authenticated RiskAI routes", () => {
  it("treats /workspaces/[id] as an authenticated app path", () => {
    assert.equal(isAuthenticatedAppPath("/workspaces/ws-1"), true);
    assert.equal(isAuthenticatedAppPath("/riskai/workspaces/ws-1"), true);
  });

  it("keeps /portfolios/[id] as an authenticated app path", () => {
    assert.equal(isAuthenticatedAppPath("/portfolios/pf-1"), true);
  });

  it("does not treat signed-out routes as authenticated app paths", () => {
    assert.equal(isAuthenticatedAppPath("/login"), false);
    assert.equal(isAuthenticatedAppPath("/forgot-password"), false);
    assert.equal(isAuthenticatedAppPath("/auth/callback"), false);
  });
});

describe("shouldHideAppShellPrimaryNav", () => {
  it("hides Workspace/Project rail presentation on /home even when a workspace cookie exists", () => {
    assert.equal(isWorkspaceSelectionPath("/home"), true);
    assert.equal(shouldHideAppShellPrimaryNav("/home", false), true);
    assert.equal(shouldHideAppShellPrimaryNav("/riskai/home", false), true);
  });

  it("shows Workspace navigation on a workspace route even if hidePrimaryNav is stale", () => {
    assert.equal(shouldHideAppShellPrimaryNav("/workspaces/ws-1", true), false);
    assert.equal(shouldHideAppShellPrimaryNav("/workspaces/ws-1/projects", true), false);
  });

  it("shows Project navigation on a project route even if hidePrimaryNav is stale", () => {
    assert.equal(shouldHideAppShellPrimaryNav("/projects/p-1", true), false);
  });

  it("keeps hidePrimaryNav for other signed-in paths", () => {
    assert.equal(shouldHideAppShellPrimaryNav("/dashboard", true), true);
    assert.equal(shouldHideAppShellPrimaryNav("/dashboard", false), false);
    assert.equal(shouldHideAppShellPrimaryNav("/account", true), true);
  });
});

describe("pathAfterWorkspaceSelection", () => {
  it("opens the selected workspace overview when there is no next path", () => {
    assert.equal(
      pathAfterWorkspaceSelection("98f0803d-7c82-409c-b517-64ed3b064060", null),
      "/workspaces/98f0803d-7c82-409c-b517-64ed3b064060"
    );
    assert.equal(
      workspaceOverviewPath("98f0803d-7c82-409c-b517-64ed3b064060"),
      "/workspaces/98f0803d-7c82-409c-b517-64ed3b064060"
    );
  });

  it("does not send the user to /dashboard after picking a workspace", () => {
    assert.equal(
      pathAfterWorkspaceSelection("ws-1", "/dashboard"),
      "/workspaces/ws-1"
    );
    assert.equal(pathAfterWorkspaceSelection("ws-1", "/home"), "/workspaces/ws-1");
    assert.equal(pathAfterWorkspaceSelection("ws-1", "/riskai/home"), "/workspaces/ws-1");
  });

  it("honours a deep-link next path", () => {
    assert.equal(
      pathAfterWorkspaceSelection("ws-1", "/projects/p-1"),
      "/projects/p-1"
    );
  });
});

describe("workspaceIdFromAppPathname", () => {
  it("reads the workspace id from flat and legacy paths", () => {
    assert.equal(workspaceIdFromAppPathname("/workspaces/ws-1"), "ws-1");
    assert.equal(workspaceIdFromAppPathname("/riskai/workspaces/ws-1"), "ws-1");
    assert.equal(workspaceIdFromAppPathname("/portfolios/pf-1"), null);
  });
});

describe("workspaceRouteTitleFromPathname", () => {
  it("returns Workspace Overview for the workspace overview path", () => {
    assert.equal(
      workspaceRouteTitleFromPathname("/workspaces/ws-1", "ws-1"),
      "Workspace Overview"
    );
  });

  it("returns Projects for the workspace projects path", () => {
    assert.equal(
      workspaceRouteTitleFromPathname("/workspaces/ws-1/projects", "ws-1"),
      "Projects"
    );
    assert.equal(
      workspaceRouteTitleFromPathname("/riskai/workspaces/ws-1/projects", "ws-1"),
      "Projects"
    );
  });

  it("returns Workspace Settings for the workspace settings path", () => {
    assert.equal(
      workspaceRouteTitleFromPathname("/workspaces/ws-1/settings", "ws-1"),
      "Workspace Settings"
    );
    assert.equal(
      workspaceRouteTitleFromPathname("/riskai/workspaces/ws-1/settings", "ws-1"),
      "Workspace Settings"
    );
  });

  it("does not steal titles from the existing portfolio route", () => {
    assert.equal(workspaceRouteTitleFromPathname("/portfolios/pf-1", "ws-1"), null);
    assert.equal(portfolioRouteTitleFromPathname("/portfolios/pf-1", "pf-1"), "Overview");
    assert.equal(portfolioIdFromAppPathname("/workspaces/ws-1"), null);
  });

  it("treats only the workspace overview path as the Report Month page", () => {
    assert.equal(isWorkspaceOverviewPathname("/workspaces/ws-1", "ws-1"), true);
    assert.equal(isWorkspaceOverviewPathname("/riskai/workspaces/ws-1", "ws-1"), true);
    assert.equal(isWorkspaceOverviewPathname("/workspaces/ws-1/projects", "ws-1"), false);
    assert.equal(isWorkspaceOverviewPathname("/workspaces/ws-1/settings", "ws-1"), false);
  });
});
