import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import type { SimulationSnapshotPayload } from "@/lib/db/snapshots";
import {
  resolveSnapshotScheduleMetadataFromPayload,
  withSnapshotScheduleMetadata,
} from "@/lib/db/snapshots";

function workingDayPayload(workingDaysPerWeek: number): SimulationSnapshotPayload {
  return {
    payload_schema_version: 2,
    schedule_delay_basis: "working_days",
    time_basis: "working_days",
    working_days_per_week: workingDaysPerWeek,
    summary: {
      meanCost: 0,
      p20Cost: 0,
      p50Cost: 0,
      p80Cost: 0,
      p90Cost: 0,
      minCost: 0,
      maxCost: 0,
      meanTime: 0,
      p20Time: 0,
      p50Time: 0,
      p80Time: 0,
      p90Time: 0,
      minTime: 0,
      maxTime: 0,
      time_basis: "working_days",
      working_days_per_week: workingDaysPerWeek,
    },
    summaryReport: {
      iterationCount: 10000,
      averageCost: 0,
      averageTime: 0,
      p50Cost: 0,
      p80Cost: 0,
      p90Cost: 0,
      minCost: 0,
      maxCost: 0,
    },
    risks: [],
    distributions: {
      costHistogram: [],
      timeHistogram: [],
      binCount: 40,
    },
    seed: 1,
    delay_cost_per_working_day_used: 50000,
    inputs_used: [],
  };
}

function legacyCalendarPayload(): SimulationSnapshotPayload {
  return {
    payload_schema_version: 1,
    summary: {
      meanCost: 0,
      p20Cost: 0,
      p50Cost: 0,
      p80Cost: 0,
      p90Cost: 0,
      minCost: 0,
      maxCost: 0,
      meanTime: 0,
      p20Time: 0,
      p50Time: 0,
      p80Time: 0,
      p90Time: 0,
      minTime: 0,
      maxTime: 0,
    },
    summaryReport: {
      iterationCount: 10000,
      averageCost: 0,
      averageTime: 0,
      p50Cost: 0,
      p80Cost: 0,
      p90Cost: 0,
      minCost: 0,
      maxCost: 0,
    },
    risks: [],
    distributions: {
      costHistogram: [],
      timeHistogram: [],
      binCount: 40,
    },
    seed: 1,
    inputs_used: [],
  };
}

describe("resolveSnapshotScheduleMetadataFromPayload", () => {
  it("maps working-day runs to working_days basis and working_days_per_week", () => {
    const payload = workingDayPayload(5.5);
    assert.deepEqual(resolveSnapshotScheduleMetadataFromPayload(payload), {
      schedule_delay_basis: "working_days",
      working_days_per_week: 5.5,
    });
  });

  it("maps legacy calendar-day payloads to calendar_days_legacy with null working_days_per_week", () => {
    assert.deepEqual(resolveSnapshotScheduleMetadataFromPayload(legacyCalendarPayload()), {
      schedule_delay_basis: "calendar_days_legacy",
      working_days_per_week: null,
    });
  });

  it("falls back to summary.working_days_per_week when top-level payload value is absent", () => {
    const payload = workingDayPayload(6.5);
    delete payload.working_days_per_week;

    assert.deepEqual(resolveSnapshotScheduleMetadataFromPayload(payload), {
      schedule_delay_basis: "working_days",
      working_days_per_week: 6.5,
    });
  });

  it("recognizes working-day runs when only time_basis is set on legacy-shaped payloads", () => {
    const payload = legacyCalendarPayload();
    payload.time_basis = "working_days";
    payload.summary.working_days_per_week = 5;

    assert.deepEqual(resolveSnapshotScheduleMetadataFromPayload(payload), {
      schedule_delay_basis: "working_days",
      working_days_per_week: 5,
    });
  });
});

describe("withSnapshotScheduleMetadata", () => {
  it("keeps top-level snapshot metadata aligned with payload metadata", () => {
    const payload = workingDayPayload(5.5);
    const insertRow = withSnapshotScheduleMetadata({
      project_id: "project-id",
      payload,
    });

    assert.equal(insertRow.schedule_delay_basis, payload.schedule_delay_basis);
    assert.equal(insertRow.working_days_per_week, payload.working_days_per_week);
    assert.equal(insertRow.schedule_delay_basis, "working_days");
    assert.equal(insertRow.working_days_per_week, 5.5);
  });

  it("preserves legacy calendar metadata alignment for historical-shaped payloads", () => {
    const payload = legacyCalendarPayload();
    const insertRow = withSnapshotScheduleMetadata({ payload });

    assert.equal(insertRow.schedule_delay_basis, "calendar_days_legacy");
    assert.equal(insertRow.working_days_per_week, null);
    assert.equal(payload.schedule_delay_basis, undefined);
    assert.equal(payload.working_days_per_week, undefined);
  });
});

describe("snapshot insert route wiring", () => {
  it("derives schedule metadata from payload during POST insert mapping", () => {
    const route = readFileSync(
      fileURLToPath(
        new URL("../../../app/api/projects/[projectId]/snapshots/route.ts", import.meta.url)
      ),
      "utf8"
    );

    assert.match(route, /withSnapshotScheduleMetadata\(/);
    assert.doesNotMatch(route, /schedule_delay_basis:\s*"calendar_days_legacy"/);
  });
});
