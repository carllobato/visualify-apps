import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PROJECT_CURRENCY_VALUES,
  PROJECT_INDUSTRY_VALUES,
  PROJECT_STAGE_VALUES,
  RISK_APPETITE_VALUES,
  WORKING_DAYS_PER_WEEK_VALUES,
} from "@/lib/projectContext";
import { getProjectInformationValidationErrors } from "./projectInformationFormValidation";
import { parseProjectPatchBody } from "./projectArchiveLifecycle";
import {
  firstOnboardingFormError,
  firstOnboardingStepError,
  onboardingCanonicalProjectPatchBody,
  onboardingProjectContextDraft,
  onboardingRawNumericFields,
  onboardingReportedComplete,
  parseOnboardingProjectContext,
  validateOnboardingProjectForm,
  type OnboardingProjectFormValues,
} from "./onboardingCanonicalProjectWrite";

const ONBOARDING_MODAL = fileURLToPath(
  new URL("../../components/onboarding/ProjectOnboardingCreateModal.tsx", import.meta.url),
);
const PROJECT_PATCH_ROUTE = fileURLToPath(
  new URL("../../../app/api/projects/[projectId]/route.ts", import.meta.url),
);

function validValues(overrides: Partial<OnboardingProjectFormValues> = {}): OnboardingProjectFormValues {
  return {
    projectName: "Northgate Rail Upgrade",
    projectCode: "NGU-01",
    location: "Sydney, NSW",
    projectIndustry: "Infrastructure",
    projectStage: "Construction",
    currency: "AUD",
    projectValueRaw: "187,000,000",
    contingencyValueRaw: "10,000,000",
    delayCostPerWorkingDayRaw: "50,000",
    plannedDurationMonthsRaw: "24",
    targetCompletionDate: "2027-06-30",
    workingDaysPerWeek: 5,
    scheduleContingencyWorkingDaysRaw: "20",
    riskAppetite: "P80",
    ...overrides,
  };
}

describe("validateOnboardingProjectForm", () => {
  it("requires all canonical fields and treats project_code as optional", () => {
    const filled = validateOnboardingProjectForm(validValues({ projectCode: "" }));
    assert.deepEqual(filled, {});

    const missing = validateOnboardingProjectForm(
      validValues({
        projectName: "  ",
        location: "",
        projectIndustry: "",
        projectStage: "",
        projectValueRaw: "",
        contingencyValueRaw: "",
        delayCostPerWorkingDayRaw: "",
        plannedDurationMonthsRaw: "",
        targetCompletionDate: "",
        scheduleContingencyWorkingDaysRaw: "",
      }),
    );

    assert.equal(missing.projectName, "This field is required");
    assert.equal(missing.location, "This field is required");
    assert.equal(missing.projectIndustry, "This field is required");
    assert.equal(missing.projectStage, "This field is required");
    assert.equal(missing.projectValue_input, "This field is required");
    assert.equal(missing.contingencyValue_input, "This field is required");
    assert.equal(missing.delay_cost_per_working_day, "This field is required");
    assert.equal(missing.plannedDuration_months, "This field is required");
    assert.equal(missing.targetCompletionDate, "This field is required");
    assert.equal(missing.scheduleContingency_workingDays, "This field is required");
    assert.equal("projectCode" in missing, false);
  });

  it("reuses Project Information validation for industry, stage, currencies, working days, and P100", () => {
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
    assert.deepEqual([...PROJECT_CURRENCY_VALUES], [
      "AUD",
      "USD",
      "GBP",
      "EUR",
      "NZD",
      "CAD",
      "SGD",
      "AED",
    ]);
    assert.deepEqual([...WORKING_DAYS_PER_WEEK_VALUES], [5, 5.5, 6, 6.5, 7]);
    assert.equal(RISK_APPETITE_VALUES.includes("P100"), true);

    for (const industry of PROJECT_INDUSTRY_VALUES) {
      assert.deepEqual(validateOnboardingProjectForm(validValues({ projectIndustry: industry })), {});
    }
    for (const stage of PROJECT_STAGE_VALUES) {
      assert.deepEqual(validateOnboardingProjectForm(validValues({ projectStage: stage })), {});
    }
    for (const currency of PROJECT_CURRENCY_VALUES) {
      assert.deepEqual(validateOnboardingProjectForm(validValues({ currency })), {});
    }
    for (const workingDaysPerWeek of WORKING_DAYS_PER_WEEK_VALUES) {
      assert.deepEqual(validateOnboardingProjectForm(validValues({ workingDaysPerWeek })), {});
    }
    assert.deepEqual(validateOnboardingProjectForm(validValues({ riskAppetite: "P100" })), {});

    const values = validValues({ projectIndustry: "Infrastructure", projectStage: "Construction" });
    assert.deepEqual(
      validateOnboardingProjectForm(values),
      getProjectInformationValidationErrors(
        onboardingProjectContextDraft(values),
        onboardingRawNumericFields(values),
      ),
    );
  });

  it("does not silently remap legacy Development or Delivery stages", () => {
    const development = validateOnboardingProjectForm(validValues({ projectStage: "Development" as never }));
    const delivery = validateOnboardingProjectForm(validValues({ projectStage: "Delivery" as never }));

    assert.equal(development.projectStage, "Select a valid project stage");
    assert.equal(delivery.projectStage, "Select a valid project stage");
    assert.equal(PROJECT_STAGE_VALUES.includes("Development" as (typeof PROJECT_STAGE_VALUES)[number]), false);
    assert.equal(PROJECT_STAGE_VALUES.includes("Delivery" as (typeof PROJECT_STAGE_VALUES)[number]), false);
  });

  it("preserves numeric zero for contingency, delay cost, and schedule contingency", () => {
    const err = validateOnboardingProjectForm(
      validValues({
        contingencyValueRaw: "0",
        delayCostPerWorkingDayRaw: "0",
        scheduleContingencyWorkingDaysRaw: "0",
      }),
    );
    assert.deepEqual(err, {});

    const parsed = parseOnboardingProjectContext(
      validValues({
        contingencyValueRaw: "0",
        delayCostPerWorkingDayRaw: "0",
        scheduleContingencyWorkingDaysRaw: "0",
      }),
    );
    assert.ok(parsed);
    assert.equal(parsed.contingencyValue_input, 0);
    assert.equal(parsed.delay_cost_per_working_day, 0);
    assert.equal(parsed.scheduleContingency_workingDays, 0);
  });

  it("rejects non-integer planned duration from onboarding inputs", () => {
    const err = validateOnboardingProjectForm(validValues({ plannedDurationMonthsRaw: "24.5" }));
    assert.deepEqual(err, { plannedDuration_months: "Duration must be a whole number of months." });
  });

  it("rejects non-integer schedule contingency from onboarding inputs", () => {
    const err = validateOnboardingProjectForm(validValues({ scheduleContingencyWorkingDaysRaw: "20.5" }));
    assert.deepEqual(err, {
      scheduleContingency_workingDays: "Schedule contingency must be a whole number of working days.",
    });
  });

  it("surfaces the first invalid field for the current step", () => {
    const errors = validateOnboardingProjectForm(
      validValues({ projectName: "", location: "", projectIndustry: "" }),
    );
    assert.equal(firstOnboardingStepError(1, errors), "This field is required");
    assert.equal(firstOnboardingStepError(4, errors), undefined);
    assert.equal(firstOnboardingFormError(errors), "This field is required");
  });
});

describe("onboarding canonical and settings writes", () => {
  it("writes unscaled major-currency canonical values and working-day schedule contingency", () => {
    const parsed = parseOnboardingProjectContext(validValues());
    assert.ok(parsed);
    const body = onboardingCanonicalProjectPatchBody(parsed);

    assert.equal(body.name, "Northgate Rail Upgrade");
    assert.equal(body.project_name, "Northgate Rail Upgrade");
    assert.equal(body.name, body.project_name);
    assert.equal(body.project_code, "NGU-01");
    assert.equal(body.project_location, "Sydney, NSW");
    assert.equal(body.project_industry, "Infrastructure");
    assert.equal(body.project_stage, "Construction");
    assert.equal(body.project_currency, "AUD");
    assert.equal(body.project_value, 187_000_000);
    assert.equal(body.project_contingency, 10_000_000);
    assert.equal(body.project_delay_cost_per_working_day, 50_000);
    assert.equal(body.project_planned_duration_months, 24);
    assert.equal(body.project_target_completion_date, "2027-06-30");
    assert.equal(body.project_working_days_per_week, 5);
    assert.equal(body.project_schedule_contingency_working_days, 20);
    assert.equal(body.project_risk_appetite, "P80");
    assert.equal("project_schedule_contingency_weeks" in body, false);
    assert.equal(body.project_value === 187_000_000 * 1e6, false);
    assert.equal(body.project_contingency === 10_000_000 * 1e6, false);
  });

  it("contains the complete canonical field set including optional empty project_code as null", () => {
    const parsed = parseOnboardingProjectContext(validValues({ projectCode: "  " }));
    assert.ok(parsed);
    const body = onboardingCanonicalProjectPatchBody(parsed);

    assert.deepEqual(
      Object.keys(body).sort(),
      [
        "name",
        "project_code",
        "project_contingency",
        "project_currency",
        "project_delay_cost_per_working_day",
        "project_industry",
        "project_location",
        "project_name",
        "project_planned_duration_months",
        "project_risk_appetite",
        "project_schedule_contingency_working_days",
        "project_stage",
        "project_target_completion_date",
        "project_value",
        "project_working_days_per_week",
      ].sort(),
    );
    assert.equal(body.project_code, null);
    assert.equal(body.name, body.project_name);
  });

  it("reports onboarding complete from canonical PATCH success alone", () => {
    assert.equal(onboardingReportedComplete({ canonicalOk: true }), true);
    assert.equal(onboardingReportedComplete({ canonicalOk: false }), false);
  });

  it("sends the complete canonical patch through the authorised Project metadata parser", () => {
    const parsed = parseOnboardingProjectContext(validValues({ workingDaysPerWeek: 7, riskAppetite: "P100" }));
    assert.ok(parsed);
    const result = parseProjectPatchBody(onboardingCanonicalProjectPatchBody(parsed));

    assert.equal(result.ok, true);
    if (!result.ok || result.kind !== "name") return;
    assert.equal(result.name, "Northgate Rail Upgrade");
    assert.equal(result.canonical.project_name, "Northgate Rail Upgrade");
    assert.equal(result.canonical.project_value, 187_000_000);
    assert.equal(result.canonical.project_working_days_per_week, 7);
    assert.equal(result.canonical.project_risk_appetite, "P100");
    assert.equal(result.canonical.project_schedule_contingency_working_days, 20);
  });
});

describe("onboarding wizard write wiring", () => {
  it("does not expose a financial unit selector and completes after canonical PATCH only", () => {
    const modal = readFileSync(ONBOARDING_MODAL, "utf8");

    assert.equal(modal.includes("REPORTING_UNIT"), false);
    assert.equal(modal.includes("project-onboarding-unit"), false);
    assert.match(modal, /onboardingCanonicalProjectPatchBody/);
    assert.equal(modal.includes("onboardingSettingsCompatibilityPayload"), false);
    assert.match(modal, /onboardingReportedComplete/);
    assert.match(modal, /\/api\/projects\/\$\{json\.project\.id\}`/);
    assert.equal(modal.includes("`/api/projects/${json.project.id}/settings`"), false);
    assert.equal(modal.includes("/settings"), false);
    assert.match(modal, /PROJECT_INDUSTRY_VALUES/);
    assert.match(modal, /PROJECT_STAGE_VALUES/);
    assert.match(modal, /PROJECT_CURRENCY_VALUES/);
    assert.match(modal, /WORKING_DAYS_PER_WEEK_VALUES/);
    assert.match(modal, /RISK_APPETITE_VALUES/);
    assert.match(modal, /Cost of Delay Per Working Day/);

    const canonicalIdx = modal.indexOf("`/api/projects/${json.project.id}`");
    const completeIdx = modal.indexOf("onboardingReportedComplete({ canonicalOk");
    const createdIdx = modal.indexOf("await onCreated(");
    assert.ok(canonicalIdx >= 0);
    assert.ok(completeIdx > canonicalIdx);
    assert.ok(createdIdx > completeIdx);
    assert.match(modal, /if \(!canonicalRes\.ok\)/);
  });

  it("keeps Project Editor metadata restriction on canonical writes", () => {
    const projectRoute = readFileSync(PROJECT_PATCH_ROUTE, "utf8");

    assert.match(projectRoute, /!bundle\.permissions\.canEditProjectMetadata/);
    assert.match(projectRoute, /status:\s*403/);
  });
});
