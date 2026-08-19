import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { parseProjectContextFromVisualifyProjectSettingsRow } from "@/lib/projectContext";

const PROJECT_INFORMATION = fileURLToPath(
  new URL("../../../app/(protected)/project/ProjectInformationPage.tsx", import.meta.url),
);

const ONBOARDING_PERSISTED_SETTINGS = {
  project_name: "Onboarding Example",
  location: null,
  currency: "AUD",
  financial_unit: "MILLIONS",
  financial_inputs_version: 2,
  project_value_input: 187_000_000,
  contingency_value_input: 10_000_000,
  planned_duration_months: 24,
  target_completion_date: "2027-06-30",
  working_days_per_week: 5,
  schedule_contingency_weeks: 0,
  schedule_contingency_working_days: 0,
  schedule_inputs_version: 2,
  risk_appetite: "P80",
} as const;

describe("onboarding settings financial_inputs_version write", () => {
  it("hydrates an onboarding write of 187000000 / 10000000 MILLIONS as $187m / $10m, not trillions", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(ONBOARDING_PERSISTED_SETTINGS);

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 187_000_000);
    assert.equal(ctx.contingencyValue_input, 10_000_000);
    assert.equal(ctx.projectValue_m, 187);
    assert.equal(ctx.contingencyValue_m, 10);
    assert.equal(ctx.projectValue_input === 187_000_000 * 1e6, false);
    assert.equal(ctx.contingencyValue_input === 10_000_000 * 1e6, false);
  });

  it("keeps existing v1 reader behaviour, including omitted version defaulting to v1", () => {
    const explicitV1 = parseProjectContextFromVisualifyProjectSettingsRow({
      project_value_input: 300,
      contingency_value_input: 20,
      financial_unit: "MILLIONS",
      financial_inputs_version: 1,
    });
    const omittedVersion = parseProjectContextFromVisualifyProjectSettingsRow({
      project_value_input: 300,
      contingency_value_input: 20,
      financial_unit: "MILLIONS",
    });
    const misreadAsV1 = parseProjectContextFromVisualifyProjectSettingsRow({
      ...ONBOARDING_PERSISTED_SETTINGS,
      financial_inputs_version: 1,
    });

    assert.ok(explicitV1);
    assert.equal(explicitV1.projectValue_input, 300_000_000);
    assert.equal(explicitV1.contingencyValue_input, 20_000_000);
    assert.equal(explicitV1.projectValue_m, 300);
    assert.ok(omittedVersion);
    assert.equal(omittedVersion.projectValue_input, 300_000_000);
    assert.equal(omittedVersion.contingencyValue_input, 20_000_000);
    assert.ok(misreadAsV1);
    assert.equal(misreadAsV1.projectValue_input, 187_000_000 * 1e6);
    assert.equal(misreadAsV1.contingencyValue_input, 10_000_000 * 1e6);
  });

  it("does not write Project Information financials to visualify_project_settings", () => {
    const projectInformation = readFileSync(PROJECT_INFORMATION, "utf8");

    assert.equal(projectInformation.includes("visualify_project_settings"), true);
    assert.match(projectInformation, /Does not read or write `visualify_project_settings`/);
    assert.equal(projectInformation.includes(".upsert("), false);
    assert.equal(projectInformation.includes('from("visualify_project_settings")'), false);
    assert.match(projectInformation, /canonicalPatchFromProjectContext/);
    assert.match(projectInformation, /method: "PATCH"/);
  });
});
