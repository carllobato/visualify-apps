import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreateProjectRequestBody,
  canCreateProjectInCreatableWorkspace,
  createProjectRequestFromForm,
  openProjectOnboardingDetail,
  projectCreateSelectorVisibility,
  projectOnboardingHref,
  resolveProjectCreateFormParent,
  resolveWorkspaceProjectCreateParent,
} from "./resolveWorkspaceProjectCreateParent";

const PORTFOLIOS = [
  { id: "pf-1", workspace_id: "ws-1" },
  { id: "pf-2", workspace_id: "ws-1" },
  { id: "pf-other", workspace_id: "ws-2" },
];

describe("resolveWorkspaceProjectCreateParent", () => {
  it("always supplies Workspace as the required parent", () => {
    assert.deepEqual(resolveWorkspaceProjectCreateParent({ workspaceId: "ws-1" }), {
      workspaceId: "ws-1",
      portfolioId: null,
    });
  });

  it("allows create with 0 Portfolios (portfolio_id stays null)", () => {
    assert.deepEqual(
      resolveWorkspaceProjectCreateParent({ workspaceId: "ws-1", uniquePortfolioId: null }),
      { workspaceId: "ws-1", portfolioId: null },
    );
  });

  it("optionally links a unique Portfolio without requiring the user to choose it", () => {
    assert.deepEqual(
      resolveWorkspaceProjectCreateParent({
        workspaceId: "ws-1",
        uniquePortfolioId: "pf-unique",
      }),
      { workspaceId: "ws-1", portfolioId: "pf-unique" },
    );
  });

  it("does not pick a Portfolio when uniquePortfolioId is absent (2+ case)", () => {
    assert.deepEqual(
      resolveWorkspaceProjectCreateParent({ workspaceId: "ws-1", uniquePortfolioId: null }),
      { workspaceId: "ws-1", portfolioId: null },
    );
  });

  it("rejects a blank Workspace", () => {
    assert.deepEqual(resolveWorkspaceProjectCreateParent({ workspaceId: "  " }), {
      error: "workspace_required",
    });
  });
});

describe("buildCreateProjectRequestBody", () => {
  it("sends workspaceId for 0 and 2+ Portfolio Workspaces without portfolioId", () => {
    assert.deepEqual(
      buildCreateProjectRequestBody({ name: "North corridor", workspaceId: "ws-1" }),
      { name: "North corridor", workspaceId: "ws-1" },
    );
  });

  it("sends both ids when a unique or explicit Portfolio is preserved", () => {
    assert.deepEqual(
      buildCreateProjectRequestBody({
        name: "North corridor",
        workspaceId: "ws-1",
        portfolioId: "pf-unique",
      }),
      { name: "North corridor", workspaceId: "ws-1", portfolioId: "pf-unique" },
    );
  });

  it("keeps legacy Portfolio-launched create (portfolioId only)", () => {
    assert.deepEqual(
      buildCreateProjectRequestBody({ name: "North corridor", portfolioId: "pf-1" }),
      { name: "North corridor", portfolioId: "pf-1" },
    );
  });
});

describe("createProjectRequestFromForm", () => {
  it("omits workspaceId for legacy Portfolio-bound create so the portfolio permission path remains", () => {
    assert.deepEqual(
      createProjectRequestFromForm({
        name: "North corridor",
        resolvedWorkspaceId: "ws-1",
        resolvedPortfolioId: "pf-1",
        launchedWithWorkspaceId: false,
        portfolioBound: true,
      }),
      { name: "North corridor", portfolioId: "pf-1" },
    );
  });

  it("sends Workspace as required context when launched from a Workspace surface", () => {
    assert.deepEqual(
      createProjectRequestFromForm({
        name: "North corridor",
        resolvedWorkspaceId: "ws-1",
        resolvedPortfolioId: "pf-unique",
        launchedWithWorkspaceId: true,
        portfolioBound: true,
      }),
      { name: "North corridor", workspaceId: "ws-1", portfolioId: "pf-unique" },
    );
    assert.deepEqual(
      createProjectRequestFromForm({
        name: "North corridor",
        resolvedWorkspaceId: "ws-1",
        resolvedPortfolioId: "",
        launchedWithWorkspaceId: true,
        portfolioBound: false,
      }),
      { name: "North corridor", workspaceId: "ws-1" },
    );
  });
});

describe("canCreateProjectInCreatableWorkspace", () => {
  it("mirrors POST /api/projects creatable-workspace authorisation", () => {
    assert.equal(canCreateProjectInCreatableWorkspace(["ws-1"], "ws-1"), true);
    assert.equal(canCreateProjectInCreatableWorkspace(["ws-1", "ws-2"], "ws-2"), true);
    assert.equal(canCreateProjectInCreatableWorkspace(["ws-1"], "ws-member"), false);
    assert.equal(canCreateProjectInCreatableWorkspace([], "ws-1"), false);
  });
});

describe("project onboarding href/detail", () => {
  it("opens from a Workspace without requiring unique portfolioId", () => {
    assert.equal(projectOnboardingHref({ workspaceId: "ws-1" }), "/create-project?workspaceId=ws-1");
    assert.deepEqual(openProjectOnboardingDetail({ workspaceId: "ws-1" }), {
      workspaceId: "ws-1",
    });
  });

  it("includes optional unique Portfolio as compatibility", () => {
    assert.equal(
      projectOnboardingHref({ workspaceId: "ws-1", portfolioId: "pf-1" }),
      "/create-project?workspaceId=ws-1&portfolioId=pf-1",
    );
  });

  it("keeps legacy Portfolio href", () => {
    assert.equal(projectOnboardingHref({ portfolioId: "pf-1" }), "/create-project?portfolioId=pf-1");
  });
});

describe("resolveProjectCreateFormParent", () => {
  it("binds Workspace-native create without auto-picking a Portfolio", () => {
    assert.deepEqual(
      resolveProjectCreateFormParent({
        preferredWorkspaceId: "ws-1",
        workspaces: [{ id: "ws-1" }],
        portfolios: PORTFOLIOS,
      }),
      {
        selectedWorkspaceId: "ws-1",
        selectedPortfolioId: "",
        workspaceBound: true,
        portfolioBound: false,
        preferredWorkspaceDenied: false,
      },
    );
  });

  it("binds an explicit unique/legacy Portfolio and its Workspace", () => {
    assert.deepEqual(
      resolveProjectCreateFormParent({
        preferredWorkspaceId: "ws-1",
        preferredPortfolioId: "pf-1",
        workspaces: [{ id: "ws-1" }],
        portfolios: PORTFOLIOS,
      }),
      {
        selectedWorkspaceId: "ws-1",
        selectedPortfolioId: "pf-1",
        workspaceBound: true,
        portfolioBound: true,
        preferredWorkspaceDenied: false,
      },
    );
  });

  it("denies a preferred Workspace that is not creatable", () => {
    assert.deepEqual(
      resolveProjectCreateFormParent({
        preferredWorkspaceId: "ws-member",
        workspaces: [{ id: "ws-admin" }],
        portfolios: [],
      }),
      {
        selectedWorkspaceId: "",
        selectedPortfolioId: "",
        workspaceBound: false,
        portfolioBound: false,
        preferredWorkspaceDenied: true,
      },
    );
  });
});

describe("projectCreateSelectorVisibility", () => {
  it("does not introduce a Portfolio selector on Workspace-native launch", () => {
    assert.deepEqual(
      projectCreateSelectorVisibility({
        portfolioBound: false,
        workspaceBound: true,
        preferredWorkspaceDenied: false,
        workspacesCount: 1,
        selectedWorkspaceId: "ws-1",
        portfoliosInSelectedWorkspaceCount: 2,
      }),
      { showWorkspaceSelector: false, showPortfolioSelector: false },
    );
  });

  it("still offers an optional Portfolio selector on unscoped dashboard launch", () => {
    assert.deepEqual(
      projectCreateSelectorVisibility({
        portfolioBound: false,
        workspaceBound: false,
        preferredWorkspaceDenied: false,
        workspacesCount: 1,
        selectedWorkspaceId: "ws-1",
        portfoliosInSelectedWorkspaceCount: 2,
      }),
      { showWorkspaceSelector: false, showPortfolioSelector: true },
    );
  });
});
