import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveWorkspacePortfolioCapabilities,
  resolveWorkspaceProjectCapabilities,
} from "./workspaceRoleCapabilities";

describe("resolveWorkspacePortfolioCapabilities", () => {
  it("grants portfolio admin to owner and admin", () => {
    for (const role of ["owner", "admin"] as const) {
      const caps = resolveWorkspacePortfolioCapabilities(role);
      assert.equal(caps.canAccessPortfolioSettings, true);
      assert.equal(caps.canEditPortfolioDetails, true);
      assert.equal(caps.canInviteMembers, true);
      assert.equal(caps.canChangeMemberRoles, true);
      assert.equal(caps.canRemoveMembers, true);
    }
  });

  it("denies portfolio admin to member but allows user management", () => {
    const caps = resolveWorkspacePortfolioCapabilities("member");
    assert.equal(caps.canAccessPortfolioSettings, false);
    assert.equal(caps.canEditPortfolioDetails, false);
    assert.equal(caps.canInviteMembers, true);
    assert.equal(caps.canChangeMemberRoles, true);
    assert.equal(caps.canRemoveMembers, true);
  });

  it("is read-only for viewer", () => {
    const caps = resolveWorkspacePortfolioCapabilities("viewer");
    assert.deepEqual(caps, {
      canAccessPortfolioSettings: false,
      canEditPortfolioDetails: false,
      canInviteMembers: false,
      canChangeMemberRoles: false,
      canRemoveMembers: false,
    });
  });
});

describe("resolveWorkspaceProjectCapabilities", () => {
  it("grants full project capabilities to owner and admin", () => {
    for (const role of ["owner", "admin"] as const) {
      const caps = resolveWorkspaceProjectCapabilities(role);
      assert.equal(caps.canEditContent, true);
      assert.equal(caps.canEditProjectMetadata, true);
      assert.equal(caps.canInviteMembers, true);
      assert.equal(caps.accessMode, "owner");
    }
  });

  it("allows content edit and invites for member only", () => {
    const caps = resolveWorkspaceProjectCapabilities("member");
    assert.equal(caps.canEditContent, true);
    assert.equal(caps.canEditProjectMetadata, false);
    assert.equal(caps.canInviteMembers, true);
    assert.equal(caps.accessMode, "editor");
  });

  it("is read-only for viewer", () => {
    const caps = resolveWorkspaceProjectCapabilities("viewer");
    assert.equal(caps.canEditContent, false);
    assert.equal(caps.canEditProjectMetadata, false);
    assert.equal(caps.canInviteMembers, false);
    assert.equal(caps.canChangeMemberRoles, false);
    assert.equal(caps.canRemoveMembers, false);
    assert.equal(caps.accessMode, "viewer");
  });
});
