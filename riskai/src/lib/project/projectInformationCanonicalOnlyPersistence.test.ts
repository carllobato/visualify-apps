import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveProjectPermissions } from "@/lib/db/projectPermissions.logic";
import { canonicalPatchFromProjectContext } from "./visualifyProjectsCanonicalWrite";
import { parseProjectPatchBody } from "./projectArchiveLifecycle";
import { hydrateProjectInformationFromCanonicalRow } from "./canonicalProjectCompleteness";
import type { ProjectContext } from "@/lib/projectContext";

const PROJECT_INFORMATION = fileURLToPath(
  new URL("../../../app/(protected)/project/ProjectInformationPage.tsx", import.meta.url),
);
const ONBOARDING_MODAL = fileURLToPath(
  new URL("../../components/onboarding/ProjectOnboardingCreateModal.tsx", import.meta.url),
);
const PROJECT_PATCH_ROUTE = fileURLToPath(
  new URL("../../../app/api/projects/[projectId]/route.ts", import.meta.url),
);
const RISK_REGISTER = fileURLToPath(
  new URL("../../../app/(protected)/risk-register/RiskRegisterContent.tsx", import.meta.url),
);
const SIMULATION = fileURLToPath(
  new URL("../../../app/(protected)/simulation/SimulationPageContent.tsx", import.meta.url),
);
const PROJECT_OVERVIEW = fileURLToPath(
  new URL("../../../app/(protected)/projects/[projectId]/ProjectOverviewContent.tsx", import.meta.url),
);
const WORKSPACE_OVERVIEW = fileURLToPath(
  new URL("../../../app/(protected)/workspaces/[workspaceId]/loadWorkspaceOverviewData.ts", import.meta.url),
);
const TILE_SERVER = fileURLToPath(
  new URL("../dashboard/projectTileServerData.ts", import.meta.url),
);
const CREATE_PROJECT = fileURLToPath(
  new URL("../../../app/(protected)/create-project/page.tsx", import.meta.url),
);

function sampleContext(): ProjectContext {
  return {
    projectName: "Northgate Rail Upgrade",
    projectCode: "NGU-01",
    location: "Sydney, NSW",
    projectIndustry: "Infrastructure",
    projectStage: "Construction",
    plannedDuration_months: 24,
    targetCompletionDate: "2027-06-30",
    scheduleContingency_weeks: 4,
    workingDaysPerWeek: 5,
    scheduleContingency_workingDays: 20,
    scheduleInputsVersion: 2,
    riskAppetite: "P80",
    currency: "AUD",
    financialUnit: "MILLIONS",
    financialInputsVersion: 2,
    projectValue_input: 350000000,
    contingencyValue_input: 30000000,
    projectValue_m: 350,
    contingencyValue_m: 30,
    approvedBudget_m: 380,
    delay_cost_per_day: 50000,
    delay_cost_per_working_day: 50000,
  };
}

describe("Project Information canonical-only persistence", () => {
  it("saves through authorised canonical PATCH only and does not upsert settings", () => {
    const page = readFileSync(PROJECT_INFORMATION, "utf8");

    assert.match(page, /canonicalPatchFromProjectContext/);
    assert.match(page, /`\/api\/projects\/\$\{projectId\}`/);
    assert.match(page, /method: "PATCH"/);
    assert.equal(page.includes('from("visualify_project_settings")'), false);
    assert.equal(page.includes(".upsert("), false);
    assert.match(page, /hydrateProjectInformationFromCanonicalRow/);
    assert.match(page, /CANONICAL_PROJECT_COMPLETENESS_SELECT/);
    assert.equal((page.match(/loadProjectContext\(/g) ?? []).length, 1);
    assert.match(page, /loadProjectContext\(trimmedProjectId \|\| undefined\)/);

    const saveIdx = page.indexOf("const onSave = useCallback(async () => {");
    const patchIdx = page.indexOf("`/api/projects/${projectId}`", saveIdx);
    const successIdx = page.indexOf("setSaved(true)", saveIdx);
    assert.ok(saveIdx >= 0 && patchIdx > saveIdx && successIdx > patchIdx);
    assert.match(page, /if \(!res\.ok\)/);
  });

  it("does not let conflicting or missing settings change hydration", () => {
    const conflicting = hydrateProjectInformationFromCanonicalRow({
      project_name: "Canonical Name",
      project_location: "Sydney, NSW",
      project_industry: "Infrastructure",
      project_stage: "Construction",
      project_currency: "AUD",
      project_value: 350000000,
      project_contingency: 0,
      project_delay_cost_per_working_day: 50000,
      project_planned_duration_months: 24,
      project_target_completion_date: "2027-06-30",
      project_working_days_per_week: 5,
      project_schedule_contingency_working_days: 20,
      project_risk_appetite: "P80",
      project_value_input: 300,
      location: "Legacy Location",
      currency: "USD",
    });
    const withoutSettingsKeys = hydrateProjectInformationFromCanonicalRow({
      project_name: "Canonical Name",
      project_location: "Sydney, NSW",
      project_industry: "Infrastructure",
      project_stage: "Construction",
      project_currency: "AUD",
      project_value: 350000000,
      project_contingency: 0,
      project_delay_cost_per_working_day: 50000,
      project_planned_duration_months: 24,
      project_target_completion_date: "2027-06-30",
      project_working_days_per_week: 5,
      project_schedule_contingency_working_days: 20,
      project_risk_appetite: "P80",
    });

    assert.equal(conflicting.form.projectName, "Canonical Name");
    assert.equal(conflicting.form.projectValue_input, 350000000);
    assert.equal(conflicting.form.location, "Sydney, NSW");
    assert.equal(conflicting.form.currency, "AUD");
    assert.deepEqual(conflicting.form, withoutSettingsKeys.form);
    assert.deepEqual(conflicting.raw, withoutSettingsKeys.raw);
  });

  it("writes unscaled canonical financials and working-day schedule through the metadata parser", () => {
    const patch = canonicalPatchFromProjectContext(sampleContext());
    const parsed = parseProjectPatchBody({
      name: sampleContext().projectName,
      ...patch,
    });

    assert.equal(parsed.ok, true);
    if (!parsed.ok || parsed.kind !== "name") return;
    assert.equal(parsed.name, parsed.canonical.project_name);
    assert.equal(parsed.canonical.project_value, 350000000);
    assert.equal(parsed.canonical.project_schedule_contingency_working_days, 20);
    assert.equal("project_schedule_contingency_weeks" in parsed.canonical, false);
  });
});

describe("normal live workflows do not write visualify_project_settings", () => {
  it("does not upsert legacy visualify_project_settings from normal live workflows", () => {
    const liveSources = [
      readFileSync(PROJECT_INFORMATION, "utf8"),
      readFileSync(ONBOARDING_MODAL, "utf8"),
      readFileSync(CREATE_PROJECT, "utf8"),
      readFileSync(RISK_REGISTER, "utf8"),
      readFileSync(SIMULATION, "utf8"),
      readFileSync(PROJECT_OVERVIEW, "utf8"),
      readFileSync(WORKSPACE_OVERVIEW, "utf8"),
      readFileSync(TILE_SERVER, "utf8"),
      readFileSync(PROJECT_PATCH_ROUTE, "utf8"),
    ];

    for (const source of liveSources) {
      assert.equal(source.includes('from("visualify_project_settings")'), false);
    }
  });

  it("keeps operational readers and Workspace Overview off the settings table", () => {
    assert.equal(readFileSync(RISK_REGISTER, "utf8").includes("visualify_project_settings"), false);
    assert.equal(readFileSync(SIMULATION, "utf8").includes("visualify_project_settings"), false);
    assert.equal(readFileSync(PROJECT_OVERVIEW, "utf8").includes("visualify_project_settings"), false);
    assert.equal(readFileSync(WORKSPACE_OVERVIEW, "utf8").includes("visualify_project_settings"), false);
    assert.equal(readFileSync(TILE_SERVER, "utf8").includes("visualify_project_settings"), false);
  });

  it("does not grant Project Editor metadata authority", () => {
    const editor = resolveProjectPermissions({
      tableOwnerUserId: "owner",
      currentUserId: "editor",
      memberRole: "editor",
    });
    assert.ok(editor);
    assert.equal(editor.canEditProjectMetadata, false);
    assert.equal(editor.canEditContent, true);

    const projectRoute = readFileSync(PROJECT_PATCH_ROUTE, "utf8");
    assert.match(projectRoute, /!bundle\.permissions\.canEditProjectMetadata/);
  });
});
