import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROJECT_SETTINGS_METADATA_VIEW_ONLY_NOTICE,
  getWorkspaceSettingsPermissionNotice,
} from "./settingsPermissionMessages";

describe("getWorkspaceSettingsPermissionNotice", () => {
  it("hides the banner when the viewer may edit reporting unit", () => {
    assert.equal(getWorkspaceSettingsPermissionNotice(true), null);
  });

  it("shows read-only access for members and viewers", () => {
    assert.equal(
      getWorkspaceSettingsPermissionNotice(false),
      PROJECT_SETTINGS_METADATA_VIEW_ONLY_NOTICE
    );
  });
});
