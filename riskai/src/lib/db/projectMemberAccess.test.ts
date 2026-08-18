import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeProjectMemberMutation,
  resolveProjectMemberCapabilityFlags,
} from "./projectMemberAccess";

describe("resolveProjectMemberCapabilityFlags", () => {
  it("denies invite, role change, and remove when canManageProjectMembers is false", () => {
    assert.deepEqual(resolveProjectMemberCapabilityFlags(false), {
      canInviteMembers: false,
      canChangeMemberRoles: false,
      canRemoveMembers: false,
    });
  });

  it("grants invite, role change, and remove only when canManageProjectMembers is true", () => {
    assert.deepEqual(resolveProjectMemberCapabilityFlags(true), {
      canInviteMembers: true,
      canChangeMemberRoles: true,
      canRemoveMembers: true,
    });
  });
});

describe("authorizeProjectMemberMutation", () => {
  const workspaceId = "ws-1";

  it("allows Workspace Owner", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "owner",
      }),
      true,
    );
  });

  it("allows Workspace Admin", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "admin",
      }),
      true,
    );
  });

  it("denies Workspace Member", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "member",
      }),
      false,
    );
  });

  it("denies Workspace Viewer", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "viewer",
      }),
      false,
    );
  });

  it("denies a direct Project Owner without Workspace Owner/Admin", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "member",
        isTableOwner: true,
        isDirectProjectOwner: true,
      }),
      false,
    );
  });

  it("denies a direct Project Editor without Workspace Owner/Admin", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "member",
        isDirectProjectEditor: true,
      }),
      false,
    );
  });

  it("denies a direct Project Viewer", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "member",
      }),
      false,
    );
  });

  it("does not authorise from owner_user_id or client-claimed Project role", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "member",
        isTableOwner: true,
        clientClaimedRole: "owner",
      }),
      false,
    );
  });

  it("denies mutation when Project workspace_id is missing", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: null,
        workspaceRole: "owner",
      }),
      false,
    );
  });

  it("does not leak invite authority to Project Owner/Editor", () => {
    const ownerInvite = resolveProjectMemberCapabilityFlags(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "member",
        isDirectProjectOwner: true,
      }),
    );
    const editorInvite = resolveProjectMemberCapabilityFlags(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "member",
        isDirectProjectEditor: true,
      }),
    );
    assert.equal(ownerInvite.canInviteMembers, false);
    assert.equal(editorInvite.canInviteMembers, false);
  });
});
