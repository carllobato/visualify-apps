import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveFetchedProjectWorkspaceId } from "./resolveFetchedProjectWorkspaceId";

describe("resolveFetchedProjectWorkspaceId", () => {
  it("returns the fetched workspace_id when it belongs to the URL project", () => {
    assert.equal(
      resolveFetchedProjectWorkspaceId(
        { projectId: "proj-a", workspaceId: "ws-a" },
        "proj-a"
      ),
      "ws-a"
    );
  });

  it("ignores the previous project's workspace_id when the URL project changes", () => {
    assert.equal(
      resolveFetchedProjectWorkspaceId(
        { projectId: "proj-a", workspaceId: "ws-a" },
        "proj-b"
      ),
      null
    );
  });

  it("returns null when there is no project in the URL", () => {
    assert.equal(
      resolveFetchedProjectWorkspaceId({ projectId: "proj-a", workspaceId: "ws-a" }, null),
      null
    );
  });

  it("returns null before the first fetch completes", () => {
    assert.equal(resolveFetchedProjectWorkspaceId(null, "proj-a"), null);
  });
});
