import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authorizeProjectMemberMutation } from "@/lib/db/projectMemberAccess";
import {
  resolveInheritedProjectReadPermissions,
  resolveProjectPermissions,
} from "@/lib/db/projectPermissions.logic";
import { buildProjectCreateInsert } from "@/lib/project/resolveWorkspaceNativeProjectCreateTarget";
import type { ProjectPermissions } from "@/types/projectPermissions";
import type { WorkspaceRole } from "@visualify/workspace-product-access";

const TABLE_OWNER = "creator-1";
const ASSIGNED_USER = "assigned-1";
const WORKSPACE_ID = "ws-1";

function overlayMemberAdmin(
  permissions: ProjectPermissions,
  workspaceRole: WorkspaceRole | null,
): ProjectPermissions {
  return {
    ...permissions,
    canManageProjectMembers: authorizeProjectMemberMutation({
      projectWorkspaceId: WORKSPACE_ID,
      workspaceRole,
    }),
  };
}

describe("Project member administration authority matrix", () => {
  it("1. Workspace Owner can manage Project members", () => {
    const inherited = overlayMemberAdmin(resolveInheritedProjectReadPermissions(), "owner");
    assert.equal(inherited.canManageProjectMembers, true);
  });

  it("2. Workspace Admin can manage Project members", () => {
    const inherited = overlayMemberAdmin(resolveInheritedProjectReadPermissions(), "admin");
    assert.equal(inherited.canManageProjectMembers, true);
  });

  it("3. Workspace Member cannot manage Project members", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: WORKSPACE_ID,
        workspaceRole: "member",
      }),
      false,
    );
  });

  it("4. Workspace Viewer cannot manage Project members", () => {
    const inherited = overlayMemberAdmin(resolveInheritedProjectReadPermissions(), "viewer");
    assert.equal(inherited.canManageProjectMembers, false);
    assert.equal(inherited.canEditContent, false);
  });

  it("5. Direct Project Owner cannot manage members", () => {
    const caps = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: ASSIGNED_USER,
      memberRole: "owner",
    });
    assert.ok(caps);
    const effective = overlayMemberAdmin(caps, "member");
    assert.equal(effective.canManageProjectMembers, false);
  });

  it("6. Direct Project Editor cannot manage members", () => {
    const caps = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: ASSIGNED_USER,
      memberRole: "editor",
    });
    assert.ok(caps);
    const effective = overlayMemberAdmin(caps, "member");
    assert.equal(effective.canManageProjectMembers, false);
  });

  it("7. Direct Project Viewer cannot manage members", () => {
    const caps = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: ASSIGNED_USER,
      memberRole: "viewer",
    });
    assert.ok(caps);
    const effective = overlayMemberAdmin(caps, "member");
    assert.equal(effective.canManageProjectMembers, false);
  });

  it("8. Direct Owner/Editor can still edit Project content", () => {
    const owner = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: ASSIGNED_USER,
      memberRole: "owner",
    });
    const editor = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: ASSIGNED_USER,
      memberRole: "editor",
    });
    assert.equal(owner?.canEditContent, true);
    assert.equal(editor?.canEditContent, true);
    assert.equal(overlayMemberAdmin(owner!, "member").canManageProjectMembers, false);
    assert.equal(overlayMemberAdmin(editor!, "member").canManageProjectMembers, false);
  });

  it("9. Direct Viewer remains read-only", () => {
    const viewer = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: ASSIGNED_USER,
      memberRole: "viewer",
    });
    assert.ok(viewer);
    assert.equal(viewer.canEditContent, false);
    assert.equal(viewer.canEditProjectMetadata, false);
    assert.equal(overlayMemberAdmin(viewer, "member").canManageProjectMembers, false);
  });

  it("10. Project creator membership still writes owner_user_id and keeps content write", () => {
    const insert = buildProjectCreateInsert({
      ownerUserId: TABLE_OWNER,
      name: "North corridor",
      workspaceId: WORKSPACE_ID,
    });
    assert.equal(insert.owner_user_id, TABLE_OWNER);
    assert.equal(insert.workspace_id, WORKSPACE_ID);

    const creator = resolveProjectPermissions({
      tableOwnerUserId: TABLE_OWNER,
      currentUserId: TABLE_OWNER,
      memberRole: "owner",
    });
    assert.ok(creator);
    assert.equal(creator.canEditContent, true);
    assert.equal(creator.canEditProjectMetadata, true);
    const asWorkspaceAdmin = overlayMemberAdmin(creator, "admin");
    assert.equal(asWorkspaceAdmin.canManageProjectMembers, true);
  });

  it("11. member mutation rejects Project Owner/Editor without Workspace Owner/Admin", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: WORKSPACE_ID,
        workspaceRole: "member",
        isDirectProjectOwner: true,
        isTableOwner: true,
      }),
      false,
    );
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: WORKSPACE_ID,
        workspaceRole: "member",
        isDirectProjectEditor: true,
      }),
      false,
    );
  });

  it("12. invite action does not leak administration to Project Owner/Editor", () => {
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: WORKSPACE_ID,
        workspaceRole: "member",
        isDirectProjectOwner: true,
      }),
      false,
    );
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: WORKSPACE_ID,
        workspaceRole: "member",
        isDirectProjectEditor: true,
      }),
      false,
    );
    assert.equal(
      authorizeProjectMemberMutation({
        projectWorkspaceId: WORKSPACE_ID,
        workspaceRole: "admin",
      }),
      true,
    );
  });
});
