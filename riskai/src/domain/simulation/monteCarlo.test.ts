/**
 * Unit tests for Monte Carlo simulation engine: getEffectiveRiskInputs, filtering, and Programme consistency.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getEffectiveRiskInputs,
  runMonteCarloSimulation,
} from "@/domain/simulation/monteCarlo";
import type { Risk } from "@/domain/risk/risk.schema";
import { buildRating, probabilityPctToScale } from "@/domain/risk/risk.logic";

const baseRating = { probability: 3, consequence: 3, score: 9, level: "high" as const };
const iso = "2025-01-01T00:00:00.000Z";

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    title: "Test Risk",
    category: "programme",
    status: "open",
    inherentRating: baseRating,
    residualRating: baseRating,
    createdAt: iso,
    updatedAt: iso,
    ...overrides,
  };
}

function assertFiniteNonNegative(label: string, value: number): void {
  assert.ok(Number.isFinite(value), `${label} should be finite, got ${value}`);
  assert.ok(value >= 0, `${label} should be >= 0, got ${value}`);
}

describe("getEffectiveRiskInputs", () => {
  it("returns null for closed risks", () => {
    const risk = makeRisk({ status: "closed" });
    assert.strictEqual(getEffectiveRiskInputs(risk), null);
  });

  it("uses post-mitigation when mitigationProfile is active and post ML cost/time present", () => {
    const risk = makeRisk({
      mitigationProfile: {
        status: "active",
        effectiveness: 0.5,
        confidence: 0.5,
        reduces: 0.5,
        lagMonths: 0,
      },
      inherentRating: buildRating(probabilityPctToScale(60), 3),
      residualRating: buildRating(probabilityPctToScale(40), 3),
      preMitigationCostML: 100_000,
      preMitigationTimeML: 20,
      postMitigationCostML: 50_000,
      postMitigationTimeML: 10,
    });
    const out = getEffectiveRiskInputs(risk);
    assert.ok(out);
    assert.strictEqual(out.sourceUsed, "post");
    assert.strictEqual(out.probability, 0.4);
    assert.strictEqual(out.costML, 50_000);
    assert.strictEqual(out.timeML, 10);
  });

  it("falls back to pre-mitigation when post missing", () => {
    const risk = makeRisk({
      inherentRating: buildRating(2, 3),
      residualRating: buildRating(4, 3),
      preMitigationCostML: 80_000,
      preMitigationTimeML: 15,
      probability: 0.5,
    });
    const out = getEffectiveRiskInputs(risk);
    assert.ok(out);
    assert.strictEqual(out.sourceUsed, "pre");
    assert.strictEqual(out.probability, 0.5);
    assert.strictEqual(out.costML, 80_000);
    assert.strictEqual(out.timeML, 15);
  });

  it("uses explicit probability with pre ML cost/time when it aligns with pre scale", () => {
    const risk = makeRisk({
      inherentRating: buildRating(2, 3),
      residualRating: buildRating(4, 3),
      probability: 0.35,
      preMitigationCostML: 200_000,
      preMitigationTimeML: 25,
    });
    const out = getEffectiveRiskInputs(risk);
    assert.ok(out);
    assert.strictEqual(out.probability, 0.35);
    assert.strictEqual(out.costML, 200_000);
    assert.strictEqual(out.timeML, 25);
  });

  it("treats zero as present for cost and time", () => {
    const risk = makeRisk({
      probability: 0.1,
      preMitigationCostML: 0,
      preMitigationTimeML: 0,
    });
    const out = getEffectiveRiskInputs(risk);
    assert.ok(out);
    assert.strictEqual(out.costML, 0);
    assert.strictEqual(out.timeML, 0);
  });
});

describe("runMonteCarloSimulation", () => {
  it("excludes closed risks from simulation", () => {
    const risks: Risk[] = [
      makeRisk({ id: "a", status: "open", probability: 1, preMitigationCostML: 1000, preMitigationTimeML: 5 }),
      makeRisk({ id: "b", status: "closed", probability: 1, preMitigationCostML: 1_000_000, preMitigationTimeML: 1000 }),
    ];
    const result = runMonteCarloSimulation({ risks, iterations: 1000, seed: 42 });
    assert.ok(result.costSamples.length === 1000);
    const maxCost = Math.max(...result.costSamples);
    assert(maxCost < 100_000, "closed risk should not contribute; max cost should be from open risk only");
  });

  it("adds delayCostPerWorkingDay * simulated working-day delay to each cost sample; time samples unchanged", () => {
    const risks: Risk[] = [
      makeRisk({
        id: "sched",
        probability: 1,
        preMitigationCostML: 0,
        preMitigationTimeML: 5,
        preMitigationTimeMin: 5,
        preMitigationTimeMax: 5,
      }),
    ];
    const noDelay = runMonteCarloSimulation({ risks, iterations: 20, seed: 7 });
    const withDelay = runMonteCarloSimulation({
      risks,
      iterations: 20,
      seed: 7,
      delayCostPerWorkingDay: 1000,
      workingDaysPerWeek: 5,
    });
    assert.strictEqual(withDelay.summary.time_basis, "working_days");
    assert.strictEqual(withDelay.summary.working_days_per_week, 5);
    assert.deepStrictEqual(noDelay.timeSamples, withDelay.timeSamples);
    assert.deepStrictEqual(noDelay.directRiskCostSamples, withDelay.directRiskCostSamples);
    for (let i = 0; i < 20; i++) {
      assert.strictEqual(
        withDelay.costSamples[i],
        noDelay.costSamples[i] + noDelay.timeSamples[i] * 1000
      );
      assert.strictEqual(withDelay.delayDerivedCostSamples[i], noDelay.timeSamples[i] * 1000);
    }
    assert.strictEqual(
      withDelay.summary.meanCost,
      withDelay.summary.costBreakdown.totalSimulatedCost.mean
    );
  });

  it("programme P-values are from combined time distribution", () => {
    const risks: Risk[] = [
      makeRisk({ id: "1", probability: 0.5, preMitigationCostML: 10_000, preMitigationTimeML: 10 }),
      makeRisk({ id: "2", probability: 0.5, preMitigationCostML: 20_000, preMitigationTimeML: 20 }),
    ];
    const result = runMonteCarloSimulation({ risks, iterations: 5000, seed: 123 });
    assert.ok(Number.isFinite(result.summary.p20Time));
    assert.ok(Number.isFinite(result.summary.p50Time));
    assert.ok(Number.isFinite(result.summary.p80Time));
    assert.ok(Number.isFinite(result.summary.p90Time));
    assert(result.summary.p50Time >= 0 && result.summary.p50Time <= 30, "P50 time should be in plausible range");
    assert(result.summary.p80Time >= result.summary.p50Time);
    assert(result.summary.p90Time >= result.summary.p80Time);
  });

  it("deterministic single risk 100% prob 10 days (min=ML=max): all schedule percentiles equal 10", () => {
    const risks: Risk[] = [
      makeRisk({
        id: "d",
        inherentRating: buildRating(5, 3),
        residualRating: buildRating(1, 3),
        probability: 1,
        preMitigationCostMin: 0,
        preMitigationCostML: 0,
        preMitigationCostMax: 0,
        preMitigationTimeMin: 10,
        preMitigationTimeML: 10,
        preMitigationTimeMax: 10,
      }),
    ];
    const result = runMonteCarloSimulation({ risks, iterations: 1000, seed: 99 });
    assert.strictEqual(result.summary.p20Time, 10, "p20Time should be 10");
    assert.strictEqual(result.summary.p50Time, 10, "p50Time should be 10");
    assert.strictEqual(result.summary.p80Time, 10, "p80Time should be 10");
    assert.strictEqual(result.summary.p90Time, 10, "p90Time should be 10");
  });

  it("single risk with 100% probability and min=ML=max produces identical samples", () => {
    const constantCost = 100_000;
    const constantTimeDays = 10;
    const risks: Risk[] = [
      makeRisk({
        id: "single",
        status: "open",
        inherentRating: buildRating(5, 3),
        residualRating: buildRating(1, 3),
        probability: 1,
        preMitigationCostMin: constantCost,
        preMitigationCostML: constantCost,
        preMitigationCostMax: constantCost,
        preMitigationTimeMin: constantTimeDays,
        preMitigationTimeML: constantTimeDays,
        preMitigationTimeMax: constantTimeDays,
      }),
    ];
    const result = runMonteCarloSimulation({ risks, iterations: 100, seed: 42 });
    const s = result.summary;
    assert.strictEqual(s.p20Cost, constantCost, "p20Cost should equal constant cost");
    assert.strictEqual(s.p50Cost, constantCost, "p50Cost should equal constant cost");
    assert.strictEqual(s.p80Cost, constantCost, "p80Cost should equal constant cost");
    assert.strictEqual(s.p90Cost, constantCost, "p90Cost should equal constant cost");
    assert.strictEqual(s.p20Time, constantTimeDays, "p20Time should equal constant time");
    assert.strictEqual(s.p50Time, constantTimeDays, "p50Time should equal constant time");
    assert.strictEqual(s.p80Time, constantTimeDays, "p80Time should equal constant time");
    assert.strictEqual(s.p90Time, constantTimeDays, "p90Time should equal constant time");
    assert(s.p50Cost <= s.p80Cost && s.p80Cost <= s.p90Cost, "cost percentiles should be non-decreasing");
    assert(s.p50Time <= s.p80Time && s.p80Time <= s.p90Time, "time percentiles should be non-decreasing");
  });

  it("triangular distribution produces spread around ML (not point-mass)", () => {
    const risks: Risk[] = [
      makeRisk({
        id: "tri",
        inherentRating: buildRating(5, 3),
        residualRating: buildRating(5, 3),
        probability: 1,
        preMitigationCostMin: 50_000,
        preMitigationCostML: 100_000,
        preMitigationCostMax: 200_000,
        preMitigationTimeMin: 5,
        preMitigationTimeML: 10,
        preMitigationTimeMax: 20,
      }),
    ];
    const result = runMonteCarloSimulation({ risks, iterations: 10_000, seed: 42 });
    const s = result.summary;
    assert(s.minCost < s.p50Cost, "min should be less than p50");
    assert(s.p50Cost < s.maxCost, "p50 should be less than max");
    assert(s.p20Cost < s.p80Cost, "p20 should be less than p80");
    assert(s.minCost >= 50_000, "min should be >= triangular min");
    assert(s.maxCost <= 200_000, "max should be <= triangular max");
    assert(s.minTime >= 5, "min time should be >= triangular min");
    assert(s.maxTime <= 20, "max time should be <= triangular max");
  });

  it("post-mitigation exposure is lower than pre-mitigation (P80 cost and time)", () => {
    const preCost = 200_000;
    const preTime = 20;
    const postCost = 100_000;
    const postTime = 10;
    const iterations = 5000;
    const seed = 123;

    const riskPreOnly: Risk[] = [
      makeRisk({
        id: "r1",
        status: "open",
        probability: 1,
        preMitigationCostMin: preCost * 0.8,
        preMitigationCostML: preCost,
        preMitigationCostMax: preCost * 1.3,
        preMitigationTimeMin: Math.round(preTime * 0.8),
        preMitigationTimeML: preTime,
        preMitigationTimeMax: Math.round(preTime * 1.3),
      }),
    ];
    const riskWithPost: Risk[] = [
      makeRisk({
        id: "r1",
        status: "open",
        mitigationProfile: {
          status: "active",
          effectiveness: 0.5,
          confidence: 0.5,
          reduces: 0.5,
          lagMonths: 0,
        },
        probability: 1,
        preMitigationCostML: preCost,
        preMitigationTimeML: preTime,
        postMitigationCostMin: postCost * 0.8,
        postMitigationCostML: postCost,
        postMitigationCostMax: postCost * 1.3,
        postMitigationTimeMin: Math.round(postTime * 0.8),
        postMitigationTimeML: postTime,
        postMitigationTimeMax: Math.round(postTime * 1.3),
      }),
    ];

    const resultPre = runMonteCarloSimulation({ risks: riskPreOnly, iterations, seed });
    const resultPost = runMonteCarloSimulation({ risks: riskWithPost, iterations, seed });

    assert.strictEqual(getEffectiveRiskInputs(riskPreOnly[0])?.sourceUsed, "pre");
    assert.strictEqual(getEffectiveRiskInputs(riskWithPost[0])?.sourceUsed, "post");

    assert(resultPost.summary.p80Cost < resultPre.summary.p80Cost, "post P80 cost should be lower than pre");
    assert(resultPost.summary.p80Time < resultPre.summary.p80Time, "post P80 time should be lower than pre");
  });

  it("no NaN or negative in summary percentiles for normal run", () => {
    const risks: Risk[] = [
      makeRisk({ id: "r1", probability: 0.3, preMitigationCostML: 50_000, preMitigationTimeML: 10 }),
      makeRisk({ id: "r2", probability: 0.5, preMitigationCostML: 100_000, preMitigationTimeML: 20 }),
      makeRisk({ id: "r3", probability: 0.2, preMitigationCostML: 25_000, preMitigationTimeML: 5 }),
      makeRisk({ id: "r4", probability: 0.4, preMitigationCostML: 75_000, preMitigationTimeML: 15 }),
    ];
    const result = runMonteCarloSimulation({ risks, iterations: 500, seed: 123 });
    const s = result.summary;

    assertFiniteNonNegative("p20Cost", s.p20Cost);
    assertFiniteNonNegative("p50Cost", s.p50Cost);
    assertFiniteNonNegative("p80Cost", s.p80Cost);
    assertFiniteNonNegative("p90Cost", s.p90Cost);
    assertFiniteNonNegative("p20Time", s.p20Time);
    assertFiniteNonNegative("p50Time", s.p50Time);
    assertFiniteNonNegative("p80Time", s.p80Time);
    assertFiniteNonNegative("p90Time", s.p90Time);
    assertFiniteNonNegative("meanCost", s.meanCost);
    assertFiniteNonNegative("meanTime", s.meanTime);
    assertFiniteNonNegative("minCost", s.minCost);
    assertFiniteNonNegative("maxCost", s.maxCost);
    assertFiniteNonNegative("minTime", s.minTime);
    assertFiniteNonNegative("maxTime", s.maxTime);
  });

  it("no NaN or negative when risks include zero impacts", () => {
    const risks: Risk[] = [
      makeRisk({ id: "z1", probability: 0.5, preMitigationCostML: 0, preMitigationTimeML: 0 }),
      makeRisk({ id: "z2", probability: 0.3, preMitigationCostML: 100_000, preMitigationTimeML: 10 }),
      makeRisk({ id: "z3", probability: 0.2, preMitigationCostML: 0, preMitigationTimeML: 5 }),
      makeRisk({ id: "z4", probability: 0.4, preMitigationCostML: 50_000, preMitigationTimeML: 0 }),
    ];
    const result = runMonteCarloSimulation({ risks, iterations: 500, seed: 456 });
    const s = result.summary;

    assertFiniteNonNegative("p20Cost", s.p20Cost);
    assertFiniteNonNegative("p50Cost", s.p50Cost);
    assertFiniteNonNegative("p80Cost", s.p80Cost);
    assertFiniteNonNegative("p90Cost", s.p90Cost);
    assertFiniteNonNegative("p20Time", s.p20Time);
    assertFiniteNonNegative("p50Time", s.p50Time);
    assertFiniteNonNegative("p80Time", s.p80Time);
    assertFiniteNonNegative("p90Time", s.p90Time);
    assertFiniteNonNegative("meanCost", s.meanCost);
    assertFiniteNonNegative("meanTime", s.meanTime);
    assertFiniteNonNegative("minCost", s.minCost);
    assertFiniteNonNegative("maxCost", s.maxCost);
    assertFiniteNonNegative("minTime", s.minTime);
    assertFiniteNonNegative("maxTime", s.maxTime);
  });

  it("zero risks does not crash and returns zeroed summary", () => {
    const result = runMonteCarloSimulation({ risks: [], iterations: 200, seed: 1 });
    const s = result.summary;

    assertFiniteNonNegative("p20Cost", s.p20Cost);
    assertFiniteNonNegative("p50Cost", s.p50Cost);
    assertFiniteNonNegative("p80Cost", s.p80Cost);
    assertFiniteNonNegative("p90Cost", s.p90Cost);
    assertFiniteNonNegative("p20Time", s.p20Time);
    assertFiniteNonNegative("p50Time", s.p50Time);
    assertFiniteNonNegative("p80Time", s.p80Time);
    assertFiniteNonNegative("p90Time", s.p90Time);
    assertFiniteNonNegative("meanCost", s.meanCost);
    assertFiniteNonNegative("meanTime", s.meanTime);
    assertFiniteNonNegative("minCost", s.minCost);
    assertFiniteNonNegative("maxCost", s.maxCost);
    assertFiniteNonNegative("minTime", s.minTime);
    assertFiniteNonNegative("maxTime", s.maxTime);

    assert(s.p20Cost <= s.p50Cost && s.p50Cost <= s.p80Cost && s.p80Cost <= s.p90Cost, "cost percentiles should be non-decreasing");
    assert(s.p20Time <= s.p50Time && s.p50Time <= s.p80Time && s.p80Time <= s.p90Time, "time percentiles should be non-decreasing");

    if (s.meanCost === 0 && s.meanTime === 0) {
      assert.strictEqual(s.p20Cost, 0);
      assert.strictEqual(s.p50Cost, 0);
      assert.strictEqual(s.p80Cost, 0);
      assert.strictEqual(s.p90Cost, 0);
      assert.strictEqual(s.meanCost, 0);
      assert.strictEqual(s.minCost, 0);
      assert.strictEqual(s.maxCost, 0);
      assert.strictEqual(s.p20Time, 0);
      assert.strictEqual(s.p50Time, 0);
      assert.strictEqual(s.p80Time, 0);
      assert.strictEqual(s.p90Time, 0);
      assert.strictEqual(s.meanTime, 0);
      assert.strictEqual(s.minTime, 0);
      assert.strictEqual(s.maxTime, 0);
    } else {
      assert.strictEqual(s.p20Cost, s.p50Cost, "baseline: cost p20 should equal p50");
      assert.strictEqual(s.p50Cost, s.p80Cost, "baseline: cost p50 should equal p80");
      assert.strictEqual(s.p80Cost, s.p90Cost, "baseline: cost p80 should equal p90");
      assert.strictEqual(s.minCost, s.maxCost, "baseline: cost min should equal max");
      assert.strictEqual(s.meanCost, s.minCost, "baseline: cost mean should equal min");
      assert.strictEqual(s.p20Time, s.p50Time, "baseline: time p20 should equal p50");
      assert.strictEqual(s.p50Time, s.p80Time, "baseline: time p50 should equal p80");
      assert.strictEqual(s.p80Time, s.p90Time, "baseline: time p80 should equal p90");
      assert.strictEqual(s.minTime, s.maxTime, "baseline: time min should equal max");
      assert.strictEqual(s.meanTime, s.minTime, "baseline: time mean should equal min");
    }
  });

  it("100 risks does not crash and returns valid summary", () => {
    const risks: Risk[] = [];
    for (let i = 1; i <= 100; i++) {
      risks.push(
        makeRisk({
          id: `stress-${i}`,
          probability: ((i % 10) + 1) / 10,
          preMitigationCostML: i * 1000,
          preMitigationTimeML: i % 30,
        })
      );
    }
    const result = runMonteCarloSimulation({ risks, iterations: 300, seed: 2 });
    const s = result.summary;

    assertFiniteNonNegative("p20Cost", s.p20Cost);
    assertFiniteNonNegative("p50Cost", s.p50Cost);
    assertFiniteNonNegative("p80Cost", s.p80Cost);
    assertFiniteNonNegative("p90Cost", s.p90Cost);
    assertFiniteNonNegative("p20Time", s.p20Time);
    assertFiniteNonNegative("p50Time", s.p50Time);
    assertFiniteNonNegative("p80Time", s.p80Time);
    assertFiniteNonNegative("p90Time", s.p90Time);
    assertFiniteNonNegative("meanCost", s.meanCost);
    assertFiniteNonNegative("meanTime", s.meanTime);
    assertFiniteNonNegative("minCost", s.minCost);
    assertFiniteNonNegative("maxCost", s.maxCost);
    assertFiniteNonNegative("minTime", s.minTime);
    assertFiniteNonNegative("maxTime", s.maxTime);

    assert(s.p20Cost <= s.p50Cost && s.p50Cost <= s.p80Cost && s.p80Cost <= s.p90Cost, "cost percentiles should be non-decreasing");
    assert(s.p20Time <= s.p50Time && s.p50Time <= s.p80Time && s.p80Time <= s.p90Time, "time percentiles should be non-decreasing");
  });
});
