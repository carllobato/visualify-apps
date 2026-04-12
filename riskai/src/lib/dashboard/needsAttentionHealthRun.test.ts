import { describe, it } from "node:test";
import assert from "node:assert";
import {
  computeNeedsAttentionHealthRun,
  simulationTimestampInCurrentUtcMonth,
  utcBoundsForMonthContaining,
} from "./needsAttentionHealthRun";

describe("needsAttentionHealthRun", () => {
  it("scores 100 when nothing is wrong", () => {
    assert.deepStrictEqual(
      computeNeedsAttentionHealthRun({
        staleSimulationProjectCount: 0,
        registerGapCount: 0,
        topDriversWithoutMitigationCount: 0,
      }),
      { healthScore: 100, primaryRagDot: "green" }
    );
  });

  it("applies capped penalties (max 90 pts → score 10)", () => {
    const r = computeNeedsAttentionHealthRun({
      staleSimulationProjectCount: 10,
      registerGapCount: 20,
      topDriversWithoutMitigationCount: 10,
    });
    assert.strictEqual(r.healthScore, 10);
    assert.strictEqual(r.primaryRagDot, "red");
  });

  it("maps score bands to RAG", () => {
    assert.strictEqual(
      computeNeedsAttentionHealthRun({
        staleSimulationProjectCount: 0,
        registerGapCount: 8,
        topDriversWithoutMitigationCount: 0,
      }).primaryRagDot,
      "amber"
    );
  });

  it("detects UTC month for simulation timestamp", () => {
    const ref = new Date(Date.UTC(2026, 3, 12, 12, 0, 0, 0));
    const { startMs } = utcBoundsForMonthContaining(ref.getTime());
    const inside = new Date(startMs + 86_400_000).toISOString();
    assert.strictEqual(simulationTimestampInCurrentUtcMonth(inside, ref), true);
    assert.strictEqual(simulationTimestampInCurrentUtcMonth("2026-03-31T23:00:00.000Z", ref), false);
  });
});
