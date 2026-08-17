import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProjectPermissions } from "./projectPermissions.logic";

const TABLE_OWNER = "user-owner";
const OTHER_USER = "user-other";

describe("resolveProjectPermissions", () => {
  it("grants direct editor working-data access without project metadata admin", () => {
    const caps = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: OTHER_USER,
      memberRole: "editor",
    });

    assert.ok(caps, "direct editor can read the project");
    assert.equal(caps.accessMode, "editor");
    assert.equal(caps.canEditContent, true);
    assert.equal(caps.canEditProjectMetadata, false);
    assert.equal(caps.canManageMembers, false);
    assert.equal(caps.canArchiveProject, false);
  });

  it("keeps table owner administrative", () => {
    const caps = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: TABLE_OWNER,
      memberRole: null,
    });

    assert.ok(caps);
    assert.equal(caps.accessMode, "owner");
    assert.equal(caps.canEditContent, true);
    assert.equal(caps.canEditProjectMetadata, true);
    assert.equal(caps.canManageMembers, true);
    assert.equal(caps.canArchiveProject, false);
  });

  it("keeps direct project owner administrative", () => {
    const caps = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: OTHER_USER,
      memberRole: "owner",
    });

    assert.ok(caps);
    assert.equal(caps.accessMode, "owner");
    assert.equal(caps.canEditContent, true);
    assert.equal(caps.canEditProjectMetadata, true);
    assert.equal(caps.canManageMembers, true);
    assert.equal(caps.canArchiveProject, false);
  });

  it("keeps direct viewer read-only", () => {
    const caps = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: OTHER_USER,
      memberRole: "viewer",
    });

    assert.ok(caps, "direct viewer can read the project");
    assert.equal(caps.accessMode, "viewer");
    assert.equal(caps.canEditContent, false);
    assert.equal(caps.canEditProjectMetadata, false);
    assert.equal(caps.canManageMembers, false);
    assert.equal(caps.canArchiveProject, false);
  });
});
