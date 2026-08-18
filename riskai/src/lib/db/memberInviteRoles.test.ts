import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAssignProjectInviteRole,
  getAssignableProjectInviteRoles,
} from "./memberInviteRoles";

describe("getAssignableProjectInviteRoles", () => {
  it("returns all Project roles for Workspace Owner/Admin member administration", () => {
    assert.deepEqual(
      getAssignableProjectInviteRoles("editor", { canManageProjectMembers: true }),
      ["owner", "editor", "viewer"],
    );
    assert.deepEqual(
      getAssignableProjectInviteRoles(null, { canManageProjectMembers: true }),
      ["owner", "editor", "viewer"],
    );
  });

  it("returns no invite roles for Direct Project Owner/Editor without Workspace administration", () => {
    assert.deepEqual(getAssignableProjectInviteRoles("owner"), []);
    assert.deepEqual(getAssignableProjectInviteRoles("editor"), []);
    assert.deepEqual(
      getAssignableProjectInviteRoles("owner", { canManageProjectMembers: false }),
      [],
    );
  });
});

describe("canAssignProjectInviteRole", () => {
  it("allows Workspace Owner/Admin to assign any Project role", () => {
    assert.equal(canAssignProjectInviteRole("editor", "owner", { canManageProjectMembers: true }), true);
    assert.equal(canAssignProjectInviteRole(null, "viewer", { canManageProjectMembers: true }), true);
  });

  it("rejects invite role assignment from Project Owner/Editor without Workspace administration", () => {
    assert.equal(canAssignProjectInviteRole("owner", "editor"), false);
    assert.equal(canAssignProjectInviteRole("editor", "viewer"), false);
  });
});
