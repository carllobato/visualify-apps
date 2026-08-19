import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { runMonteCarloSimulation } from "@/domain/simulation/monteCarlo";
import type { Risk } from "@/domain/risk/risk.schema";
import type { ProjectContext } from "@/lib/projectContext";
import {
  resolveSimulationEngineScheduleSettings,
  type SimulationScheduleSettings,
} from "./resolveDelayCostPerDayForSimulation";

const ISO = "2026-01-01T00:00:00.000Z";
const baseRating = { probability: 3, consequence: 3, score: 9, level: "high" as const };

const CONFLICTING_SETTINGS = {
  delay_cost_per_working_day: 10,
  delay_cost_per_day: 10,
  financial_unit: "MILLIONS",
  financial_inputs_version: 1,
  working_days_per_week: 5,
  schedule_contingency_weeks: 4,
  schedule_contingency_working_days: 10,
  schedule_inputs_version: 1,
} as const;

const LEGACY_V2_SETTINGS = {
  delay_cost_per_working_day: 99999,
  financial_unit: "MILLIONS",
  financial_inputs_version: 2,
  working_days_per_week: 5,
  schedule_contingency_working_days: 99,
  schedule_inputs_version: 2,
} as const;

function localStorageContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    projectName: "Local only",
    plannedDuration_months: 12,
    targetCompletionDate: "2027-01-01",
    scheduleContingency_weeks: 0,
    workingDaysPerWeek: 6,
    scheduleContingency_workingDays: 8,
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
    delay_cost_per_day: 25000,
    delay_cost_per_working_day: 25000,
    ...overrides,
  };
}

/** Same recording rule as `runSimulation` snapshot payload fields. Schema unchanged. */
function snapshotUsedFromResolved(settings: SimulationScheduleSettings): {
  working_days_per_week: number;
  delay_cost_per_working_day_used: number | null;
  delay_cost_per_day_used: number | null;
} {
  const delayUsed =
    settings.delayCostPerWorkingDay != null &&
    Number.isFinite(settings.delayCostPerWorkingDay) &&
    settings.delayCostPerWorkingDay > 0
      ? settings.delayCostPerWorkingDay
      : null;
  return {
    working_days_per_week: settings.workingDaysPerWeek,
    delay_cost_per_working_day_used: delayUsed,
    delay_cost_per_day_used: delayUsed,
  };
}

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    title: "Test Risk",
    category: "programme",
    status: "open",
    inherentRating: baseRating,
    residualRating: baseRating,
    createdAt: ISO,
    updatedAt: ISO,
    preMitigationProbabilityPct: 100,
    preMitigationCostML: 0,
    preMitigationTimeMin: 10,
    preMitigationTimeML: 10,
    preMitigationTimeMax: 10,
    ...overrides,
  };
}

describe("resolveSimulationEngineScheduleSettings", () => {
  it("uses canonical delay cost without settings fallback or scaling", () => {
    const resolved = resolveSimulationEngineScheduleSettings({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { project_delay_cost_per_working_day: 50000 },
    });

    assert.equal(resolved.delayCostPerWorkingDay, 50000);
    assert.equal(resolved.delayCostPerWorkingDay === 10000000, false);
    assert.equal(resolved.delayCostPerWorkingDay === 10, false);
  });

  it("keeps canonical delay cost 0 instead of falling back to settings", () => {
    const resolved = resolveSimulationEngineScheduleSettings({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { project_delay_cost_per_working_day: 0 },
    });

    assert.equal(resolved.delayCostPerWorkingDay, 0);
    assert.equal(resolved.delayCostPerWorkingDay === 10000000, false);
  });

  it("does not hydrate delay cost from settings when canonical delay cost is NULL", () => {
    const v1 = resolveSimulationEngineScheduleSettings({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { project_delay_cost_per_working_day: null },
    });
    const v2 = resolveSimulationEngineScheduleSettings({
      settingsRow: LEGACY_V2_SETTINGS,
      canonicalProjectRow: { project_delay_cost_per_working_day: null },
    });

    assert.equal(v1.delayCostPerWorkingDay, undefined);
    assert.equal(v2.delayCostPerWorkingDay, undefined);
  });

  it("lets canonical working days win and ignores conflicting settings", () => {
    const resolved = resolveSimulationEngineScheduleSettings({
      settingsRow: { ...LEGACY_V2_SETTINGS, working_days_per_week: 5 },
      canonicalProjectRow: { project_working_days_per_week: 6 },
    });

    assert.equal(resolved.workingDaysPerWeek, 6);
    assert.equal(resolved.workingDaysPerWeek === 5, false);
  });

  it("keeps canonical working days of 6.5 and 7", () => {
    const sixPointFive = resolveSimulationEngineScheduleSettings({
      settingsRow: LEGACY_V2_SETTINGS,
      canonicalProjectRow: { project_working_days_per_week: 6.5 },
    });
    const seven = resolveSimulationEngineScheduleSettings({
      settingsRow: LEGACY_V2_SETTINGS,
      canonicalProjectRow: { project_working_days_per_week: 7 },
    });

    assert.equal(sixPointFive.workingDaysPerWeek, 6.5);
    assert.equal(seven.workingDaysPerWeek, 7);
  });

  it("lets canonical schedule contingency working days win over settings weeks", () => {
    const resolved = resolveSimulationEngineScheduleSettings({
      settingsRow: {
        working_days_per_week: 5,
        schedule_contingency_weeks: 8,
        schedule_inputs_version: 1,
      },
      canonicalProjectRow: { project_schedule_contingency_working_days: 20 },
    });

    assert.equal(resolved.scheduleContingencyWorkingDays, 20);
    assert.equal(resolved.scheduleContingencyWorkingDays === 40, false);
  });

  it("keeps canonical schedule contingency 0 instead of converting legacy weeks", () => {
    const resolved = resolveSimulationEngineScheduleSettings({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: { project_schedule_contingency_working_days: 0 },
    });

    assert.equal(resolved.scheduleContingencyWorkingDays, 0);
    assert.equal(resolved.scheduleContingencyWorkingDays === 20, false);
    assert.equal(resolved.scheduleContingencyWorkingDays === 10, false);
  });

  it("does not hydrate schedule values from settings when canonical schedule fields are NULL", () => {
    const fromWorkingDays = resolveSimulationEngineScheduleSettings({
      settingsRow: LEGACY_V2_SETTINGS,
      canonicalProjectRow: {
        project_working_days_per_week: null,
        project_schedule_contingency_working_days: null,
      },
    });
    const fromWeeks = resolveSimulationEngineScheduleSettings({
      settingsRow: {
        working_days_per_week: 5,
        schedule_contingency_weeks: 4,
        schedule_inputs_version: 1,
      },
      canonicalProjectRow: { project_schedule_contingency_working_days: null },
    });

    assert.equal(fromWorkingDays.workingDaysPerWeek, 5);
    assert.equal(fromWorkingDays.scheduleContingencyWorkingDays, undefined);
    assert.equal(fromWeeks.scheduleContingencyWorkingDays, undefined);
  });

  it("does not hydrate engine parameters from settings-only rows", () => {
    const v2 = resolveSimulationEngineScheduleSettings({
      settingsRow: LEGACY_V2_SETTINGS,
    });
    const v1 = resolveSimulationEngineScheduleSettings({
      settingsRow: CONFLICTING_SETTINGS,
    });

    assert.deepEqual(v2, { workingDaysPerWeek: 5 });
    assert.deepEqual(v1, { workingDaysPerWeek: 5 });
    assert.equal(v2.delayCostPerWorkingDay, undefined);
    assert.equal(v2.scheduleContingencyWorkingDays, undefined);
  });

  it("canonical inputs produce the same Monte Carlo results as equivalent explicit engine parameters", () => {
    const risks: Risk[] = [makeRisk()];
    const canonical = resolveSimulationEngineScheduleSettings({
      settingsRow: LEGACY_V2_SETTINGS,
      canonicalProjectRow: {
        project_delay_cost_per_working_day: 50000,
        project_working_days_per_week: 5,
        project_schedule_contingency_working_days: 4,
      },
    });
    const equivalent: SimulationScheduleSettings = {
      delayCostPerWorkingDay: 50000,
      workingDaysPerWeek: 5,
      scheduleContingencyWorkingDays: 4,
    };

    assert.deepEqual(canonical, equivalent);

    const canonicalRun = runMonteCarloSimulation({
      risks,
      iterations: 50,
      seed: 11,
      delayCostPerWorkingDay: canonical.delayCostPerWorkingDay,
      workingDaysPerWeek: canonical.workingDaysPerWeek,
      scheduleContingencyWorkingDays: canonical.scheduleContingencyWorkingDays,
    });
    const equivalentRun = runMonteCarloSimulation({
      risks,
      iterations: 50,
      seed: 11,
      delayCostPerWorkingDay: equivalent.delayCostPerWorkingDay,
      workingDaysPerWeek: equivalent.workingDaysPerWeek,
      scheduleContingencyWorkingDays: equivalent.scheduleContingencyWorkingDays,
    });

    assert.deepEqual(canonicalRun.costSamples, equivalentRun.costSamples);
    assert.deepEqual(canonicalRun.timeSamples, equivalentRun.timeSamples);
    assert.deepEqual(canonicalRun.delayDerivedCostSamples, equivalentRun.delayDerivedCostSamples);
    assert.deepEqual(canonicalRun.summary, equivalentRun.summary);
  });

  it("records snapshot-used values from the resolved inputs without changing schema", () => {
    const withDelay = snapshotUsedFromResolved(
      resolveSimulationEngineScheduleSettings({
        canonicalProjectRow: {
          project_delay_cost_per_working_day: 50000,
          project_working_days_per_week: 6.5,
        },
      }),
    );
    const zeroDelay = snapshotUsedFromResolved(
      resolveSimulationEngineScheduleSettings({
        settingsRow: LEGACY_V2_SETTINGS,
        canonicalProjectRow: { project_delay_cost_per_working_day: 0 },
      }),
    );

    assert.equal(withDelay.working_days_per_week, 6.5);
    assert.equal(withDelay.delay_cost_per_working_day_used, 50000);
    assert.equal(withDelay.delay_cost_per_day_used, 50000);
    assert.equal(zeroDelay.delay_cost_per_working_day_used, null);
    assert.equal(zeroDelay.delay_cost_per_day_used, null);
  });

  it("does not invent engine inputs when canonical values are missing", () => {
    const resolved = resolveSimulationEngineScheduleSettings({
      settingsRow: null,
      canonicalProjectRow: {
        project_delay_cost_per_working_day: null,
        project_working_days_per_week: null,
        project_schedule_contingency_working_days: null,
      },
      localStorageContext: null,
    });

    assert.deepEqual(resolved, { workingDaysPerWeek: 5 });
    assert.equal(resolved.delayCostPerWorkingDay, undefined);
    assert.equal(resolved.scheduleContingencyWorkingDays, undefined);
  });

  it("does not use localStorage when canonical engine fields are absent", () => {
    const stored = localStorageContext();
    const fromLocal = resolveSimulationEngineScheduleSettings({
      settingsRow: CONFLICTING_SETTINGS,
      canonicalProjectRow: {
        project_delay_cost_per_working_day: null,
        project_working_days_per_week: null,
      },
      localStorageContext: stored,
    });
    const canonicalWinsOverLocal = resolveSimulationEngineScheduleSettings({
      settingsRow: null,
      canonicalProjectRow: { project_delay_cost_per_working_day: 50000 },
      localStorageContext: stored,
    });

    assert.equal(fromLocal.delayCostPerWorkingDay, undefined);
    assert.equal(fromLocal.workingDaysPerWeek, 5);
    assert.equal(fromLocal.scheduleContingencyWorkingDays, undefined);
    assert.equal(canonicalWinsOverLocal.delayCostPerWorkingDay, 50000);
    assert.equal(canonicalWinsOverLocal.workingDaysPerWeek, 5);
    assert.equal(canonicalWinsOverLocal.scheduleContingencyWorkingDays, undefined);
  });
});

describe("simulation engine resolver source", () => {
  it("queries canonical visualify_projects fields and does not query visualify_project_settings", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./resolveDelayCostPerDayForSimulation.ts", import.meta.url)),
      "utf8",
    );

    assert.match(source, /from\("visualify_projects"\)/);
    assert.equal(source.includes("visualify_project_settings"), false);
    assert.equal(source.includes("loadProjectContext"), false);
    assert.match(source, /project_delay_cost_per_working_day/);
    assert.match(source, /project_working_days_per_week/);
    assert.match(source, /project_schedule_contingency_working_days/);
    assert.equal(source.includes("computeValueM"), false);
    assert.equal(source.includes("majorCurrencyFromLegacyScaledInput"), false);
  });

  it("keeps snapshot payload recording of resolved delay cost and working days in runSimulation", () => {
    const store = readFileSync(
      fileURLToPath(new URL("../store/risk-register.store.tsx", import.meta.url)),
      "utf8",
    );

    assert.match(store, /resolveScheduleSettingsForSimulation/);
    assert.match(store, /working_days_per_week: workingDaysPerWeek/);
    assert.match(store, /delay_cost_per_working_day_used:/);
    assert.match(store, /delayCostPerWorkingDay > 0/);
  });
});
