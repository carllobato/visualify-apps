import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { parseProjectContextFromVisualifyProjectSettingsRow } from "@/lib/projectContext";
import {
  resolveWorkspaceOverviewContingencyFields,
  resolveWorkspaceOverviewProjectCurrency,
  sumWorkspaceOverviewContingencyByCurrency,
  WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT,
} from "./workspaceOverviewProjectContextRead";

const LEGACY_V1_SETTINGS = {
  project_id: "project-1",
  project_name: "Legacy Settings Name",
  project_value_input: 300,
  contingency_value_input: 80,
  financial_unit: "MILLIONS",
  financial_inputs_version: 1,
  working_days_per_week: 5,
  schedule_contingency_weeks: 16,
  schedule_contingency_working_days: null,
  schedule_inputs_version: 1,
  risk_appetite: "P80",
  currency: "AUD",
} as const;

const CANONICAL_EQUIVALENT = {
  id: "project-1",
  project_value: 300000000,
  project_contingency: 80000000,
  project_schedule_contingency_working_days: 80,
  project_working_days_per_week: 5,
  project_risk_appetite: "P80",
  project_currency: "AUD",
} as const;

describe("Workspace Overview canonical Project select", () => {
  it("selects only Project parameters consumed by Workspace Overview", () => {
    assert.equal(WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_currency"), true);
    assert.equal(WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_value"), true);
    assert.equal(WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_contingency"), true);
    assert.equal(WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_working_days_per_week"), true);
    assert.equal(
      WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_schedule_contingency_working_days"),
      true,
    );
    assert.equal(WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_risk_appetite"), true);
    assert.equal(WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_code"), false);
    assert.equal(WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_industry"), false);
    assert.equal(WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_stage"), false);
    assert.equal(WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT.includes("project_delay_cost"), false);
  });
});

describe("resolveWorkspaceOverviewContingencyFields", () => {
  it("reads contingency from canonical fields only", () => {
    const fromCanonical = resolveWorkspaceOverviewContingencyFields({
      project_contingency: 30_000_000,
    });

    assert.equal(fromCanonical.contingencyMillions, 30);
  });

  it("ignores conflicting settings when only canonical is supplied", () => {
    const fromCanonical = resolveWorkspaceOverviewContingencyFields(CANONICAL_EQUIVALENT);
    const fromSettingsViaParser = resolveWorkspaceOverviewContingencyFields(null);

    assert.equal(fromCanonical.contingencyMillions, 80);
    assert.equal(fromSettingsViaParser.contingencyMillions, 0);
  });

  it("lets canonical Project value win in the S4.4C parser used by tiles/RAG", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(LEGACY_V1_SETTINGS, {
      project_value: 350000000,
    });

    assert.ok(ctx);
    assert.equal(ctx.projectValue_input, 350000000);
    assert.equal(ctx.projectValue_m, 350);
  });

  it("treats canonical numeric 0 as present contingency", () => {
    const fromCanonicalZero = resolveWorkspaceOverviewContingencyFields({
      project_contingency: 0,
      project_currency: "AUD",
    });

    assert.equal(fromCanonicalZero.contingencyMillions, 0);
  });

  it("does not scale canonical financial values", () => {
    const canonicalRaw = resolveWorkspaceOverviewContingencyFields({
      project_contingency: 80_000_000,
      project_currency: "AUD",
    });

    assert.equal(canonicalRaw.contingencyMillions, 80);
  });

  it("treats canonical schedule contingency as working days", () => {
    const canonicalDays = resolveWorkspaceOverviewContingencyFields({
      project_schedule_contingency_working_days: 20,
    });

    assert.equal(canonicalDays.scheduleContingencyWorkingDays, 20);
  });

  it("preserves canonical working days 6.5 and 7 on the canonical row", () => {
    const sixPointFive = resolveWorkspaceOverviewContingencyFields({
      project_working_days_per_week: 6.5,
      project_schedule_contingency_working_days: 26,
    });
    const seven = resolveWorkspaceOverviewContingencyFields({
      project_working_days_per_week: 7,
      project_schedule_contingency_working_days: 28,
    });

    assert.equal(sixPointFive.scheduleContingencyWorkingDays, 26);
    assert.equal(seven.scheduleContingencyWorkingDays, 28);
  });

  it("keeps canonical P100 in the S4.4C parser used by tiles/RAG", () => {
    const ctx = parseProjectContextFromVisualifyProjectSettingsRow(LEGACY_V1_SETTINGS, {
      project_risk_appetite: "P100",
    });

    assert.ok(ctx);
    assert.equal(ctx.riskAppetite, "P100");
  });

  it("keeps canonical EUR and SGD without remapping to AUD", () => {
    const eur = resolveWorkspaceOverviewProjectCurrency({ project_currency: "EUR" });
    const sgd = resolveWorkspaceOverviewProjectCurrency({ project_currency: "SGD" });
    const fieldsEur = resolveWorkspaceOverviewContingencyFields({
      project_currency: "EUR",
      project_contingency: 1,
    });

    assert.equal(eur, "EUR");
    assert.equal(sgd, "SGD");
    assert.equal(fieldsEur.currency, "EUR");
  });

  it("preserves incomplete defaults when canonical values are missing", () => {
    const missing = resolveWorkspaceOverviewContingencyFields({
      project_value: null,
      project_contingency: null,
      project_name: "",
      name: "MEL1",
    });

    assert.deepEqual(missing, {
      contingencyMillions: 0,
      currency: "AUD",
      scheduleContingencyWorkingDays: null,
    });
  });
});

describe("sumWorkspaceOverviewContingencyByCurrency", () => {
  it("sums canonical contingency without settings rows", () => {
    const summed = sumWorkspaceOverviewContingencyByCurrency([
      { id: "project-1", project_contingency: 30_000_000, project_currency: "AUD" },
    ]);

    assert.equal(summed.get("AUD"), 30);
  });

  it("does not invent a total when canonical contingency is missing", () => {
    const summed = sumWorkspaceOverviewContingencyByCurrency([
      { id: "mel1", project_contingency: null, project_currency: null, name: "MEL1" },
    ]);

    assert.equal(summed.size, 0);
  });

  it("includes canonical numeric 0 in the workspace total", () => {
    const summed = sumWorkspaceOverviewContingencyByCurrency([
      { id: "project-1", project_contingency: 0, project_currency: "AUD" },
    ]);

    assert.equal(summed.get("AUD"), 0);
  });
});

describe("Workspace Overview loader wiring", () => {
  it("queries canonical visualify_projects fields and does not query visualify_project_settings", () => {
    const tileSource = readFileSync(
      fileURLToPath(new URL("../dashboard/projectTileServerData.ts", import.meta.url)),
      "utf8",
    );
    const workspaceSource = readFileSync(
      fileURLToPath(
        new URL("../../../app/(protected)/workspaces/[workspaceId]/loadWorkspaceOverviewData.ts", import.meta.url),
      ),
      "utf8",
    );

    assert.match(tileSource, /WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT/);
    assert.match(tileSource, /from\("visualify_projects"\)/);
    assert.equal(tileSource.includes('from("visualify_project_settings")'), false);
    assert.match(tileSource, /tryReportingBreakdownFromLockedRowAndSettings\(/);
    assert.match(tileSource, /canonicalProjectRow/);
    assert.match(workspaceSource, /sumWorkspaceOverviewContingencyByCurrency/);
    assert.match(workspaceSource, /from\("visualify_projects"\)/);
    assert.equal(workspaceSource.includes('from("visualify_project_settings")'), false);
  });
});
