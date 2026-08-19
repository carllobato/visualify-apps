import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { isProjectContextComplete, type ProjectContext } from "@/lib/projectContext";
import {
  SIMULATION_PAGE_CANONICAL_PROJECT_CONTEXT_SELECT,
  resolveSimulationPageProjectContext,
} from "./simulationPageProjectContextRead";
import {
  resolveDelayCostPerDayForSimulation,
  resolveScheduleSettingsForSimulation,
} from "../resolveDelayCostPerDayForSimulation";

const CONFLICTING_SETTINGS = {
  project_name: "Legacy Settings Name",
  project_value_input: 300,
  contingency_value_input: 20,
  financial_unit: "MILLIONS",
  financial_inputs_version: 1,
  planned_duration_months: 18,
  target_completion_date: "2026-12-31",
  working_days_per_week: 5,
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

describe("resolveSimulationPageProjectContext", () => {
  it("selects only ProjectContext canonical columns, not code/industry/stage", () => {
    assert.equal(SIMULATION_PAGE_CANONICAL_PROJECT_CONTEXT_SELECT.includes("project_code"), false);
    assert.equal(SIMULATION_PAGE_CANONICAL_PROJECT_CONTEXT_SELECT.includes("project_industry"), false);
    assert.equal(SIMULATION_PAGE_CANONICAL_PROJECT_CONTEXT_SELECT.includes("project_stage"), false);
    assert.equal(SIMULATION_PAGE_CANONICAL_PROJECT_CONTEXT_SELECT.includes("project_value"), true);
  });

  it("uses canonical Project data only for a complete Project", () => {
    const ctx = resolveSimulationPageProjectContext({
      settingsRow: null,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 350000000);
    assert.equal(ctx.delay_cost_per_working_day, 50000);
    assert.equal(isProjectContextComplete(ctx), true);
  });

  it("ignores conflicting settings and does not merge them into canonical values", () => {
    const canonicalOnly = resolveSimulationPageProjectContext({
      settingsRow: null,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });
    const withConflict = resolveSimulationPageProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.deepEqual(withConflict, canonicalOnly);
    assert.equal(withConflict?.projectValue_input === 300000000, false);
    assert.equal(withConflict?.currency, "AUD");
  });

  it("does not fall back to settings when a canonical field is null", () => {
    const ctx = resolveSimulationPageProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { project_value: null },
    });

    assert.equal(ctx, null);
    assert.equal(isProjectContextComplete(ctx), false);
  });

  it("keeps canonical numeric 0 instead of replacing it with legacy non-zero settings", () => {
    const ctx = resolveSimulationPageProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_value: 0 },
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 0);
    assert.equal(isProjectContextComplete(ctx), false);
  });

  it("does not use localStorage when canonical configuration is missing", () => {
    const stored = localStorageContext({ projectValue_input: 0, projectName: "" });
    const ctx = resolveSimulationPageProjectContext({
      settingsRow: null,
      canonicalProjectRow: { project_value: null, project_name: null },
      localStorageContext: stored,
    });

    assert.equal(ctx, null);
    assert.equal(isProjectContextComplete(ctx), false);
  });

  it("keeps canonical working days of 6.5 and 7", () => {
    const sixPointFive = resolveSimulationPageProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_working_days_per_week: 6.5 },
    });
    const seven = resolveSimulationPageProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_working_days_per_week: 7 },
    });

    assert.ok(sixPointFive);
    assert.equal(sixPointFive.workingDaysPerWeek, 6.5);
    assert.ok(seven);
    assert.equal(seven.workingDaysPerWeek, 7);
  });

  it("keeps canonical P100 without clamping", () => {
    const ctx = resolveSimulationPageProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_risk_appetite: "P100" },
    });

    assert.ok(ctx);
    assert.equal(ctx.riskAppetite, "P100");
  });

  it("keeps additional canonical currencies without remapping them to AUD", () => {
    const eur = resolveSimulationPageProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_currency: "EUR" },
    });
    const sgd = resolveSimulationPageProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { ...COMPLETE_CANONICAL, project_currency: "SGD" },
    });

    assert.ok(eur);
    assert.equal(eur.currency, "EUR");
    assert.ok(sgd);
    assert.equal(sgd.currency, "SGD");
  });

  it("hydrates canonical financial values as unscaled major-currency amounts", () => {
    const ctx = resolveSimulationPageProjectContext({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: COMPLETE_CANONICAL,
    });

    assert.ok(ctx);
    assert.equal(ctx.contingencyValue_input, 30000000);
    assert.equal(ctx.contingencyValue_m, 30);
  });

  it("treats canonical schedule contingency as working days, not weeks", () => {
    const ctx = resolveSimulationPageProjectContext({
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
});

describe("simulation engine delay-cost resolver boundary", () => {
  it("still exports the schedule/delay-cost resolver functions used by runSimulation", () => {
    assert.equal(typeof resolveScheduleSettingsForSimulation, "function");
    assert.equal(typeof resolveDelayCostPerDayForSimulation, "function");
  });

  it("does not inline Monte Carlo engine resolution in the page Project Context helper", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./simulationPageProjectContextRead.ts", import.meta.url)),
      "utf8",
    );

    assert.match(source, /resolveSimulationPageProjectContext/);
    assert.equal(source.includes("runMonteCarloSimulation"), false);
  });

  it("loads canonical visualify_projects only and does not query visualify_project_settings", () => {
    const pageSource = readFileSync(
      fileURLToPath(
        new URL("../../../app/(protected)/simulation/SimulationPageContent.tsx", import.meta.url),
      ),
      "utf8",
    );
    const helperSource = readFileSync(
      fileURLToPath(new URL("./simulationPageProjectContextRead.ts", import.meta.url)),
      "utf8",
    );

    assert.match(pageSource, /from\("visualify_projects"\)/);
    assert.match(pageSource, /resolveSimulationPageProjectContext/);
    assert.equal(pageSource.includes("visualify_project_settings"), false);
    assert.match(helperSource, /parseProjectContextFromCanonicalVisualifyProjectsRow/);
  });
});
