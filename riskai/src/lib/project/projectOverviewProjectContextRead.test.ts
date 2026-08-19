import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { isProjectContextComplete, type ProjectContext } from "@/lib/projectContext";
import {
  PROJECT_OVERVIEW_CANONICAL_PROJECT_CONTEXT_SELECT,
  resolveProjectOverviewProjectContext,
  resolveProjectOverviewReportingPositionContext,
} from "./projectOverviewProjectContextRead";

const CONFLICTING_SETTINGS = {
  project_name: "Legacy Settings Name",
  project_value_input: 300,
  contingency_value_input: 20,
  delay_cost_per_working_day: 10,
  financial_unit: "MILLIONS",
  financial_inputs_version: 1,
  planned_duration_months: 18,
  target_completion_date: "2026-12-31",
  working_days_per_week: 5,
  schedule_contingency_weeks: 4,
  schedule_contingency_working_days: 10,
  schedule_inputs_version: 1,
  risk_appetite: "P50",
  currency: "USD",
} as const;

const COMPLETE_CANONICAL = {
  project_name: "Northgate Rail Upgrade",
  project_location: "Sydney, NSW",
  project_currency: "AUD",
  project_value: 350000000,
  project_contingency: 30000000,
  project_delay_cost_per_working_day: 50000,
  project_planned_duration_months: 24,
  project_target_completion_date: "2027-06-30",
  project_working_days_per_week: 5,
  project_schedule_contingency_working_days: 20,
  project_risk_appetite: "P80",
} as const;

function localStorageContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    projectName: "Local only",
    plannedDuration_months: 12,
    targetCompletionDate: "2027-01-01",
    scheduleContingency_weeks: 0,
    workingDaysPerWeek: 5,
    scheduleContingency_workingDays: 0,
    scheduleInputsVersion: 2,
    riskAppetite: "P80",
    currency: "AUD",
    financialUnit: "MILLIONS",
    financialInputsVersion: 2,
    projectValue_input: 1000000,
    contingencyValue_input: 0,
    projectValue_m: 1,
    contingencyValue_m: 0,
    approvedBudget_m: 1,
    delay_cost_per_day: null,
    delay_cost_per_working_day: null,
    ...overrides,
  };
}

describe("resolveProjectOverviewProjectContext", () => {
  it("selects only ProjectContext canonical columns, not code/industry/stage", () => {
    assert.equal(PROJECT_OVERVIEW_CANONICAL_PROJECT_CONTEXT_SELECT.includes("project_code"), false);
    assert.equal(PROJECT_OVERVIEW_CANONICAL_PROJECT_CONTEXT_SELECT.includes("project_industry"), false);
    assert.equal(PROJECT_OVERVIEW_CANONICAL_PROJECT_CONTEXT_SELECT.includes("project_stage"), false);
    assert.equal(PROJECT_OVERVIEW_CANONICAL_PROJECT_CONTEXT_SELECT.includes("project_value"), true);
  });

  it("uses canonical Project data only for a complete Project", () => {
    const ctx = resolveProjectOverviewProjectContext({
      settingsRow: null,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 350000000);
    assert.equal(isProjectContextComplete(ctx), true);
  });

  it("ignores conflicting settings and does not merge them into canonical values", () => {
    const canonicalOnly = resolveProjectOverviewProjectContext({
      settingsRow: null,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });
    const withConflict = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.deepEqual(withConflict, canonicalOnly);
    assert.equal(withConflict?.projectValue_input === 300000000, false);
    assert.equal(withConflict?.currency, "AUD");
    assert.equal(withConflict?.riskAppetite, "P80");
  });

  it("does not fall back to settings when a canonical field is null", () => {
    const ctx = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { project_value: null },
    });

    assert.equal(ctx, null);
    assert.equal(isProjectContextComplete(ctx), false);
  });

  it("keeps canonical numeric 0 instead of replacing it with legacy non-zero settings", () => {
    const ctx = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_value: 0, project_contingency: 0 },
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 0);
    assert.equal(ctx.contingencyValue_input, 0);
    assert.equal(isProjectContextComplete(ctx), false);
  });

  it("hydrates canonical contingency as an unscaled major-currency amount", () => {
    const ctx = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.ok(ctx);
    assert.equal(ctx.contingencyValue_input, 30000000);
    assert.equal(ctx.contingencyValue_m, 30);
    assert.equal(ctx.contingencyValue_input === 20000000, false);
  });

  it("hydrates canonical delay cost as an unscaled major-currency amount", () => {
    const ctx = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.ok(ctx);
    assert.equal(ctx.delay_cost_per_working_day, 50000);
    assert.equal(ctx.delay_cost_per_day, 50000);
    assert.equal(ctx.delay_cost_per_working_day === 10000000, false);
  });

  it("keeps canonical working days of 6.5 and 7", () => {
    const sixPointFive = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_working_days_per_week: 6.5 },
    });
    const seven = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_working_days_per_week: 7 },
    });

    assert.ok(sixPointFive);
    assert.equal(sixPointFive.workingDaysPerWeek, 6.5);
    assert.ok(seven);
    assert.equal(seven.workingDaysPerWeek, 7);
  });

  it("prefers canonical schedule contingency working days over settings weeks", () => {
    const ctx = resolveProjectOverviewProjectContext({
      settingsRow: {
        working_days_per_week: 5,
        schedule_contingency_weeks: 8,
        schedule_inputs_version: 1,
      },
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.ok(ctx);
    assert.equal(ctx.scheduleContingency_workingDays, 20);
    assert.equal(ctx.scheduleContingency_workingDays === 40, false);
  });

  it("keeps canonical P100 without clamping", () => {
    const ctx = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_risk_appetite: "P100" },
    });

    assert.ok(ctx);
    assert.equal(ctx.riskAppetite, "P100");
  });

  it("keeps additional canonical currencies without remapping them to AUD", () => {
    const eur = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_currency: "EUR" },
    });
    const sgd = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_currency: "SGD" },
    });

    assert.ok(eur);
    assert.equal(eur.currency, "EUR");
    assert.ok(sgd);
    assert.equal(sgd.currency, "SGD");
  });

  it("treats missing canonical as unset even when settings and localStorage exist", () => {
    const ctx = resolveProjectOverviewProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: {
        project_value: null,
        project_name: "",
        name: "MEL1",
      },
      localStorageContext: localStorageContext(),
    });

    assert.equal(ctx, null);
    assert.equal(isProjectContextComplete(ctx), false);
  });

  it("does not use localStorage when canonical configuration is missing", () => {
    const stored = localStorageContext({ projectValue_input: 0, projectName: "" });
    const ctx = resolveProjectOverviewProjectContext({
      settingsRow: null,
      canonicalProjectRow: { project_value: null, project_name: null },
      localStorageContext: stored,
    });

    assert.equal(ctx, null);
    assert.equal(isProjectContextComplete(ctx), false);
  });
});

describe("resolveProjectOverviewReportingPositionContext", () => {
  it("uses canonical Project data only for current RAG parameters", () => {
    const ctx = resolveProjectOverviewReportingPositionContext({
      settingsRow: null,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 350000000);
    assert.equal(ctx.contingencyValue_input, 30000000);
  });

  it("ignores conflicting settings and does not merge them into canonical values", () => {
    const canonicalOnly = resolveProjectOverviewReportingPositionContext({
      settingsRow: null,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });
    const withConflict = resolveProjectOverviewReportingPositionContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.deepEqual(withConflict, canonicalOnly);
    assert.equal(withConflict?.projectValue_input === 300000000, false);
  });

  it("keeps canonical numeric 0 instead of replacing it with legacy non-zero settings", () => {
    const ctx = resolveProjectOverviewReportingPositionContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_value: 0, project_contingency: 0 },
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 0);
    assert.equal(ctx.contingencyValue_input, 0);
  });

  it("does not fall back to settings when canonical values are null", () => {
    const ctx = resolveProjectOverviewReportingPositionContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { project_value: null },
    });

    assert.equal(ctx, null);
  });

  it("hydrates canonical financial values as unscaled major-currency amounts", () => {
    const ctx = resolveProjectOverviewReportingPositionContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.ok(ctx);
    assert.equal(ctx.contingencyValue_input, 30000000);
    assert.equal(ctx.contingencyValue_m, 30);
  });

  it("treats canonical schedule contingency as working days, not weeks", () => {
    const ctx = resolveProjectOverviewReportingPositionContext({
      settingsRow: {
        working_days_per_week: 5,
        schedule_contingency_weeks: 8,
        schedule_inputs_version: 1,
      },
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.ok(ctx);
    assert.equal(ctx.scheduleContingency_workingDays, 20);
    assert.equal(ctx.scheduleContingency_workingDays === 40, false);
  });

  it("keeps canonical working days of 6.5 and 7", () => {
    const sixPointFive = resolveProjectOverviewReportingPositionContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_working_days_per_week: 6.5 },
    });
    const seven = resolveProjectOverviewReportingPositionContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_working_days_per_week: 7 },
    });

    assert.ok(sixPointFive);
    assert.equal(sixPointFive.workingDaysPerWeek, 6.5);
    assert.ok(seven);
    assert.equal(seven.workingDaysPerWeek, 7);
  });

  it("keeps canonical P100 without clamping", () => {
    const ctx = resolveProjectOverviewReportingPositionContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_risk_appetite: "P100" },
    });

    assert.ok(ctx);
    assert.equal(ctx.riskAppetite, "P100");
  });

  it("does not use localStorage when canonical configuration is missing", () => {
    const stored = localStorageContext({ projectValue_input: 217000000, projectName: "Local" });
    const ctx = resolveProjectOverviewReportingPositionContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { project_value: null, project_name: null },
    });

    assert.equal(ctx, null);
    assert.equal(stored.projectValue_input, 217000000);
    assert.equal(isProjectContextComplete(ctx), false);
  });
});

describe("Project Overview RAG/reporting wiring", () => {
  it("keeps shared RAG helpers available for Workspace Overview settings fallback", () => {
    const ragSource = readFileSync(
      fileURLToPath(new URL("../dashboard/reportingPositionRag.ts", import.meta.url)),
      "utf8",
    );

    assert.match(ragSource, /parseProjectContextFromVisualifyProjectSettingsRow\(/);
    assert.match(ragSource, /canonicalProjectRow/);
    assert.match(ragSource, /visualifyProjectsRowHasCanonicalContextFields/);
    assert.match(ragSource, /if \(current >= target\) return "on"/);
    assert.match(ragSource, /if \(current >= target - 10\) return "risk"/);
  });

  it("feeds Project Overview RAG helpers canonical rows only and does not query settings", () => {
    const pageSource = readFileSync(
      fileURLToPath(new URL("../../../app/(protected)/projects/[projectId]/ProjectOverviewContent.tsx", import.meta.url)),
      "utf8",
    );

    assert.match(pageSource, /resolveProjectOverviewProjectContext/);
    assert.match(pageSource, /resolveProjectOverviewReportingPositionContext/);
    assert.match(pageSource, /from\("visualify_projects"\)/);
    assert.equal(pageSource.includes("visualify_project_settings"), false);
    assert.match(pageSource, /buildProjectOverviewTilePayloadForReportingModal/);
    assert.match(pageSource, /reportingPositionBreakdownFromLockedSnapshot/);
    assert.match(pageSource, /canonicalProjectRow/);
    assert.equal(pageSource.includes("buildProjectTilePayloadForReportingModal"), false);
    assert.equal(pageSource.includes("loadProjectContext"), false);
  });

  it("feeds Workspace Overview tile and aggregation loaders canonical Project rows only", () => {
    const tileSource = readFileSync(
      fileURLToPath(new URL("../dashboard/projectTileServerData.ts", import.meta.url)),
      "utf8",
    );
    const workspaceSource = readFileSync(
      fileURLToPath(new URL("../../../app/(protected)/workspaces/[workspaceId]/loadWorkspaceOverviewData.ts", import.meta.url)),
      "utf8",
    );

    assert.match(tileSource, /WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT/);
    assert.match(tileSource, /canonicalProjectRow/);
    assert.equal(tileSource.includes('from("visualify_project_settings")'), false);
    assert.match(workspaceSource, /sumWorkspaceOverviewContingencyByCurrency/);
    assert.match(workspaceSource, /from\("visualify_projects"\)/);
    assert.equal(workspaceSource.includes('from("visualify_project_settings")'), false);
  });

  it("keeps locked-reporting stale-lock behaviour on the Project Overview modal payload", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./projectOverviewProjectContextRead.ts", import.meta.url)),
      "utf8",
    );

    assert.match(source, /applyStaleReportingLockRag/);
    assert.match(source, /computeRag/);
    assert.match(source, /tryReportingBreakdownFromLockedRowAndSettings/);
    assert.match(source, /canonicalProjectRow/);
    assert.match(source, /parseProjectContextFromCanonicalVisualifyProjectsRow/);
  });

  // Removed: legacy /api/projects/[projectId]/settings compatibility endpoint coverage.
});
