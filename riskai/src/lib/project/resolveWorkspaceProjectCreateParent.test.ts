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

describe("resolveWorkspaceProjectCreateParent", () => {
  it("always supplies Workspace as the required parent", () => {
    assert.deepEqual(resolveWorkspaceProjectCreateParent({ workspaceId: "ws-1" }), {
      workspaceId: "ws-1",
    });
  });

  it("rejects a blank Workspace", () => {
    assert.deepEqual(resolveWorkspaceProjectCreateParent({ workspaceId: "  " }), {
      error: "workspace_required",
    });
  });
});

describe("buildCreateProjectRequestBody", () => {
  it("sends workspaceId and never portfolioId", () => {
    assert.deepEqual(
      buildCreateProjectRequestBody({ name: "North corridor", workspaceId: "ws-1" }),
      { name: "North corridor", workspaceId: "ws-1" },
    );
    const body = buildCreateProjectRequestBody({ name: "North corridor", workspaceId: "ws-1" });
    assert.equal("portfolioId" in body, false);
  });
});

describe("createProjectRequestFromForm", () => {
  it("sends Workspace as required context", () => {
    assert.deepEqual(
      createProjectRequestFromForm({
        name: "North corridor",
        resolvedWorkspaceId: "ws-1",
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
  it("opens from a Workspace without portfolioId", () => {
    assert.equal(projectOnboardingHref({ workspaceId: "ws-1" }), "/create-project?workspaceId=ws-1");
    assert.deepEqual(openProjectOnboardingDetail({ workspaceId: "ws-1" }), {
      workspaceId: "ws-1",
    });
    assert.equal(projectOnboardingHref({ workspaceId: "ws-1" }).includes("portfolioId"), false);
  });
});

describe("resolveProjectCreateFormParent", () => {
  it("binds Workspace-native create", () => {
    assert.deepEqual(
      resolveProjectCreateFormParent({
        preferredWorkspaceId: "ws-1",
        workspaces: [{ id: "ws-1" }],
      }),
      {
        selectedWorkspaceId: "ws-1",
        workspaceBound: true,
        preferredWorkspaceDenied: false,
      },
    );
  });

  it("denies a preferred Workspace that is not creatable", () => {
    assert.deepEqual(
      resolveProjectCreateFormParent({
        preferredWorkspaceId: "ws-member",
        workspaces: [{ id: "ws-admin" }],
      }),
      {
        selectedWorkspaceId: "",
        workspaceBound: false,
        preferredWorkspaceDenied: true,
      },
    );
  });
});

describe("projectCreateSelectorVisibility", () => {
  it("does not introduce a selector on Workspace-native launch", () => {
    assert.deepEqual(
      projectCreateSelectorVisibility({
        workspaceBound: true,
        preferredWorkspaceDenied: false,
        workspacesCount: 1,
      }),
      { showWorkspaceSelector: false },
    );
  });

  it("offers a Workspace selector on unscoped launch with 2+ Workspaces", () => {
    assert.deepEqual(
      projectCreateSelectorVisibility({
        workspaceBound: false,
        preferredWorkspaceDenied: false,
        workspacesCount: 2,
      }),
      { showWorkspaceSelector: true },
    );
  });
});
