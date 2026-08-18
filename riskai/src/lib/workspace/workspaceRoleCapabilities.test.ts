import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveWorkspacePortfolioCapabilities,
  resolveWorkspaceProjectCapabilities,
  workspaceRoleCanCreateProject,
  workspaceRoleCanArchiveProject,
  workspaceRoleCanManageProjectMembers,
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

describe("workspaceRoleCanCreateProject", () => {
  it("allows Workspace Owner and Admin", () => {
    assert.equal(workspaceRoleCanCreateProject("owner"), true);
    assert.equal(workspaceRoleCanCreateProject("admin"), true);
  });

  it("denies Workspace Member and Viewer", () => {
    assert.equal(workspaceRoleCanCreateProject("member"), false);
    assert.equal(workspaceRoleCanCreateProject("viewer"), false);
  });
});

describe("workspaceRoleCanArchiveProject", () => {
  it("allows Workspace Owner and Admin", () => {
    assert.equal(workspaceRoleCanArchiveProject("owner"), true);
    assert.equal(workspaceRoleCanArchiveProject("admin"), true);
  });

  it("denies Workspace Member, Viewer, and missing role", () => {
    assert.equal(workspaceRoleCanArchiveProject("member"), false);
    assert.equal(workspaceRoleCanArchiveProject("viewer"), false);
    assert.equal(workspaceRoleCanArchiveProject(null), false);
  });
});

describe("workspaceRoleCanManageProjectMembers", () => {
  it("allows Workspace Owner and Admin", () => {
    assert.equal(workspaceRoleCanManageProjectMembers("owner"), true);
    assert.equal(workspaceRoleCanManageProjectMembers("admin"), true);
  });

  it("denies Workspace Member, Viewer, and missing role", () => {
    assert.equal(workspaceRoleCanManageProjectMembers("member"), false);
    assert.equal(workspaceRoleCanManageProjectMembers("viewer"), false);
    assert.equal(workspaceRoleCanManageProjectMembers(null), false);
  });
});

describe("resolveWorkspaceProjectCapabilities", () => {
  it("grants full project capabilities to owner and admin", () => {
    for (const role of ["owner", "admin"] as const) {
      const caps = resolveWorkspaceProjectCapabilities(role);
      assert.equal(caps.canEditContent, true);
      assert.equal(caps.canEditProjectMetadata, true);
      assert.equal(caps.canInviteMembers, true);
      assert.equal(caps.canChangeMemberRoles, true);
      assert.equal(caps.canRemoveMembers, true);
      assert.equal(caps.accessMode, "owner");
    }
  });

  it("allows content edit without member administration for member only", () => {
    const caps = resolveWorkspaceProjectCapabilities("member");
    assert.equal(caps.canEditContent, true);
    assert.equal(caps.canEditProjectMetadata, false);
    assert.equal(caps.canInviteMembers, false);
    assert.equal(caps.canChangeMemberRoles, false);
    assert.equal(caps.canRemoveMembers, false);
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
