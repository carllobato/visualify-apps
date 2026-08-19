import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { REPORTING_LOCK_STALE_MS } from "@/lib/dashboard/projectTileServerData";
import {
  reportingPositionBreakdownFromLockedSnapshot,
  tryReportingBreakdownFromLockedRowAndSettings,
  tryReportingFundingScalars,
  tryReportingPositionDriverScalars,
  tryReportingRagFromLockedRowAndSettings,
} from "@/lib/dashboard/reportingPositionRag";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";
import {
  buildProjectOverviewTilePayloadForReportingModal,
  resolveProjectOverviewReportingPositionContext,
} from "@/lib/project/projectOverviewProjectContextRead";

const LEGACY_V1_ON_TRACK = {
  project_name: "Legacy Settings Name",
  project_value_input: 300,
  contingency_value_input: 80,
  delay_cost_per_working_day: 10,
  financial_unit: "MILLIONS",
  financial_inputs_version: 1,
  planned_duration_months: 18,
  target_completion_date: "2026-12-31",
  working_days_per_week: 5,
  schedule_contingency_weeks: 16,
  schedule_inputs_version: 1,
  risk_appetite: "P80",
  currency: "AUD",
} as const;

/** Equivalent interpreted values: $80m contingency, 80 working days, P80. */
const CANONICAL_EQUIVALENT_ON_TRACK = {
  project_value: 300000000,
  project_contingency: 80000000,
  project_schedule_contingency_working_days: 80,
  project_working_days_per_week: 5,
  project_risk_appetite: "P80",
  project_currency: "AUD",
} as const;

function lockedRowWithLinearCdfs(): NonNullable<SimulationSnapshotRow> {
  const costHistogram = Array.from({ length: 100 }, (_, i) => ({
    cost: (i + 1) * 1_000_000,
    frequency: 1,
  }));
  const timeHistogram = Array.from({ length: 100 }, (_, i) => ({
    time: i + 1,
    frequency: 1,
  }));
  return {
    id: "locked-1",
    project_id: "project-1",
    iterations: 100,
    locked_for_reporting: true,
    locked_at: "2026-08-01T00:00:00.000Z",
    created_at: "2026-08-01T00:00:00.000Z",
    cost_p20: 20_000_000,
    cost_p50: 50_000_000,
    cost_p80: 80_000_000,
    cost_p90: 90_000_000,
    cost_mean: 50_000_000,
    cost_min: 1_000_000,
    cost_max: 100_000_000,
    time_p20: 20,
    time_p50: 50,
    time_p80: 80,
    time_p90: 90,
    time_mean: 50,
    time_min: 1,
    time_max: 100,
    payload: {
      summary: {
        meanCost: 50_000_000,
        p20Cost: 20_000_000,
        p50Cost: 50_000_000,
        p80Cost: 80_000_000,
        p90Cost: 90_000_000,
        minCost: 1_000_000,
        maxCost: 100_000_000,
        meanTime: 50,
        p20Time: 20,
        p50Time: 50,
        p80Time: 80,
        p90Time: 90,
        minTime: 1,
        maxTime: 100,
      },
      summaryReport: {
        iterationCount: 100,
        averageCost: 50_000_000,
        averageTime: 50,
        p50Cost: 50_000_000,
        p80Cost: 80_000_000,
        p90Cost: 90_000_000,
        minCost: 1_000_000,
        maxCost: 100_000_000,
      },
      risks: [],
      distributions: { costHistogram, timeHistogram, binCount: 100 },
      seed: 1,
      inputs_used: [],
    },
  };
}

describe("reportingPositionRag canonical-only Project parameters", () => {
  it("produces RAG for canonical project parameters", () => {
    const locked = lockedRowWithLinearCdfs();

    const breakdown = tryReportingBreakdownFromLockedRowAndSettings(locked, CANONICAL_EQUIVALENT_ON_TRACK);
    const drivers = tryReportingPositionDriverScalars(locked, CANONICAL_EQUIVALENT_ON_TRACK);
    const rag = tryReportingRagFromLockedRowAndSettings(locked, CANONICAL_EQUIVALENT_ON_TRACK);
    const funding = tryReportingFundingScalars(locked, CANONICAL_EQUIVALENT_ON_TRACK);

    assert.ok(breakdown);
    assert.ok(drivers);
    assert.ok(rag);
    assert.ok(funding);
  });

  it("keeps canonical P100 as target 100 without clamping to P80/P90", () => {
    const locked = lockedRowWithLinearCdfs();
    const p100 = tryReportingPositionDriverScalars(locked, {
      ...CANONICAL_EQUIVALENT_ON_TRACK,
      project_risk_appetite: "P100",
    });
    const p80 = tryReportingPositionDriverScalars(locked, CANONICAL_EQUIVALENT_ON_TRACK);

    assert.ok(p100);
    assert.equal(p100.targetPNumeric, 100);
    assert.ok(p80);
    assert.equal(p80.targetPNumeric, 80);
  });

  it("does not change RAG thresholds or formulas", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./reportingPositionRag.ts", import.meta.url)),
      "utf8",
    );

    assert.match(source, /if \(current >= target\) return "on"/);
    assert.match(source, /if \(current >= target - 10\) return "risk"/);
    assert.match(source, /function escalateSeverityIfAbsoluteGapToPTarget/);
    assert.match(source, /if \(line === "off"\) return "off"/);
    assert.match(source, /return "risk"/);
    assert.match(source, /worstRank === 0 \? "Off Track" : worstRank === 1 \? "At Risk" : "On Track"/);
    assert.match(source, /worstRank === 0 \? "red" : worstRank === 1 \? "amber" : "green"/);
  });

  it("leaves locked reporting snapshot data unchanged", () => {
    const locked = lockedRowWithLinearCdfs();
    const before = JSON.stringify(locked);
    const breakdown = tryReportingBreakdownFromLockedRowAndSettings(locked, CANONICAL_EQUIVALENT_ON_TRACK);
    const after = JSON.stringify(locked);

    assert.ok(breakdown);
    assert.equal(after, before);
    assert.equal(locked.locked_for_reporting, true);
    assert.equal(locked.id, "locked-1");
  });

  it("returns null when canonical project parameters are missing", () => {
    const locked = lockedRowWithLinearCdfs();

    assert.equal(tryReportingBreakdownFromLockedRowAndSettings(locked, null), null);
    assert.equal(tryReportingBreakdownFromLockedRowAndSettings(null, CANONICAL_EQUIVALENT_ON_TRACK), null);
    assert.equal(tryReportingFundingScalars(locked, null), null);
    assert.equal(tryReportingPositionDriverScalars(locked, null), null);
    assert.equal(tryReportingRagFromLockedRowAndSettings(locked, null), null);
  });
});

describe("Project Overview reporting modal payload", () => {
  it("applies the same stale-lock rule and does not rewrite the locked row", () => {
    const staleIso = new Date(Date.now() - (REPORTING_LOCK_STALE_MS + 60_000)).toISOString();
    const locked = { ...lockedRowWithLinearCdfs(), locked_at: staleIso, created_at: staleIso };
    const before = JSON.stringify(locked);
    const nowMs = Date.now();

    const payload = buildProjectOverviewTilePayloadForReportingModal({
      project: { id: "project-1", name: "Northgate" },
      lockedRow: locked,
      settingsRow: LEGACY_V1_ON_TRACK,
      canonicalProjectRow: CANONICAL_EQUIVALENT_ON_TRACK,
      riskCount: 2,
      highSeverityCount: 0,
      nowMs,
    });

    assert.equal(payload.ragStatus, "amber");
    assert.equal(payload.reportingOverallStatus, "On Track");
    assert.equal(JSON.stringify(locked), before);
  });

  it("does not invent a reporting position when Project parameters are missing", () => {
    const locked = lockedRowWithLinearCdfs();
    const payload = buildProjectOverviewTilePayloadForReportingModal({
      project: { id: "project-1", name: "Incomplete" },
      lockedRow: locked,
      settingsRow: null,
      canonicalProjectRow: { project_value: null, project_name: "" },
      riskCount: 0,
      highSeverityCount: 0,
    });

    assert.equal(payload.reportingOverallStatus, undefined);
    assert.equal(payload.reportingCostStatus, undefined);
    assert.equal(payload.ragStatus, "green");
  });

  it("ignores conflicting settings for current Project parameters", () => {
    const locked = lockedRowWithLinearCdfs();
    const canonicalOnly = buildProjectOverviewTilePayloadForReportingModal({
      project: { id: "project-1", name: "Northgate" },
      lockedRow: locked,
      canonicalProjectRow: { ...CANONICAL_EQUIVALENT_ON_TRACK, project_contingency: 20_000_000 },
      riskCount: 2,
      highSeverityCount: 0,
    });
    const withConflict = buildProjectOverviewTilePayloadForReportingModal({
      project: { id: "project-1", name: "Northgate" },
      lockedRow: locked,
      settingsRow: LEGACY_V1_ON_TRACK,
      canonicalProjectRow: { ...CANONICAL_EQUIVALENT_ON_TRACK, project_contingency: 20_000_000 },
      riskCount: 2,
      highSeverityCount: 0,
    });

    assert.deepEqual(withConflict.reportingCostStatus, canonicalOnly.reportingCostStatus);
    assert.deepEqual(withConflict.reportingOverallStatus, canonicalOnly.reportingOverallStatus);
    assert.equal(canonicalOnly.reportingCostStatus, "Off track");
  });
});

describe("Project Overview RAG canonical-only current Project parameters", () => {
  it("uses canonical current parameters and ignores conflicting settings", () => {
    const locked = lockedRowWithLinearCdfs();
    const canonicalCtx = resolveProjectOverviewReportingPositionContext({
      settingsRow: LEGACY_V1_ON_TRACK,
      canonicalProjectRow: { ...CANONICAL_EQUIVALENT_ON_TRACK, project_contingency: 20_000_000 },
    });
    const canonicalOnlyCtx = resolveProjectOverviewReportingPositionContext({
      settingsRow: null,
      canonicalProjectRow: { ...CANONICAL_EQUIVALENT_ON_TRACK, project_contingency: 20_000_000 },
    });
    assert.deepEqual(canonicalCtx, canonicalOnlyCtx);
    assert.ok(canonicalCtx);
    const breakdown = reportingPositionBreakdownFromLockedSnapshot(locked, canonicalCtx);
    const settingsOnly = tryReportingBreakdownFromLockedRowAndSettings(locked, LEGACY_V1_ON_TRACK);

    assert.ok(breakdown);
    assert.equal(breakdown.costLine, "off");
    assert.equal(settingsOnly, null);
  });

  it("does not break a canonically complete Project when the settings row is absent", () => {
    const locked = lockedRowWithLinearCdfs();
    const ctx = resolveProjectOverviewReportingPositionContext({
      settingsRow: null,
      canonicalProjectRow: CANONICAL_EQUIVALENT_ON_TRACK,
    });
    assert.ok(ctx);
    const breakdown = reportingPositionBreakdownFromLockedSnapshot(locked, ctx);
    assert.ok(breakdown);
    assert.equal(breakdown.overallStatus, "On Track");
  });

  it("keeps canonical numeric 0 instead of using settings contingency", () => {
    const locked = lockedRowWithLinearCdfs();
    const ctx = resolveProjectOverviewReportingPositionContext({
      settingsRow: LEGACY_V1_ON_TRACK,
      canonicalProjectRow: { ...CANONICAL_EQUIVALENT_ON_TRACK, project_contingency: 0 },
    });
    assert.ok(ctx);
    const breakdown = reportingPositionBreakdownFromLockedSnapshot(locked, ctx);
    assert.equal(breakdown?.costLine ?? null, null);
  });

  it("keeps canonical P100, 6.5/7 working days, unscaled financials, and working-day schedule contingency", () => {
    const p100 = resolveProjectOverviewReportingPositionContext({
      settingsRow: LEGACY_V1_ON_TRACK,
      canonicalProjectRow: { ...CANONICAL_EQUIVALENT_ON_TRACK, project_risk_appetite: "P100" },
    });
    const sixPointFive = resolveProjectOverviewReportingPositionContext({
      settingsRow: LEGACY_V1_ON_TRACK,
      canonicalProjectRow: { ...CANONICAL_EQUIVALENT_ON_TRACK, project_working_days_per_week: 6.5 },
    });
    const seven = resolveProjectOverviewReportingPositionContext({
      settingsRow: LEGACY_V1_ON_TRACK,
      canonicalProjectRow: { ...CANONICAL_EQUIVALENT_ON_TRACK, project_working_days_per_week: 7 },
    });

    assert.equal(p100?.riskAppetite, "P100");
    assert.equal(sixPointFive?.workingDaysPerWeek, 6.5);
    assert.equal(seven?.workingDaysPerWeek, 7);
    assert.equal(sixPointFive?.contingencyValue_input, 80_000_000);
    assert.equal(sixPointFive?.scheduleContingency_workingDays, 80);
    assert.equal(sixPointFive?.scheduleContingency_workingDays === 16 * 6.5, false);
  });

  it("leaves locked reporting snapshot data unchanged", () => {
    const locked = lockedRowWithLinearCdfs();
    const before = JSON.stringify(locked);
    const ctx = resolveProjectOverviewReportingPositionContext({
      canonicalProjectRow: CANONICAL_EQUIVALENT_ON_TRACK,
    });
    assert.ok(ctx);
    reportingPositionBreakdownFromLockedSnapshot(locked, ctx);
    assert.equal(JSON.stringify(locked), before);
  });
});
