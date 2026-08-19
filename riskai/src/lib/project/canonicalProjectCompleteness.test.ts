import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROJECT_CURRENCY_VALUES,
  PROJECT_INDUSTRY_VALUES,
  PROJECT_STAGE_VALUES,
  RISK_APPETITE_VALUES,
  WORKING_DAYS_PER_WEEK_VALUES,
} from "@/lib/projectContext";
import { canonicalPatchFromProjectContext } from "./visualifyProjectsCanonicalWrite";
import {
  CANONICAL_PROJECT_COMPLETENESS_SELECT,
  canonicalProjectCompletenessErrors,
  hydrateProjectInformationFromCanonicalRow,
  isCanonicalProjectComplete,
} from "./canonicalProjectCompleteness";
import { getProjectInformationValidationErrors } from "./projectInformationFormValidation";

const SETTINGS_COMPLETE_COMPATIBILITY_ROW = {
  project_name: "Settings Complete Name",
  location: "Sydney, NSW",
  currency: "AUD",
  financial_unit: "MILLIONS",
  financial_inputs_version: 2,
  project_value_input: 350000000,
  contingency_value_input: 30000000,
  delay_cost_per_working_day: 50000,
  planned_duration_months: 24,
  target_completion_date: "2027-06-30",
  working_days_per_week: 5,
  schedule_contingency_working_days: 20,
  schedule_inputs_version: 2,
  risk_appetite: "P80",
} as const;

function completeCanonicalRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    project_name: "Northgate Rail Upgrade",
    project_code: "NGU-01",
    project_location: "Sydney, NSW",
    project_industry: "Infrastructure",
    project_stage: "Construction",
    project_currency: "AUD",
    project_value: 350000000,
    project_contingency: 30000000,
    project_delay_cost_per_working_day: 50000,
    project_planned_duration_months: 24,
    project_target_completion_date: "2027-06-30",
    project_working_days_per_week: 5,
    project_schedule_contingency_working_days: 20,
    project_risk_appetite: "P80",
    ...overrides,
  };
}

describe("isCanonicalProjectComplete", () => {
  it("treats a complete canonical Project as complete", () => {
    assert.equal(isCanonicalProjectComplete(completeCanonicalRow()), true);
    assert.deepEqual(canonicalProjectCompletenessErrors(completeCanonicalRow()), {});
  });

  it("treats a missing required canonical field as incomplete", () => {
    assert.equal(
      isCanonicalProjectComplete(completeCanonicalRow({ project_location: null })),
      false,
    );
    assert.equal(
      canonicalProjectCompletenessErrors(completeCanonicalRow({ project_location: null }))
        .location,
      "This field is required",
    );
  });

  it("stays complete when optional project_code is missing", () => {
    assert.equal(isCanonicalProjectComplete(completeCanonicalRow({ project_code: null })), true);
    assert.equal(isCanonicalProjectComplete(completeCanonicalRow({ project_code: "" })), true);
    const withoutCode = completeCanonicalRow();
    delete withoutCode.project_code;
    assert.equal(isCanonicalProjectComplete(withoutCode), true);
  });

  it("treats contingency 0 as present", () => {
    assert.equal(
      isCanonicalProjectComplete(completeCanonicalRow({ project_contingency: 0 })),
      true,
    );
  });

  it("treats delay cost 0 as present", () => {
    assert.equal(
      isCanonicalProjectComplete(completeCanonicalRow({ project_delay_cost_per_working_day: 0 })),
      true,
    );
  });

  it("treats schedule contingency 0 as present", () => {
    assert.equal(
      isCanonicalProjectComplete(
        completeCanonicalRow({ project_schedule_contingency_working_days: 0 }),
      ),
      true,
    );
  });

  it("treats an invalid industry as incomplete", () => {
    const errors = canonicalProjectCompletenessErrors(
      completeCanonicalRow({ project_industry: "Mining" }),
    );
    assert.equal(errors.projectIndustry, "Select a valid project industry");
    assert.equal(isCanonicalProjectComplete(completeCanonicalRow({ project_industry: "Mining" })), false);
    assert.equal(PROJECT_INDUSTRY_VALUES.includes("Mining" as never), false);
  });

  it("treats legacy Development and Delivery stages as incomplete", () => {
    assert.equal(
      isCanonicalProjectComplete(completeCanonicalRow({ project_stage: "Development" })),
      false,
    );
    assert.equal(
      isCanonicalProjectComplete(completeCanonicalRow({ project_stage: "Delivery" })),
      false,
    );
    assert.equal(PROJECT_STAGE_VALUES.includes("Development" as never), false);
    assert.equal(PROJECT_STAGE_VALUES.includes("Delivery" as never), false);
  });

  it("treats an invalid currency as incomplete", () => {
    assert.equal(
      isCanonicalProjectComplete(completeCanonicalRow({ project_currency: "JPY" })),
      false,
    );
    assert.equal(PROJECT_CURRENCY_VALUES.includes("JPY" as never), false);
  });

  it("treats invalid working days as incomplete", () => {
    assert.equal(
      isCanonicalProjectComplete(completeCanonicalRow({ project_working_days_per_week: 4 })),
      false,
    );
    assert.equal(WORKING_DAYS_PER_WEEK_VALUES.includes(4 as never), false);
  });

  it("treats P100 as valid", () => {
    assert.equal(
      isCanonicalProjectComplete(completeCanonicalRow({ project_risk_appetite: "P100" })),
      true,
    );
    assert.equal(RISK_APPETITE_VALUES.includes("P100"), true);
  });

  it("ignores a complete settings row when the canonical Project is incomplete", () => {
    const canonicalIncomplete = {
      ...SETTINGS_COMPLETE_COMPATIBILITY_ROW,
      name: "Shell Name",
      project_name: "",
      project_location: null,
      project_industry: null,
      project_stage: null,
      project_currency: null,
      project_value: null,
      project_contingency: null,
      project_delay_cost_per_working_day: null,
      project_planned_duration_months: null,
      project_target_completion_date: null,
      project_working_days_per_week: null,
      project_schedule_contingency_working_days: null,
      project_risk_appetite: null,
    };
    assert.equal(isCanonicalProjectComplete(canonicalIncomplete), false);
    assert.equal(isCanonicalProjectComplete(SETTINGS_COMPLETE_COMPATIBILITY_ROW), false);
  });

  it("does not treat a shell name column as project_name", () => {
    assert.equal(
      isCanonicalProjectComplete(
        completeCanonicalRow({ project_name: "", name: "Created from /create-project" }),
      ),
      false,
    );
  });

  it("reuses Project Information validation rather than a second allowed-value list", () => {
    const row = completeCanonicalRow({ project_industry: "Mining", project_stage: "Development" });
    const completeness = canonicalProjectCompletenessErrors(row);
    const formErrors = getProjectInformationValidationErrors(
      {
        projectName: "Northgate Rail Upgrade",
        projectCode: "NGU-01",
        location: "Sydney, NSW",
        projectIndustry: "Mining",
        projectStage: "Development",
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
      },
      {
        projectValue_input: "350000000",
        contingencyValue_input: "30000000",
        plannedDuration_months: "24",
        scheduleContingency_workingDays: "20",
        delay_cost_per_working_day: "50000",
      },
    );
    assert.equal(completeness.projectIndustry, formErrors.projectIndustry);
    assert.equal(completeness.projectStage, formErrors.projectStage);
  });

  it("becomes complete after an authorised metadata save payload", () => {
    const patch = canonicalPatchFromProjectContext({
      projectName: "Northgate Rail Upgrade",
      projectCode: "",
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
      contingencyValue_input: 0,
      projectValue_m: 350,
      contingencyValue_m: 0,
      approvedBudget_m: 350,
      delay_cost_per_day: 0,
      delay_cost_per_working_day: 0,
    });
    assert.equal(isCanonicalProjectComplete(patch), true);
  });

  it("selects required canonical columns including industry and stage", () => {
    const selected = CANONICAL_PROJECT_COMPLETENESS_SELECT.split(",").map((part) => part.trim());
    assert.ok(selected.includes("project_industry"));
    assert.ok(selected.includes("project_stage"));
    assert.ok(selected.includes("project_name"));
    assert.equal(selected.includes("project_value_input"), false);
    assert.equal(selected.includes("location"), false);
  });
});

describe("hydrateProjectInformationFromCanonicalRow", () => {
  it("hydrates unscaled canonical financials and working-day schedule, including P100 / 6.5 / 7 / EUR", () => {
    const { form, raw } = hydrateProjectInformationFromCanonicalRow(
      completeCanonicalRow({
        project_value: 187_000_000,
        project_contingency: 0,
        project_delay_cost_per_working_day: 50_000,
        project_working_days_per_week: 6.5,
        project_schedule_contingency_working_days: 20,
        project_risk_appetite: "P100",
        project_currency: "EUR",
      }),
    );

    assert.equal(form.projectValue_input, 187_000_000);
    assert.equal(form.contingencyValue_input, 0);
    assert.equal(form.delay_cost_per_working_day, 50_000);
    assert.equal(form.projectValue_input === 187_000_000 * 1e6, false);
    assert.equal(form.workingDaysPerWeek, 6.5);
    assert.equal(form.scheduleContingency_workingDays, 20);
    assert.equal(form.riskAppetite, "P100");
    assert.equal(form.currency, "EUR");
    assert.equal(raw.contingencyValue_input, "0");

    const seven = hydrateProjectInformationFromCanonicalRow(
      completeCanonicalRow({ project_working_days_per_week: 7 }),
    );
    assert.equal(seven.form.workingDaysPerWeek, 7);
  });

  it("shows missing canonical numerics as empty and ignores conflicting settings-shaped keys", () => {
    const { form, raw } = hydrateProjectInformationFromCanonicalRow({
      project_name: "",
      name: "Shell Name From API",
      project_location: null,
      project_industry: null,
      project_stage: null,
      project_currency: null,
      project_value: null,
      project_contingency: null,
      project_delay_cost_per_working_day: null,
      project_planned_duration_months: null,
      project_target_completion_date: null,
      project_working_days_per_week: null,
      project_schedule_contingency_working_days: null,
      project_risk_appetite: null,
      project_value_input: 300,
      contingency_value_input: 20,
      delay_cost_per_working_day: 10,
      location: "Legacy Settings Location",
      currency: "USD",
      risk_appetite: "P50",
    });

    assert.equal(form.projectName, "");
    assert.equal(form.location, "");
    assert.equal(form.projectIndustry, "");
    assert.equal(form.projectStage, "");
    assert.equal(raw.projectValue_input, "");
    assert.equal(raw.contingencyValue_input, "");
    assert.equal(raw.delay_cost_per_working_day, "");
    assert.equal(raw.plannedDuration_months, "");
    assert.equal(raw.scheduleContingency_workingDays, "");
    assert.equal(form.projectValue_input === 300, false);
    assert.equal(form.projectValue_input === 300_000_000, false);
    assert.equal(form.location === "Legacy Settings Location", false);
    assert.equal(form.currency, "AUD");
    assert.equal(form.riskAppetite, "P80");
    assert.equal(form.workingDaysPerWeek, 5);
  });

  it("is unchanged when a settings row is absent", () => {
    const withNullSettingsShape = hydrateProjectInformationFromCanonicalRow(
      completeCanonicalRow(),
    );
    const again = hydrateProjectInformationFromCanonicalRow(completeCanonicalRow());
    assert.deepEqual(withNullSettingsShape, again);
    assert.equal(withNullSettingsShape.form.projectValue_input, 350000000);
  });
});
