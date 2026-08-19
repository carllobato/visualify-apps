import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProjectContext } from "@/lib/projectContext";
import {
  getProjectInformationValidationErrors,
  type RawNumericFields,
} from "./projectInformationFormValidation";
import { PROJECT_INDUSTRY_VALUES, PROJECT_STAGE_VALUES } from "@/lib/projectContext";

function validForm(overrides: Partial<ProjectContext> = {}): ProjectContext {
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
    ...overrides,
  };
}

function filledRaw(overrides: RawNumericFields = {}): RawNumericFields {
  return {
    projectValue_input: "350000000",
    contingencyValue_input: "30000000",
    plannedDuration_months: "24",
    scheduleContingency_workingDays: "20",
    delay_cost_per_working_day: "50000",
    ...overrides,
  };
}

describe("getProjectInformationValidationErrors", () => {
  it("uses the exact controlled industry and stage option lists", () => {
    assert.deepEqual([...PROJECT_INDUSTRY_VALUES], [
      "Data Centres",
      "Commercial",
      "Residential",
      "Industrial & Logistics",
      "Infrastructure",
      "Energy & Utilities",
      "Healthcare",
      "Education",
      "Government & Public Sector",
      "Other",
    ]);
    assert.deepEqual([...PROJECT_STAGE_VALUES], [
      "Due Diligence",
      "Feasibility",
      "Design & Planning",
      "Procurement",
      "Construction",
      "Commissioning",
      "Operations",
    ]);
  });
  it("accepts a fully filled form including optional project code", () => {
    const err = getProjectInformationValidationErrors(validForm(), filledRaw());
    assert.deepEqual(err, {});
  });

  it("allows an empty project code", () => {
    const err = getProjectInformationValidationErrors(validForm({ projectCode: "" }), filledRaw());
    assert.equal(err.projectCode, undefined);
    assert.deepEqual(err, {});
  });

  it("requires identity, financial, schedule, and risk appetite fields", () => {
    const err = getProjectInformationValidationErrors(
      validForm({
        projectName: "  ",
        location: "",
        projectIndustry: "",
        projectStage: "",
        targetCompletionDate: "",
      }),
      {
        projectValue_input: "",
        contingencyValue_input: "",
        plannedDuration_months: "",
        scheduleContingency_workingDays: "",
        delay_cost_per_working_day: "",
      },
    );

    assert.equal(err.projectName, "This field is required");
    assert.equal(err.location, "This field is required");
    assert.equal(err.projectIndustry, "This field is required");
    assert.equal(err.projectStage, "This field is required");
    assert.equal(err.projectValue_input, "This field is required");
    assert.equal(err.contingencyValue_input, "This field is required");
    assert.equal(err.delay_cost_per_working_day, "This field is required");
    assert.equal(err.plannedDuration_months, "This field is required");
    assert.equal(err.targetCompletionDate, "This field is required");
    assert.equal(err.scheduleContingency_workingDays, "This field is required");
  });

  it("does not treat a deliberate zero as missing for contingency, schedule contingency, or delay cost", () => {
    const err = getProjectInformationValidationErrors(
      validForm({
        projectValue_input: 0,
        contingencyValue_input: 0,
        delay_cost_per_working_day: 0,
        delay_cost_per_day: 0,
        scheduleContingency_workingDays: 0,
      }),
      {
        projectValue_input: "0",
        contingencyValue_input: "0",
        plannedDuration_months: "24",
        scheduleContingency_workingDays: "0",
        delay_cost_per_working_day: "0",
      },
    );

    assert.equal(err.projectValue_input, undefined);
    assert.equal(err.contingencyValue_input, undefined);
    assert.equal(err.delay_cost_per_working_day, undefined);
    assert.equal(err.scheduleContingency_workingDays, undefined);
    assert.deepEqual(err, {});
  });

  it("does not silently remap a legacy stage", () => {
    const err = getProjectInformationValidationErrors(
      validForm({ projectStage: "Development" }),
      filledRaw(),
    );
    assert.equal(err.projectStage, "Select a valid project stage");

    const delivery = getProjectInformationValidationErrors(
      validForm({ projectStage: "Delivery" }),
      filledRaw(),
    );
    assert.equal(delivery.projectStage, "Select a valid project stage");
    assert.equal(PROJECT_STAGE_VALUES.includes("Development" as (typeof PROJECT_STAGE_VALUES)[number]), false);
    assert.equal(PROJECT_STAGE_VALUES.includes("Delivery" as (typeof PROJECT_STAGE_VALUES)[number]), false);
  });

  it("accepts every controlled industry, working-day, and P100 risk appetite value", () => {
    for (const industry of PROJECT_INDUSTRY_VALUES) {
      const err = getProjectInformationValidationErrors(validForm({ projectIndustry: industry }), filledRaw());
      assert.equal(err.projectIndustry, undefined, industry);
    }

    for (const days of [5, 5.5, 6, 6.5, 7] as const) {
      const err = getProjectInformationValidationErrors(validForm({ workingDaysPerWeek: days }), filledRaw());
      assert.equal(err.workingDaysPerWeek, undefined, String(days));
    }

    const p100 = getProjectInformationValidationErrors(validForm({ riskAppetite: "P100" }), filledRaw());
    assert.equal(p100.riskAppetite, undefined);
    assert.deepEqual(p100, {});
  });
});

// Removed: legacy settings-row numeric hydration helper tests.
