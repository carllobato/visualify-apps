import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProjectHeaderWorkspace } from "./resolveProjectHeaderWorkspace";

const GREEN = { id: "ws-green", name: "GreenSquare" };
const OTHER = { id: "ws-other", name: "Other" };

describe("resolveProjectHeaderWorkspace", () => {
  it("returns the entitled Workspace for the Project workspace_id, ignoring Portfolio", () => {
    assert.deepEqual(
      resolveProjectHeaderWorkspace({
        projectWorkspaceId: GREEN.id,
        entitledWorkspaces: [GREEN, OTHER],
      }),
      { id: GREEN.id, name: "GreenSquare" }
    );
  });

  it("treats linked and unlinked Projects the same when workspace_id is entitled", () => {
    const linked = resolveProjectHeaderWorkspace({
      projectWorkspaceId: GREEN.id,
      entitledWorkspaces: [GREEN],
    });
    const unlinked = resolveProjectHeaderWorkspace({
      projectWorkspaceId: GREEN.id,
      entitledWorkspaces: [GREEN],
    });
    assert.deepEqual(linked, unlinked);
    assert.equal(linked?.id, GREEN.id);
  });

  it("does not expose a Workspace the viewer is not entitled to", () => {
    assert.equal(
      resolveProjectHeaderWorkspace({
        projectWorkspaceId: GREEN.id,
        entitledWorkspaces: [OTHER],
      }),
      null
    );
  });

  it("returns null when the Project has no workspace_id", () => {
    assert.equal(
      resolveProjectHeaderWorkspace({
        projectWorkspaceId: null,
        entitledWorkspaces: [GREEN],
      }),
      null
    );
    assert.equal(
      resolveProjectHeaderWorkspace({
        projectWorkspaceId: "  ",
        entitledWorkspaces: [GREEN],
      }),
      null
    );
  });
});
