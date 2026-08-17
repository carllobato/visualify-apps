import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPostgresUniqueViolation, slugifyWorkspaceName } from "./workspaceSlug";

describe("slugifyWorkspaceName", () => {
  it("derives a kebab-case slug from the Workspace name", () => {
    assert.equal(slugifyWorkspaceName("  North Wind Pty  "), "north-wind-pty");
  });

  it("falls back to workspace when the name has no slug characters", () => {
    assert.equal(slugifyWorkspaceName("***"), "workspace");
  });
});

describe("isPostgresUniqueViolation", () => {
  it("detects Postgres unique-violation error codes", () => {
    assert.equal(isPostgresUniqueViolation({ code: "23505" }), true);
    assert.equal(isPostgresUniqueViolation({ code: "23503" }), false);
    assert.equal(isPostgresUniqueViolation(null), false);
  });
});
