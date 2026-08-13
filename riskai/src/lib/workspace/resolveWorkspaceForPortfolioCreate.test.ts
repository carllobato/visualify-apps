import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveWorkspaceForPortfolioCreate } from "./resolveWorkspaceForPortfolioCreate";

describe("resolveWorkspaceForPortfolioCreate (alias)", () => {
  it("preserves portfolio-create 0/1/2+ behaviour via shared resolver", () => {
    assert.deepEqual(resolveWorkspaceForPortfolioCreate({ creatableIds: [] }), { error: "none" });
    assert.deepEqual(resolveWorkspaceForPortfolioCreate({ creatableIds: ["ws-1"] }), {
      workspaceId: "ws-1",
    });
    assert.deepEqual(resolveWorkspaceForPortfolioCreate({ creatableIds: ["ws-a", "ws-b"] }), {
      error: "workspace_required",
    });
  });
});
