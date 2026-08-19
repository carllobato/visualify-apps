import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProjectContext } from "@/lib/projectContext";
import {
  canonicalPatchFromProjectContext,
  parseCanonicalProjectFieldsFromPatchBody,
  visualifyProjectsMetadataUpdatePayload,
} from "./visualifyProjectsCanonicalWrite";

function sampleContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
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

describe("canonicalPatchFromProjectContext", () => {
  it("writes raw major-currency values with no thousands/millions/billions scaling", () => {
    const patch = canonicalPatchFromProjectContext(sampleContext());

    assert.equal(patch.project_value, 350000000);
    assert.equal(patch.project_contingency, 30000000);
    assert.equal(patch.project_delay_cost_per_working_day, 50000);
    assert.equal(patch.project_currency, "AUD");
  });

  it("stores schedule contingency in working days and does not emit weeks", () => {
    const patch = canonicalPatchFromProjectContext(sampleContext());

    assert.equal(patch.project_schedule_contingency_working_days, 20);
    assert.equal("schedule_contingency_weeks" in patch, false);
    assert.equal(
      Object.prototype.hasOwnProperty.call(patch, "project_schedule_contingency_weeks"),
      false,
    );
  });

  it("writes identity code, industry, and stage from the current form values", () => {
    const patch = canonicalPatchFromProjectContext(sampleContext());

    assert.equal(patch.project_name, "Northgate Rail Upgrade");
    assert.equal(patch.project_code, "NGU-01");
    assert.equal(patch.project_location, "Sydney, NSW");
    assert.equal(patch.project_industry, "Infrastructure");
    assert.equal(patch.project_stage, "Construction");
  });

  it("writes empty optional project code as null and does not remap a legacy stage", () => {
    const patch = canonicalPatchFromProjectContext(
      sampleContext({
        projectCode: "  ",
        projectStage: "Development",
      }),
    );

    assert.equal(patch.project_code, null);
    assert.equal(patch.project_stage, "Development");
    assert.equal(patch.project_stage === "Construction", false);
    assert.equal(patch.project_stage === "Design & Planning", false);
  });

  it("writes empty location and missing delay cost as null without inventing defaults", () => {
    const patch = canonicalPatchFromProjectContext(
      sampleContext({
        location: "  ",
        delay_cost_per_day: null,
        delay_cost_per_working_day: null,
      }),
    );

    assert.equal(patch.project_location, null);
    assert.equal(patch.project_delay_cost_per_working_day, null);
  });
});

describe("parseCanonicalProjectFieldsFromPatchBody", () => {
  it("accepts working-day values including 6.5 and 7, and risk appetite including P100", () => {
    const parsed = parseCanonicalProjectFieldsFromPatchBody({
      project_working_days_per_week: 6.5,
      project_risk_appetite: "P100",
    });

    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.patch.project_working_days_per_week, 6.5);
    assert.equal(parsed.patch.project_risk_appetite, "P100");

    const sevenDays = parseCanonicalProjectFieldsFromPatchBody({
      project_working_days_per_week: 7,
    });
    assert.equal(sevenDays.ok, true);
    if (!sevenDays.ok) return;
    assert.equal(sevenDays.patch.project_working_days_per_week, 7);
  });

  it("accepts allowed industry and stage values and rejects invalid ones", () => {
    const allowed = parseCanonicalProjectFieldsFromPatchBody({
      project_industry: "Data Centres",
      project_stage: "Due Diligence",
    });
    assert.equal(allowed.ok, true);
    if (!allowed.ok) return;
    assert.equal(allowed.patch.project_industry, "Data Centres");
    assert.equal(allowed.patch.project_stage, "Due Diligence");

    const invalidIndustry = parseCanonicalProjectFieldsFromPatchBody({
      project_industry: "Mining",
    });
    assert.equal(invalidIndustry.ok, false);
    if (invalidIndustry.ok) return;
    assert.equal(invalidIndustry.error, "Invalid project_industry");

    const legacyStage = parseCanonicalProjectFieldsFromPatchBody({
      project_stage: "Development",
    });
    assert.equal(legacyStage.ok, false);
    if (legacyStage.ok) return;
    assert.equal(legacyStage.error, "Invalid project_stage");

    const deliveryStage = parseCanonicalProjectFieldsFromPatchBody({
      project_stage: "Delivery",
    });
    assert.equal(deliveryStage.ok, false);
  });

  it("treats project_code as optional and does not invent absent industry or stage", () => {
    const emptyCode = parseCanonicalProjectFieldsFromPatchBody({
      project_code: "  ",
    });
    assert.equal(emptyCode.ok, true);
    if (!emptyCode.ok) return;
    assert.equal(emptyCode.patch.project_code, null);

    const omitted = parseCanonicalProjectFieldsFromPatchBody({});
    assert.equal(omitted.ok, true);
    if (!omitted.ok) return;
    assert.equal("project_industry" in omitted.patch, false);
    assert.equal("project_stage" in omitted.patch, false);
    assert.equal("project_code" in omitted.patch, false);
  });

  it("rejects invalid working days and does not scale financial values", () => {
    const invalidDays = parseCanonicalProjectFieldsFromPatchBody({
      project_working_days_per_week: 4,
    });
    assert.equal(invalidDays.ok, false);

    const financial = parseCanonicalProjectFieldsFromPatchBody({
      project_value: 350000000,
      project_currency: "EUR",
    });
    assert.equal(financial.ok, true);
    if (!financial.ok) return;
    assert.equal(financial.patch.project_value, 350000000);
    assert.equal(financial.patch.project_currency, "EUR");
  });

  it("omits absent fields so existing canonical NULLs are not invented", () => {
    const parsed = parseCanonicalProjectFieldsFromPatchBody({});
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.patch, {});
  });
});

describe("visualifyProjectsMetadataUpdatePayload", () => {
  it("keeps name live and always writes project_name", () => {
    const payload = visualifyProjectsMetadataUpdatePayload({ name: "Bridge" });
    assert.equal(payload.name, "Bridge");
    assert.equal(payload.project_name, "Bridge");
  });

  it("merges collected canonical fields without renaming legacy columns", () => {
    const payload = visualifyProjectsMetadataUpdatePayload({
      name: "Bridge",
      canonical: canonicalPatchFromProjectContext(sampleContext({ projectName: "Bridge" })),
    });

    assert.equal(payload.name, "Bridge");
    assert.equal(payload.project_name, "Bridge");
    assert.equal(payload.project_value, 350000000);
    assert.equal(payload.project_code, "NGU-01");
    assert.equal(payload.project_industry, "Infrastructure");
    assert.equal(payload.project_stage, "Construction");
    assert.equal("code" in payload, false);
    assert.equal("location" in payload, false);
    assert.equal("industry" in payload, false);
    assert.equal("stage" in payload, false);
  });
});
