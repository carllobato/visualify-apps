import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveUnscopedProjectCreateTarget,
  resolveWorkspaceNativeProjectCreateTarget,
} from "./resolveWorkspaceNativeProjectCreateTarget";

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
