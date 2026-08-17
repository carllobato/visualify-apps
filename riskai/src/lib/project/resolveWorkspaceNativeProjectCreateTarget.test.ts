import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAuthorizedProjectCreateTarget,
  resolveUnscopedProjectCreateTarget,
  resolveWorkspaceNativeProjectCreateTarget,
} from "./resolveWorkspaceNativeProjectCreateTarget";
import { workspaceRoleCanCreateProject } from "@/lib/workspace/workspaceRoleCapabilities";
import type { WorkspaceRole } from "@visualify/workspace-product-access";

describe("resolveWorkspaceNativeProjectCreateTarget", () => {
  it("creates against the requested Workspace with portfolio_id null when none is supplied", () => {
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: ["ws-1"],
        requestedWorkspaceId: "ws-1",
        optionalPortfolio: { status: "omitted" },
      }),
      { workspaceId: "ws-1", portfolioId: null },
    );
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: ["ws-1", "ws-2"],
        requestedWorkspaceId: "ws-1",
      }),
      { workspaceId: "ws-1", portfolioId: null },
    );
  });

  it("does not pick a Portfolio when the Workspace has 2+ internal Portfolios and none was supplied", () => {
    const result = resolveWorkspaceNativeProjectCreateTarget({
      creatableIds: ["ws-1"],
      requestedWorkspaceId: "ws-1",
      optionalPortfolio: { status: "omitted" },
    });
    assert.deepEqual(result, { workspaceId: "ws-1", portfolioId: null });
  });

  it("links a unique Portfolio as an optional association when it belongs to the Workspace", () => {
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: ["ws-1"],
        requestedWorkspaceId: "ws-1",
        optionalPortfolio: { status: "found", id: "pf-unique", workspaceId: "ws-1" },
      }),
      { workspaceId: "ws-1", portfolioId: "pf-unique" },
    );
  });

  it("rejects a Portfolio that does not belong to the requested Workspace", () => {
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: ["ws-1"],
        requestedWorkspaceId: "ws-1",
        optionalPortfolio: { status: "found", id: "pf-other", workspaceId: "ws-2" },
      }),
      { error: "workspace_mismatch" },
    );
  });

  it("rejects a missing optional Portfolio id", () => {
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: ["ws-1"],
        requestedWorkspaceId: "ws-1",
        optionalPortfolio: { status: "missing" },
      }),
      { error: "not_found" },
    );
  });

  it("forbids create when the Workspace is not in the creatable set", () => {
    assert.deepEqual(
      resolveWorkspaceNativeProjectCreateTarget({
        creatableIds: ["ws-admin"],
        requestedWorkspaceId: "ws-member",
        optionalPortfolio: { status: "omitted" },
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
  it("auto-binds the only creatable Workspace with portfolio_id null", () => {
    assert.deepEqual(resolveUnscopedProjectCreateTarget({ creatableIds: ["ws-1"] }), {
      workspaceId: "ws-1",
      portfolioId: null,
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
      { workspaceId: "ws-1", portfolioId: null },
    );
  });

  it("allows Workspace Admin to create", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: creatableIdsForWorkspaceRole("admin", "ws-1"),
        requestedWorkspaceId: "ws-1",
      }),
      { workspaceId: "ws-1", portfolioId: null },
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
  it("rejects Workspace Member even when they are Portfolio owner/editor", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: creatableIdsForWorkspaceRole("member", "ws-1"),
        optionalPortfolio: { status: "found", id: "pf-1", workspaceId: "ws-1" },
      }),
      { error: "none" },
    );
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: ["ws-other"],
        optionalPortfolio: { status: "found", id: "pf-1", workspaceId: "ws-1" },
      }),
      { error: "forbidden" },
    );
  });

  it("allows Workspace Owner/Admin and retains optional Portfolio association", () => {
    for (const role of ["owner", "admin"] as const) {
      assert.deepEqual(
        resolveAuthorizedProjectCreateTarget({
          creatableIds: creatableIdsForWorkspaceRole(role, "ws-1"),
          optionalPortfolio: { status: "found", id: "pf-1", workspaceId: "ws-1" },
        }),
        { workspaceId: "ws-1", portfolioId: "pf-1" },
      );
    }
  });

  it("uses the Portfolio Workspace when no client workspaceId is sent, even with 2+ creatable Workspaces", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: ["ws-1", "ws-2"],
        optionalPortfolio: { status: "found", id: "pf-1", workspaceId: "ws-1" },
      }),
      { workspaceId: "ws-1", portfolioId: "pf-1" },
    );
  });
});

describe("resolveAuthorizedProjectCreateTarget — Portfolio counts", () => {
  it("creates in a 0-Portfolio Workspace with portfolio_id null", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: ["ws-1"],
        requestedWorkspaceId: "ws-1",
        optionalPortfolio: { status: "omitted" },
      }),
      { workspaceId: "ws-1", portfolioId: null },
    );
  });

  it("keeps unique-Portfolio optional association when one belongs to the Workspace", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: ["ws-1"],
        requestedWorkspaceId: "ws-1",
        optionalPortfolio: { status: "found", id: "pf-unique", workspaceId: "ws-1" },
      }),
      { workspaceId: "ws-1", portfolioId: "pf-unique" },
    );
  });

  it("creates in a 2+ Portfolio Workspace without requiring a Portfolio", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({
        creatableIds: ["ws-1"],
        requestedWorkspaceId: "ws-1",
        optionalPortfolio: { status: "omitted" },
      }),
      { workspaceId: "ws-1", portfolioId: null },
    );
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
      portfolioId: null,
    });
  });

  it("requires Workspace selection when 2+ creatable Workspaces exist", () => {
    assert.deepEqual(
      resolveAuthorizedProjectCreateTarget({ creatableIds: ["ws-a", "ws-b"] }),
      { error: "workspace_required" },
    );
  });
});
