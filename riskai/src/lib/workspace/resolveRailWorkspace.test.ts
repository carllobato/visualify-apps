import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";
import { resolveRailWorkspace } from "./resolveRailWorkspace";

const GREEN: EntitledWorkspace = {
  id: "ws-green",
  name: "GreenSquare",
  slug: "greensquare",
  website_url: "https://www.greensquare.com.au",
  logo_url: null,
};

const OTHER: EntitledWorkspace = {
  id: "ws-other",
  name: "Other",
  slug: "other",
  website_url: null,
  logo_url: null,
};

const WORKSPACES = [GREEN, OTHER];

describe("resolveRailWorkspace", () => {
  it("prefers the Workspace id from the URL when it is entitled", () => {
    assert.equal(
      resolveRailWorkspace({
        workspaces: WORKSPACES,
        pathnameWorkspaceId: GREEN.id,
        projectWorkspaceId: OTHER.id,
        selectedWorkspaceId: OTHER.id,
      }),
      GREEN
    );
  });

  it("uses the Project workspace_id when the URL has no Workspace segment", () => {
    assert.equal(
      resolveRailWorkspace({
        workspaces: WORKSPACES,
        pathnameWorkspaceId: null,
        projectWorkspaceId: OTHER.id,
        selectedWorkspaceId: GREEN.id,
      }),
      OTHER
    );
  });

  it("falls back to the authorised selected Workspace", () => {
    assert.equal(
      resolveRailWorkspace({
        workspaces: WORKSPACES,
        pathnameWorkspaceId: null,
        projectWorkspaceId: null,
        selectedWorkspaceId: GREEN.id,
      }),
      GREEN
    );
  });

  it("ignores unentitled Workspace ids", () => {
    assert.equal(
      resolveRailWorkspace({
        workspaces: WORKSPACES,
        pathnameWorkspaceId: "ws-foreign",
        projectWorkspaceId: "ws-also-foreign",
        selectedWorkspaceId: GREEN.id,
      }),
      GREEN
    );
  });
});
