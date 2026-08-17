import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkspaceRole } from "@visualify/workspace-product-access";
import {
  canEditWorkspaceSettings,
  parseWorkspaceSettingsPatchBody,
  workspaceSettingsPatchBody,
  workspaceSettingsPatchPath,
} from "./workspaceSettingsUpdate";

describe("canEditWorkspaceSettings", () => {
  it("allows owner to edit", () => {
    assert.equal(canEditWorkspaceSettings("owner"), true);
  });

  it("allows admin to edit", () => {
    assert.equal(canEditWorkspaceSettings("admin"), true);
  });

  it("does not allow member to edit", () => {
    assert.equal(canEditWorkspaceSettings("member"), false);
  });

  it("does not allow viewer to edit", () => {
    assert.equal(canEditWorkspaceSettings("viewer"), false);
  });

  it("does not allow a missing role to edit", () => {
    assert.equal(canEditWorkspaceSettings(null), false);
  });

  it("covers every Workspace role explicitly", () => {
    const expected: Record<WorkspaceRole, boolean> = {
      owner: true,
      admin: true,
      member: false,
      viewer: false,
    };
    for (const role of Object.keys(expected) as WorkspaceRole[]) {
      assert.equal(canEditWorkspaceSettings(role), expected[role]);
    }
  });
});

describe("parseWorkspaceSettingsPatchBody", () => {
  it("accepts a valid Workspace name", () => {
    const result = parseWorkspaceSettingsPatchBody({ name: "  GreenSquare  " });
    assert.deepEqual(result, { ok: true, updates: { name: "GreenSquare" } });
  });

  it("rejects an empty Workspace name", () => {
    const result = parseWorkspaceSettingsPatchBody({ name: "   " });
    assert.deepEqual(result, { ok: false, error: "Workspace name is required" });
  });

  it("rejects a non-string name", () => {
    const result = parseWorkspaceSettingsPatchBody({ name: 12 });
    assert.deepEqual(result, { ok: false, error: "Invalid name" });
  });

  it("accepts THOUSANDS", () => {
    const result = parseWorkspaceSettingsPatchBody({ reporting_unit: "THOUSANDS" });
    assert.deepEqual(result, { ok: true, updates: { reporting_unit: "THOUSANDS" } });
  });

  it("accepts MILLIONS", () => {
    const result = parseWorkspaceSettingsPatchBody({ reporting_unit: "MILLIONS" });
    assert.deepEqual(result, { ok: true, updates: { reporting_unit: "MILLIONS" } });
  });

  it("accepts BILLIONS", () => {
    const result = parseWorkspaceSettingsPatchBody({ reporting_unit: "BILLIONS" });
    assert.deepEqual(result, { ok: true, updates: { reporting_unit: "BILLIONS" } });
  });

  it("rejects an invalid reporting unit", () => {
    const result = parseWorkspaceSettingsPatchBody({ reporting_unit: "ONES" });
    assert.deepEqual(result, { ok: false, error: "Invalid reporting_unit" });
  });

  it("does not write arbitrary Workspace fields", () => {
    const result = parseWorkspaceSettingsPatchBody({
      name: "GreenSquare",
      reporting_unit: "MILLIONS",
      slug: "hacked",
      website_url: "https://example.com",
      logo_url: "https://example.com/logo.png",
      workspace_type: "organisation",
      status: "cancelled",
      owner_user_id: "someone-else",
    });
    assert.deepEqual(result, {
      ok: true,
      updates: { name: "GreenSquare", reporting_unit: "MILLIONS" },
    });
  });

  it("requires at least one allowed field", () => {
    const result = parseWorkspaceSettingsPatchBody({ slug: "ignored" });
    assert.deepEqual(result, {
      ok: false,
      error: "Provide at least one of name or reporting_unit",
    });
  });
});

describe("workspaceSettingsPatchBody", () => {
  it("omits reporting_unit when only the name changed", () => {
    assert.deepEqual(
      workspaceSettingsPatchBody({
        name: "  GreenSquare HQ  ",
        initialName: "GreenSquare",
        reportingUnit: "MILLIONS",
        initialReportingUnit: "MILLIONS",
      }),
      { name: "GreenSquare HQ" },
    );
  });

  it("omits name when only the reporting unit changed", () => {
    assert.deepEqual(
      workspaceSettingsPatchBody({
        name: "GreenSquare",
        initialName: "GreenSquare",
        reportingUnit: "THOUSANDS",
        initialReportingUnit: "BILLIONS",
      }),
      { reporting_unit: "THOUSANDS" },
    );
  });

  it("includes both fields when both changed", () => {
    assert.deepEqual(
      workspaceSettingsPatchBody({
        name: "GreenSquare HQ",
        initialName: "GreenSquare",
        reportingUnit: "THOUSANDS",
        initialReportingUnit: "MILLIONS",
      }),
      { name: "GreenSquare HQ", reporting_unit: "THOUSANDS" },
    );
  });
});

describe("workspaceSettingsPatchPath", () => {
  it("targets the Workspace update route and not a Portfolio route", () => {
    assert.equal(workspaceSettingsPatchPath("ws-1"), "/api/workspaces/ws-1");
    assert.equal(workspaceSettingsPatchPath("ws-1").includes("/api/portfolios/"), false);
  });
});
