import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeProjectMemberMutation,
  canViewProjectMembers,
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

describe("canViewProjectMembers", () => {
  const workspaceId = "ws-1";

  it("allows Workspace Viewer inherited read without mutation", () => {
    assert.equal(
      canViewProjectMembers({
        isTableOwner: false,
        hasDirectProjectMemberRow: false,
        workspaceRole: "viewer",
      }),
      true,
    );
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: workspaceId,
        workspaceRole: "viewer",
      }),
      false,
    );
  });

  it("allows Workspace Owner and Admin inherited read", () => {
    assert.equal(
      canViewProjectMembers({
        isTableOwner: false,
        hasDirectProjectMemberRow: false,
        workspaceRole: "owner",
      }),
      true,
    );
    assert.equal(
      canViewProjectMembers({
        isTableOwner: false,
        hasDirectProjectMemberRow: false,
        workspaceRole: "admin",
      }),
      true,
    );
  });

  it("denies Workspace Member without a direct Project membership", () => {
    assert.equal(
      canViewProjectMembers({
        isTableOwner: false,
        hasDirectProjectMemberRow: false,
        workspaceRole: "member",
      }),
      false,
    );
  });

  it("allows direct Project Owner, Editor, and Viewer", () => {
    assert.equal(
      canViewProjectMembers({
        isTableOwner: false,
        hasDirectProjectMemberRow: true,
        workspaceRole: "member",
      }),
      true,
    );
    assert.equal(
      canViewProjectMembers({
        isTableOwner: true,
        hasDirectProjectMemberRow: false,
        workspaceRole: null,
      }),
      true,
    );
  });

  it("does not grant mutation flags to a viewing Workspace Viewer", () => {
    const canManage = authorizeProjectMemberMutation({
      projectWorkspaceId: workspaceId,
      workspaceRole: "viewer",
    });
    assert.equal(
      canViewProjectMembers({
        isTableOwner: false,
        hasDirectProjectMemberRow: false,
        workspaceRole: "viewer",
      }),
      true,
    );
    assert.deepEqual(resolveProjectMemberCapabilityFlags(canManage), {
      canInviteMembers: false,
      canChangeMemberRoles: false,
      canRemoveMembers: false,
    });
  });
});
