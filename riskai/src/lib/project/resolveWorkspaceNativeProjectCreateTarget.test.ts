import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProjectCreateInsert,
  resolveAuthorizedProjectCreateTarget,
  resolveUnscopedProjectCreateTarget,
  resolveWorkspaceNativeProjectCreateTarget,
} from "./resolveWorkspaceNativeProjectCreateTarget";
import { workspaceRoleCanCreateProject } from "@/lib/workspace/workspaceRoleCapabilities";
import type { WorkspaceRole } from "@visualify/workspace-product-access";

describe("resolveWorkspaceNativeProjectCreateTarget", () => {
  it("creates against the requested Workspace", () => {
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: ["ws-1"],
        requestedWorkspaceId: "ws-1",
      }),
      { workspaceId: "ws-1" },
    );
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: ["ws-1", "ws-2"],
        requestedWorkspaceId: "ws-1",
      }),
      { workspaceId: "ws-1" },
    );
  });

  it("forbids create when the Workspace is not in the creatable set", () => {
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: ["ws-admin"],
        requestedWorkspaceId: "ws-member",
      }),
      { error: "forbidden" },
    );
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: [],
        requestedWorkspaceId: "ws-1",
      }),
      { error: "none" },
    );
  });
});

describe("resolveUnscopedProjectCreateTarget", () => {
  it("auto-binds the only creatable Workspace", () => {
    assert.deepEqual(resolveUnscopedProjectCreateTarget({ creatableIds: ["ws-1"] }), {
      workspaceId: "ws-1",
    });
  });

  it("requires an explicit Workspace when 2+ creatable Workspaces exist", () => {
    assert.deepEqual(resolveUnscopedProjectCreateTarget({ creatableIds: ["ws-a", "ws-b"] }), {
      error: "workspace_required",
    });
  });
});

function creatableIdsForWorkspaceRole(role: WorkspaceRole, workspaceId: string): string[] {
  return workspaceRoleCanCreateProject(role) ? [workspaceId] : [];
}

describe("resolveAuthorizedProjectCreateTarget — Workspace authority", () => {
  it("allows Workspace Owner to create", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: creatableIdsForWorkspaceRole("owner", "ws-1"),
        requestedWorkspaceId: "ws-1",
      }),
      { workspaceId: "ws-1" },
    );
  });

  it("allows Workspace Admin to create", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: creatableIdsForWorkspaceRole("admin", "ws-1"),
        requestedWorkspaceId: "ws-1",
      }),
      { workspaceId: "ws-1" },
    );
  });

  it("rejects Workspace Member", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: creatableIdsForWorkspaceRole("member", "ws-1"),
        requestedWorkspaceId: "ws-1",
      }),
      { error: "none" },
    );
  });

  it("rejects Workspace Viewer", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: creatableIdsForWorkspaceRole("viewer", "ws-1"),
        requestedWorkspaceId: "ws-1",
      }),
      { error: "none" },
    );
  });
});

describe("resolveAuthorizedProjectCreateTarget — Portfolio cannot grant authority", () => {
  it("rejects Workspace Member even if a Portfolio id is present on the client", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: creatableIdsForWorkspaceRole("member", "ws-1"),
        requestedWorkspaceId: "ws-1",
      }),
      { error: "none" },
    );
  });

  it("does not resolve Workspace from a Portfolio id", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: ["ws-1", "ws-2"],
      }),
      { error: "workspace_required" },
    );
  });
});

describe("buildProjectCreateInsert", () => {
  it("writes workspace_id and does not write portfolio_id", () => {
    const insert = buildProjectCreateInsert({
      ownerUserId: "user-1",
      name: "North corridor",
      workspaceId: "ws-1",
    });
    assert.deepEqual(insert, {
      owner_user_id: "user-1",
      name: "North corridor",
      workspace_id: "ws-1",
    });
    assert.equal("portfolio_id" in insert, false);
  });
});

describe("resolveAuthorizedProjectCreateTarget — unscoped 0 / 1 / 2+", () => {
  it("rejects when there are 0 creatable Workspaces", () => {
    assert.deepEqual(resolveAuthorizedProjectCreateTarget({ creatableIds: [] }), {
      error: "none",
    });
  });

  it("auto-binds the only creatable Workspace", () => {
    assert.deepEqual(resolveAuthorizedProjectCreateTarget({ creatableIds: ["ws-1"] }), {
      workspaceId: "ws-1",
    });
  });

  it("requires Workspace selection when 2+ creatable Workspaces exist", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({ creatableIds: ["ws-a", "ws-b"] }),
      { error: "workspace_required" },
    );
  });
});
