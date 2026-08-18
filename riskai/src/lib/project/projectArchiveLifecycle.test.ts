import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeProjectArchive,
  parseProjectPatchBody,
  postArchiveNavigatePath,
  PROJECT_HARD_DELETE_DISABLED,
  projectLifecycleArchivedAtUpdate,
  projectLifecycleRevalidatePaths,
  resolveAuthoritativeProjectWorkspaceId,
} from "./projectArchiveLifecycle";

const NOW = "2026-08-17T11:00:00.000Z";

describe("parseProjectPatchBody", () => {
  it("parses archive true and ignores name in the same body", () => {
    const result = parseProjectPatchBody({ archived: true, name: "Should not apply" });
    assert.deepEqual(result, { ok: true, kind: "lifecycle", archived: true });
  });

  it("parses restore false", () => {
    const result = parseProjectPatchBody({ archived: false });
    assert.deepEqual(result, { ok: true, kind: "lifecycle", archived: false });
  });

  it("rejects a non-boolean archived value", () => {
    const result = parseProjectPatchBody({ archived: "true" });
    assert.deepEqual(result, { ok: false, error: "archived must be true or false" });
  });

  it("still parses a name-only metadata patch", () => {
    const result = parseProjectPatchBody({ name: "  Bridge  " });
    assert.deepEqual(result, { ok: true, kind: "name", name: "Bridge" });
  });
});

describe("authorizeProjectArchive", () => {
  it("allows Workspace Owner to archive", () => {
    assert.equal(authorizeProjectArchive({ workspaceRole: "owner" }), true);
  });

  it("allows Workspace Admin to archive", () => {
    assert.equal(authorizeProjectArchive({ workspaceRole: "admin" }), true);
  });

  it("denies Workspace Member", () => {
    assert.equal(authorizeProjectArchive({ workspaceRole: "member" }), false);
  });

  it("denies Workspace Viewer", () => {
    assert.equal(authorizeProjectArchive({ workspaceRole: "viewer" }), false);
  });

  it("denies a direct Project Editor even if they are a Portfolio owner", () => {
    assert.equal(
      authorizeProjectArchive({
        workspaceRole: "member",
        isDirectProjectEditor: true,
        isPortfolioOwner: true,
        isPortfolioAdmin: true,
      }),
      false,
    );
  });

  it("denies a direct Project Owner without Workspace Owner/Admin", () => {
    assert.equal(
      authorizeProjectArchive({
        workspaceRole: "member",
        isDirectProjectOwner: true,
      }),
      false,
    );
  });

  it("denies Portfolio owner/admin without Workspace Owner/Admin", () => {
    assert.equal(
      authorizeProjectArchive({
        workspaceRole: "viewer",
        isPortfolioOwner: true,
        isPortfolioAdmin: true,
      }),
      false,
    );
  });

  it("allows Workspace Owner when portfolio_id is null", () => {
    assert.equal(authorizeProjectArchive({ workspaceRole: "owner" }), true);
  });

  it("allows Workspace Admin on a legacy portfolio-linked Project", () => {
    assert.equal(
      authorizeProjectArchive({
        workspaceRole: "admin",
        isPortfolioOwner: false,
      }),
      true,
    );
  });
});

describe("projectLifecycleArchivedAtUpdate", () => {
  it("sets archived_at on archive and writes no other fields", () => {
    const update = projectLifecycleArchivedAtUpdate(true, NOW);
    assert.deepEqual(update, { archived_at: NOW });
    assert.deepEqual(Object.keys(update), ["archived_at"]);
  });

  it("clears archived_at on restore so the Project matches active lists", () => {
    const update = projectLifecycleArchivedAtUpdate(false, NOW);
    assert.deepEqual(Object.keys(update), ["archived_at"]);
    const restored = { id: "project-1", name: "Keep me", ...update };
    assert.equal(restored.archived_at, null);
    assert.equal(restored.id, "project-1");
    assert.equal(restored.name, "Keep me");
  });
});

describe("PROJECT_HARD_DELETE_DISABLED", () => {
  it("disables DELETE without performing physical Project deletion", () => {
    assert.equal(PROJECT_HARD_DELETE_DISABLED.status, 405);
    assert.equal(PROJECT_HARD_DELETE_DISABLED.body.code, "PROJECT_ARCHIVE_REQUIRED");
    assert.match(PROJECT_HARD_DELETE_DISABLED.body.error, /archive/i);
  });
});

describe("resolveAuthoritativeProjectWorkspaceId", () => {
  it("uses visualify_projects.workspace_id when present", () => {
    assert.equal(
      resolveAuthoritativeProjectWorkspaceId({
        projectWorkspaceId: "ws-1",
      }),
      "ws-1",
    );
  });

  it("does not fall back to a linked Portfolio workspace", () => {
    assert.equal(
      resolveAuthoritativeProjectWorkspaceId({
        projectWorkspaceId: null,
      }),
      null,
    );
  });
});

describe("postArchiveNavigatePath", () => {
  it("routes to Workspace Projects, never a Portfolio page", () => {
    const path = postArchiveNavigatePath("ws-green");
    assert.equal(path, "/workspaces/ws-green/projects");
    assert.equal(path.includes("portfolio"), false);
  });
});

describe("projectLifecycleRevalidatePaths", () => {
  it("revalidates Workspace overview and project-list routes, never Portfolio routes", () => {
    const paths = projectLifecycleRevalidatePaths({
      projectId: "project-1",
      workspaceId: "ws-green",
    });
    assert.equal(paths.includes("/workspaces/ws-green"), true);
    assert.equal(paths.includes("/workspaces/ws-green/projects"), true);
    assert.equal(paths.some((path) => path.includes("/portfolios/")), false);
  });
});
