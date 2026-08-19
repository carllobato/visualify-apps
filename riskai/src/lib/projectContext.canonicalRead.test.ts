import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isProjectContextComplete,
  parseProjectContextFromCanonicalVisualifyProjectsRow,
  parseProjectContextFromVisualifyProjectSettingsRow,
  visualifyProjectsRowHasCanonicalContextFields,
} from "./projectContext";

const LEGACY_V1_SETTINGS = {
  project_name: "Legacy Settings Name",
  location: "Legacy Settings Location",
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
  risk_appetite: "P80",
  currency: "AUD",
} as const;

describe("parseProjectContextFromVisualifyProjectSettingsRow canonical-first read", () => {
  it("hydrates a canonical v2-style raw project value without financial_unit scaling", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(
      {
        project_value_input: 300,
        financial_unit: "MILLIONS",
        financial_inputs_version: 1,
      },
      { project_value: 350000000 },
    );

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 350000000);
    assert.equal(ctx.projectValue_m, 350);
  });

  it("prefers a conflicting canonical project value over legacy settings", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(LEGACY_V1_SETTINGS, {
      project_value: 350000000,
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 350000000);
    assert.equal(ctx.projectValue_input === 300000000, false);
  });

  it("prefers canonical numeric 0 over a legacy non-zero value", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(LEGACY_V1_SETTINGS, {
      project_value: 0,
      project_contingency: 0,
      project_delay_cost_per_working_day: 0,
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 0);
    assert.equal(ctx.contingencyValue_input, 0);
    assert.equal(ctx.delay_cost_per_working_day, 0);
    assert.equal(ctx.projectValue_input === 300000000, false);
  });

  it("falls back to legacy v1 scaling when the canonical value is null", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(LEGACY_V1_SETTINGS, {
      project_value: null,
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 300000000);
    assert.equal(ctx.projectValue_m, 300);
  });

  it("hydrates canonical contingency as an unscaled major-currency amount", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(LEGACY_V1_SETTINGS, {
      project_contingency: 30000000,
    });

    assert.ok(ctx);
    assert.equal(ctx.contingencyValue_input, 30000000);
    assert.equal(ctx.contingencyValue_m, 30);
    assert.equal(ctx.contingencyValue_input === 20000000, false);
  });

  it("hydrates canonical delay cost as an unscaled major-currency amount", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(LEGACY_V1_SETTINGS, {
      project_delay_cost_per_working_day: 50000,
    });

    assert.ok(ctx);
    assert.equal(ctx.delay_cost_per_working_day, 50000);
    assert.equal(ctx.delay_cost_per_day, 50000);
    assert.equal(ctx.delay_cost_per_working_day === 10000000, false);
  });

  it("prefers canonical schedule contingency working days over settings weeks", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(
      {
        working_days_per_week: 5,
        schedule_contingency_weeks: 8,
        schedule_inputs_version: 1,
      },
      { project_schedule_contingency_working_days: 20 },
    );

    assert.ok(ctx);
    assert.equal(ctx.scheduleContingency_workingDays, 20);
    assert.equal(ctx.scheduleContingency_workingDays === 40, false);
  });

  it("settings-only callers still apply v1 scaling when canonical is omitted", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow({
      project_value_input: 300,
      financial_unit: "MILLIONS",
      financial_inputs_version: 1,
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 300000000);
    assert.equal(ctx.projectValue_m, 300);
  });

  it("hydrates canonical working days of 6.5 and 7", () => {
    const sixPointFive = parseProjectContextFromVisualifyProjectSettingsRow(
      { working_days_per_week: 5 },
      { project_working_days_per_week: 6.5 },
    );
    const seven = parseProjectContextFromVisualifyProjectSettingsRow(
      { working_days_per_week: 5 },
      { project_working_days_per_week: 7 },
    );

    assert.ok(sixPointFive);
    assert.equal(sixPointFive.workingDaysPerWeek, 6.5);
    assert.ok(seven);
    assert.equal(seven.workingDaysPerWeek, 7);
  });

  it("hydrates canonical P100 without clamping to P90", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(
      { risk_appetite: "P80" },
      { project_risk_appetite: "P100" },
    );

    assert.ok(ctx);
    assert.equal(ctx.riskAppetite, "P100");
  });

  it("hydrates additional canonical currencies without remapping them to AUD", () => {
    const eur = parseProjectContextFromVisualifyProjectSettingsRow(
      { currency: "AUD" },
      { project_currency: "EUR" },
    );
    const sgd = parseProjectContextFromVisualifyProjectSettingsRow(
      { currency: "AUD" },
      { project_currency: "SGD" },
    );

    assert.ok(eur);
    assert.equal(eur.currency, "EUR");
    assert.ok(sgd);
    assert.equal(sgd.currency, "SGD");
  });

  it("prefers canonical project_name and project_location over settings, not legacy name/location columns", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(LEGACY_V1_SETTINGS, {
      project_name: "Northgate Rail Upgrade",
      project_location: "Sydney, NSW",
      name: "Legacy Projects Name",
      location: "Legacy Projects Location",
    });

    assert.ok(ctx);
    assert.equal(ctx.projectName, "Northgate Rail Upgrade");
    assert.equal(ctx.location, "Sydney, NSW");
    assert.equal(ctx.projectName === "Legacy Projects Name", false);
    assert.equal(ctx.location === "Legacy Projects Location", false);
  });

  it("keeps missing canonical plus missing settings incomplete and does not invent configured values", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow({}, {});

    assert.ok(ctx);
    assert.equal(ctx.projectName, "");
    assert.equal(ctx.projectValue_input, 0);
    assert.equal(ctx.plannedDuration_months, 0);
    assert.equal(ctx.targetCompletionDate, "");
    assert.equal(isProjectContextComplete(ctx), false);
    assert.equal(visualifyProjectsRowHasCanonicalContextFields({}), false);
    assert.equal(
      visualifyProjectsRowHasCanonicalContextFields({
        project_value: null,
        project_name: "",
        name: "MEL1",
        location: "Melbourne",
      }),
      false,
    );
    assert.equal(visualifyProjectsRowHasCanonicalContextFields({ project_value: 0 }), true);
  });
});

describe("parseProjectContextFromCanonicalVisualifyProjectsRow", () => {
  it("does not read settings and hydrates unscaled canonical values", () => {
    const ctx = parseProjectContextFromCanonicalVisualifyProjectsRow({
      project_name: "Northgate Rail Upgrade",
      project_value: 350000000,
      project_contingency: 30000000,
      project_delay_cost_per_working_day: 0,
      project_working_days_per_week: 6.5,
      project_schedule_contingency_working_days: 20,
      project_risk_appetite: "P100",
      project_currency: "EUR",
      project_planned_duration_months: 24,
      project_target_completion_date: "2027-06-30",
      project_location: "Sydney, NSW",
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 350000000);
    assert.equal(ctx.contingencyValue_input, 30000000);
    assert.equal(ctx.delay_cost_per_working_day, 0);
    assert.equal(ctx.workingDaysPerWeek, 6.5);
    assert.equal(ctx.scheduleContingency_workingDays, 20);
    assert.equal(ctx.riskAppetite, "P100");
    assert.equal(ctx.currency, "EUR");
    assert.equal(isProjectContextComplete(ctx), true);
  });

  it("returns null when canonical context fields are absent", () => {
    assert.equal(
      parseProjectContextFromCanonicalVisualifyProjectsRow({
        project_value: null,
        project_name: "",
        name: "MEL1",
      }),
      null,
    );
  });
});
