import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WORKSPACE_ROLE_RANK,
  WORKSPACE_ROLES,
  canAssignWorkspaceRole,
  canInviteToWorkspace,
  getAssignableWorkspaceInviteRoles,
  isWorkspaceOwner,
  isWorkspaceRoleAtLeast,
  normalizeWorkspaceRole,
  workspaceRoleRank,
} from "./workspaceRoles.ts";

describe("workspaceRoles", () => {
  it("defines four roles in privilege order", () => {
    assert.deepEqual([...WORKSPACE_ROLES], ["owner", "admin", "member", "viewer"]);
    assert.equal(workspaceRoleRank("owner"), 0);
    assert.equal(workspaceRoleRank("viewer"), 3);
    assert.equal(WORKSPACE_ROLE_RANK.admin, 1);
  });

  it("isWorkspaceRoleAtLeast compares privilege", () => {
    assert.equal(isWorkspaceRoleAtLeast("owner", "viewer"), true);
    assert.equal(isWorkspaceRoleAtLeast("viewer", "admin"), false);
    assert.equal(isWorkspaceRoleAtLeast("admin", "admin"), true);
  });

  it("canAssignWorkspaceRole allows equal or lower roles only", () => {
    assert.equal(canAssignWorkspaceRole("owner", "viewer"), true);
    assert.equal(canAssignWorkspaceRole("admin", "member"), true);
    assert.equal(canAssignWorkspaceRole("admin", "owner"), false);
    assert.equal(canAssignWorkspaceRole("viewer", "viewer"), true);
    assert.equal(canAssignWorkspaceRole("viewer", "member"), false);
  });

  it("getAssignableWorkspaceInviteRoles respects invite hierarchy", () => {
    assert.deepEqual(getAssignableWorkspaceInviteRoles("owner"), [
      "owner",
      "admin",
      "member",
      "viewer",
    ]);
    assert.deepEqual(getAssignableWorkspaceInviteRoles("admin"), ["admin", "member", "viewer"]);
    assert.deepEqual(getAssignableWorkspaceInviteRoles("member"), ["member", "viewer"]);
    assert.deepEqual(getAssignableWorkspaceInviteRoles("viewer"), []);
  });

  it("canInviteToWorkspace excludes viewer inviters", () => {
    assert.equal(canInviteToWorkspace("owner"), true);
    assert.equal(canInviteToWorkspace("member"), true);
    assert.equal(canInviteToWorkspace("viewer"), false);
  });

  it("isWorkspaceOwner identifies owner only", () => {
    assert.equal(isWorkspaceOwner("owner"), true);
    assert.equal(isWorkspaceOwner("admin"), false);
    assert.equal(isWorkspaceOwner(" Owner "), true);
  });

  it("normalizeWorkspaceRole trims and lowercases", () => {
    assert.equal(normalizeWorkspaceRole(" Admin "), "admin");
    assert.equal(normalizeWorkspaceRole("invalid"), null);
  });
});
