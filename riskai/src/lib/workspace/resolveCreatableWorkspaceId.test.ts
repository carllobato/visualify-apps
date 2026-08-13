import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertRequestedWorkspaceMatchesPortfolio,
  resolveCreatableWorkspaceId,
} from "./resolveCreatableWorkspaceId";

describe("resolveCreatableWorkspaceId", () => {
  it("blocks when there are no creatable workspaces", () => {
    assert.deepEqual(resolveCreatableWorkspaceId({ creatableIds: [] }), { error: "none" });
    assert.deepEqual(
      resolveCreatableWorkspaceId({
        creatableIds: [],
        requestedWorkspaceId: "ws-1",
      }),
      { error: "none" },
    );
  });

  it("auto-binds the only creatable workspace when none requested", () => {
    assert.deepEqual(resolveCreatableWorkspaceId({ creatableIds: ["ws-1"] }), {
      workspaceId: "ws-1",
    });
  });

  it("uses an authorised requested workspace when multiple exist", () => {
    assert.deepEqual(
      resolveCreatableWorkspaceId({
        creatableIds: ["ws-a", "ws-b"],
        requestedWorkspaceId: "ws-b",
      }),
      { workspaceId: "ws-b" },
    );
  });

  it("does not pick the first workspace when 2+ and none requested", () => {
    assert.deepEqual(resolveCreatableWorkspaceId({ creatableIds: ["ws-a", "ws-b"] }), {
      error: "workspace_required",
    });
  });

  it("rejects a requested workspace outside the authorised set", () => {
    assert.deepEqual(
      resolveCreatableWorkspaceId({
        creatableIds: ["ws-a", "ws-b"],
        requestedWorkspaceId: "ws-other",
      }),
      { error: "forbidden" },
    );
  });
});

describe("assertRequestedWorkspaceMatchesPortfolio", () => {
  it("allows omitted client workspaceId", () => {
    assert.deepEqual(
      assertRequestedWorkspaceMatchesPortfolio({ portfolioWorkspaceId: "ws-1" }),
      { ok: true },
    );
  });

  it("allows matching client workspaceId", () => {
    assert.deepEqual(
      assertRequestedWorkspaceMatchesPortfolio({
        portfolioWorkspaceId: "ws-1",
        requestedWorkspaceId: "ws-1",
      }),
      { ok: true },
    );
  });

  it("rejects mismatched client workspaceId", () => {
    assert.deepEqual(
      assertRequestedWorkspaceMatchesPortfolio({
        portfolioWorkspaceId: "ws-1",
        requestedWorkspaceId: "ws-2",
      }),
      { error: "workspace_mismatch" },
    );
  });
});
