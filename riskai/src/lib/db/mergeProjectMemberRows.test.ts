import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inheritedProjectRoleForWorkspaceRole,
  mergeDirectAndInheritedProjectMemberRows,
  workspaceRoleInheritsOntoEveryProject,
} from "./mergeProjectMemberRows";
import type { ProjectMemberRole } from "@/types/projectMembers";

const PROJECT_ID = "project-syd1";
const WORKSPACE_ID = "workspace-gs";

function directRow(args: {
  userId: string;
  role: ProjectMemberRole;
  id?: string;
}): Record<string, unknown> {
  return {
    id: args.id ?? `pm-${args.userId}`,
    project_id: PROJECT_ID,
    user_id: args.userId,
    role: args.role,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function workspaceRow(args: {
  userId: string;
  role: string;
  status?: string;
}): {
  user_id: string;
  role: string;
  status: string;
  created_at: string;
} {
  return {
    user_id: args.userId,
    role: args.role,
    status: args.status ?? "active",
    created_at: "2026-01-02T00:00:00.000Z",
  };
}

function merge(args: {
  direct: Record<string, unknown>[];
  workspace: ReturnType<typeof workspaceRow>[];
}) {
  return mergeDirectAndInheritedProjectMemberRows({
    projectId: PROJECT_ID,
    workspaceId: WORKSPACE_ID,
    directRawRows: args.direct,
    workspaceRows: args.workspace,
  });
}

describe("workspaceRoleInheritsOntoEveryProject", () => {
  it("inherits owner, admin, and viewer", () => {
    assert.equal(workspaceRoleInheritsOntoEveryProject("owner"), true);
    assert.equal(workspaceRoleInheritsOntoEveryProject("admin"), true);
    assert.equal(workspaceRoleInheritsOntoEveryProject("viewer"), true);
  });

  it("does not inherit workspace member", () => {
    assert.equal(workspaceRoleInheritsOntoEveryProject("member"), false);
  });
});

describe("inheritedProjectRoleForWorkspaceRole", () => {
  it("maps inheriting workspace roles onto valid project roles", () => {
    assert.equal(inheritedProjectRoleForWorkspaceRole("owner"), "owner");
    assert.equal(inheritedProjectRoleForWorkspaceRole("admin"), "owner");
    assert.equal(inheritedProjectRoleForWorkspaceRole("viewer"), "viewer");
  });
});

describe("mergeDirectAndInheritedProjectMemberRows", () => {
  it("includes workspace owner as inherited project access", () => {
    const rows = merge({
      direct: [],
      workspace: [workspaceRow({ userId: "owner-1", role: "owner" })],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.user_id, "owner-1");
    assert.equal(rows[0]?.membershipSource, "workspace");
    assert.equal(rows[0]?.workspaceRole, "owner");
    assert.equal(rows[0]?.role, "owner");
    assert.equal(rows[0]?.roleLabel, "Workspace owner");
    assert.equal(rows[0]?.isProjectMemberEditable, false);
    assert.equal(rows[0]?.id, `workspace:${WORKSPACE_ID}:owner-1`);
  });

  it("includes workspace admin as inherited project access", () => {
    const rows = merge({
      direct: [],
      workspace: [workspaceRow({ userId: "admin-1", role: "admin" })],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.user_id, "admin-1");
    assert.equal(rows[0]?.membershipSource, "workspace");
    assert.equal(rows[0]?.workspaceRole, "admin");
    assert.equal(rows[0]?.role, "owner");
    assert.equal(rows[0]?.roleLabel, "Workspace admin");
    assert.equal(rows[0]?.isProjectMemberEditable, false);
  });

  it("includes workspace viewer as inherited project access", () => {
    const rows = merge({
      direct: [],
      workspace: [workspaceRow({ userId: "viewer-1", role: "viewer" })],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.user_id, "viewer-1");
    assert.equal(rows[0]?.membershipSource, "workspace");
    assert.equal(rows[0]?.workspaceRole, "viewer");
    assert.equal(rows[0]?.role, "viewer");
    assert.equal(rows[0]?.roleLabel, "Workspace viewer");
    assert.equal(rows[0]?.isProjectMemberEditable, false);
  });

  it("does not include an unassigned workspace member", () => {
    const rows = merge({
      direct: [],
      workspace: [workspaceRow({ userId: "member-unassigned", role: "member" })],
    });

    assert.equal(rows.length, 0);
  });

  it("includes a workspace member with a direct editor assignment", () => {
    const rows = merge({
      direct: [directRow({ userId: "member-editor", role: "editor" })],
      workspace: [workspaceRow({ userId: "member-editor", role: "member" })],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.user_id, "member-editor");
    assert.equal(rows[0]?.membershipSource, "direct");
    assert.equal(rows[0]?.role, "editor");
    assert.equal(rows[0]?.isProjectMemberEditable, true);
    assert.equal(rows[0]?.id, "pm-member-editor");
  });

  it("includes a project-specific viewer from direct membership", () => {
    const rows = merge({
      direct: [directRow({ userId: "project-viewer", role: "viewer" })],
      workspace: [workspaceRow({ userId: "project-viewer", role: "member" })],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.user_id, "project-viewer");
    assert.equal(rows[0]?.membershipSource, "direct");
    assert.equal(rows[0]?.role, "viewer");
    assert.equal(rows[0]?.isProjectMemberEditable, true);
  });

  it("lets direct project membership take precedence over inherited workspace access", () => {
    const rows = merge({
      direct: [directRow({ userId: "owner-also-editor", role: "editor" })],
      workspace: [workspaceRow({ userId: "owner-also-editor", role: "owner" })],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.membershipSource, "direct");
    assert.equal(rows[0]?.role, "editor");
    assert.equal(rows[0]?.workspaceRole, undefined);
    assert.equal(rows[0]?.roleLabel, undefined);
    assert.equal(rows[0]?.isProjectMemberEditable, true);
  });

  it("merges inheriting workspace roles with direct assignments in one list", () => {
    const rows = merge({
      direct: [
        directRow({ userId: "assigned-member", role: "editor" }),
        directRow({ userId: "assigned-viewer", role: "viewer" }),
      ],
      workspace: [
        workspaceRow({ userId: "owner-1", role: "owner" }),
        workspaceRow({ userId: "admin-1", role: "admin" }),
        workspaceRow({ userId: "viewer-ws", role: "viewer" }),
        workspaceRow({ userId: "unassigned-member", role: "member" }),
        workspaceRow({ userId: "assigned-member", role: "member" }),
        workspaceRow({ userId: "assigned-viewer", role: "member" }),
      ],
    });

    const byUserId = new Map(rows.map((row) => [row.user_id, row]));
    assert.equal(rows.length, 5);
    assert.equal(byUserId.has("unassigned-member"), false);
    assert.equal(byUserId.get("owner-1")?.membershipSource, "workspace");
    assert.equal(byUserId.get("admin-1")?.membershipSource, "workspace");
    assert.equal(byUserId.get("viewer-ws")?.membershipSource, "workspace");
    assert.equal(byUserId.get("assigned-member")?.membershipSource, "direct");
    assert.equal(byUserId.get("assigned-member")?.role, "editor");
    assert.equal(byUserId.get("assigned-viewer")?.membershipSource, "direct");
    assert.equal(byUserId.get("assigned-viewer")?.role, "viewer");
  });
});
