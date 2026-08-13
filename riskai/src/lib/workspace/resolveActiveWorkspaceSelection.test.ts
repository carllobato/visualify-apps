import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveActiveWorkspaceSelection } from "./resolveActiveWorkspaceSelection";

describe("resolveActiveWorkspaceSelection", () => {
  it("returns null selection when there are 0 entitled workspaces", () => {
    assert.deepEqual(
      resolveActiveWorkspaceSelection({
        workspaceIds: [],
        cookieWorkspaceId: "ws-forged",
      }),
      { selectedWorkspaceId: null, needsSelection: false },
    );
  });

  it("auto-selects the only entitled workspace and ignores needsSelection", () => {
    assert.deepEqual(
      resolveActiveWorkspaceSelection({
        workspaceIds: ["ws-1"],
        cookieWorkspaceId: null,
      }),
      { selectedWorkspaceId: "ws-1", needsSelection: false },
    );
  });

  it("auto-selects the only entitled workspace even when cookie is missing or forged", () => {
    assert.deepEqual(
      resolveActiveWorkspaceSelection({
        workspaceIds: ["ws-1"],
        cookieWorkspaceId: "ws-other",
      }),
      { selectedWorkspaceId: "ws-1", needsSelection: false },
    );
  });

  it("uses a valid cookie when 2+ entitled workspaces exist", () => {
    assert.deepEqual(
      resolveActiveWorkspaceSelection({
        workspaceIds: ["ws-a", "ws-b"],
        cookieWorkspaceId: "ws-b",
      }),
      { selectedWorkspaceId: "ws-b", needsSelection: false },
    );
  });

  it("requires selection when 2+ entitled and cookie is missing", () => {
    assert.deepEqual(
      resolveActiveWorkspaceSelection({
        workspaceIds: ["ws-a", "ws-b"],
        cookieWorkspaceId: null,
      }),
      { selectedWorkspaceId: null, needsSelection: true },
    );
  });

  it("requires selection when 2+ entitled and cookie is forged / not entitled", () => {
    assert.deepEqual(
      resolveActiveWorkspaceSelection({
        workspaceIds: ["ws-a", "ws-b"],
        cookieWorkspaceId: "ws-forged",
      }),
      { selectedWorkspaceId: null, needsSelection: true },
    );
  });
});
