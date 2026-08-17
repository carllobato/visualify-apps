import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProjectMemberCapabilityFlags } from "./projectMemberAccess";

describe("resolveProjectMemberCapabilityFlags", () => {
  it("denies invite, role change, and remove for a direct editor", () => {
    const caps = resolveProjectMemberCapabilityFlags(false, "editor");
    assert.deepEqual(caps, {
      canInviteMembers: false,
      canChangeMemberRoles: false,
      canRemoveMembers: false,
    });
  });

  it("retains member administration for table owner", () => {
    const caps = resolveProjectMemberCapabilityFlags(true, undefined);
    assert.deepEqual(caps, {
      canInviteMembers: true,
      canChangeMemberRoles: true,
      canRemoveMembers: true,
    });
  });

  it("retains member administration for direct project owner", () => {
    const caps = resolveProjectMemberCapabilityFlags(false, "owner");
    assert.deepEqual(caps, {
      canInviteMembers: true,
      canChangeMemberRoles: true,
      canRemoveMembers: true,
    });
  });

  it("denies member administration for a direct viewer", () => {
    const caps = resolveProjectMemberCapabilityFlags(false, "viewer");
    assert.deepEqual(caps, {
      canInviteMembers: false,
      canChangeMemberRoles: false,
      canRemoveMembers: false,
    });
  });
});
