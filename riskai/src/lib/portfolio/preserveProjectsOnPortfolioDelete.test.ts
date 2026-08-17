import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAuthoritativeProjectWorkspaceId } from "@/lib/project/projectArchiveLifecycle";
import {
  applyPortfolioDeleteProjectHandling,
  planPortfolioDeleteProjectHandling,
} from "./preserveProjectsOnPortfolioDelete";

describe("planPortfolioDeleteProjectHandling", () => {
  it("unlinks Projects and forbids deleting Project rows or child data", () => {
    const plan = planPortfolioDeleteProjectHandling();
    assert.equal(plan.action, "unlink");
    assert.deepEqual(plan.projectUpdate, { portfolio_id: null });
    assert.equal(plan.legacyProjectUpdate, null);
    assert.equal(plan.mayDeleteProjectRows, false);
    assert.equal(plan.mayDeleteProjectChildData, false);
  });

  it("plans a legacy Workspace backfill when the Portfolio has a workspace_id", () => {
    const plan = planPortfolioDeleteProjectHandling({ portfolioWorkspaceId: "  ws-green  " });
    assert.deepEqual(plan.legacyProjectUpdate, {
      workspace_id: "ws-green",
      portfolio_id: null,
    });
    assert.deepEqual(plan.projectUpdate, { portfolio_id: null });
    assert.equal(plan.mayDeleteProjectRows, false);
    assert.equal(plan.mayDeleteProjectChildData, false);
  });

  it("does not invent a workspace_id when the Portfolio has none", () => {
    const plan = planPortfolioDeleteProjectHandling({ portfolioWorkspaceId: "  " });
    assert.equal(plan.legacyProjectUpdate, null);
  });
});

describe("applyPortfolioDeleteProjectHandling", () => {
  it("backfills null workspace_id on legacy rows and unlinks without overwriting other workspaces", () => {
    const plan = planPortfolioDeleteProjectHandling({ portfolioWorkspaceId: "ws-green" });
    const after = applyPortfolioDeleteProjectHandling(
      [
        { id: "legacy", workspace_id: null, portfolio_id: "pf-1" },
        { id: "already", workspace_id: "ws-green", portfolio_id: "pf-1" },
        { id: "other-ws", workspace_id: "ws-other", portfolio_id: "pf-1" },
      ],
      plan,
    );

    assert.deepEqual(after, [
      { id: "legacy", workspace_id: "ws-green", portfolio_id: null },
      { id: "already", workspace_id: "ws-green", portfolio_id: null },
      { id: "other-ws", workspace_id: "ws-other", portfolio_id: null },
    ]);
  });

  it("keeps archive/restore Workspace resolution after unlink when the Portfolio is gone", () => {
    const plan = planPortfolioDeleteProjectHandling({ portfolioWorkspaceId: "ws-green" });
    const [legacy] = applyPortfolioDeleteProjectHandling(
      [{ workspace_id: null, portfolio_id: "pf-1" }],
      plan,
    );

    assert.equal(
      resolveAuthoritativeProjectWorkspaceId({
        projectWorkspaceId: legacy.workspace_id,
        linkedPortfolioWorkspaceId: null,
      }),
      "ws-green",
    );
  });

  it("leaves a null workspace_id when the Portfolio cannot supply one", () => {
    const plan = planPortfolioDeleteProjectHandling({ portfolioWorkspaceId: null });
    const [legacy] = applyPortfolioDeleteProjectHandling(
      [{ workspace_id: null, portfolio_id: "pf-1" }],
      plan,
    );
    assert.equal(legacy.workspace_id, null);
    assert.equal(legacy.portfolio_id, null);
  });
});
