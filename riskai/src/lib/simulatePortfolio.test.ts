/**
 * Regression: legacy simulatePortfolio uses getEffectiveRiskInputs as sole input authority.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import type { Risk } from "@/domain/risk/risk.schema";
import { buildSimulationInputAuditRows } from "@/lib/runDataSimulationInputAudit";
import { simulatePortfolio } from "@/lib/simulatePortfolio";

const ISO = "2026-01-01T00:00:00.000Z";

function rating(probability: 1 | 2 | 3 | 4 | 5, consequence: 1 | 2 | 3 | 4 | 5 = 3) {
  return {
    probability,
    consequence,
    score: (probability * consequence) as 3 | 6 | 9 | 12 | 15 | 4 | 8 | 10 | 16 | 20 | 5 | 25,
    level: "high" as const,
  };
}

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    title: "Risk",
    category: "programme",
    status: "Open",
    inherentRating: rating(5),
    residualRating: rating(2),
    preMitigationCostML: 100_000,
    postMitigationCostML: 40_000,
    preMitigationTimeML: 20,
    postMitigationTimeML: 5,
    preMitigationProbabilityPct: 100,
    postMitigationProbabilityPct: 40,
    appliesTo: "both",
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

describe("simulatePortfolio effective inputs", () => {
  it("Open and Monitoring use pre probability and impacts", () => {
    const open = simulatePortfolio(
      [
        makeRisk({
          id: "open",
          status: "Open",
          mitigation: "legacy text must not switch to post",
          preMitigationProbabilityPct: 60,
          postMitigationProbabilityPct: 20,
          preMitigationCostML: 100_000,
          postMitigationCostML: 40_000,
          preMitigationTimeML: 20,
          postMitigationTimeML: 5,
        }),
      ],
      1,
      { costSpreadPct: 0 }
    );
    assert.strictEqual(open.risks.length, 1);
    assert.strictEqual(open.risks[0].expectedCost, 0.6 * 100_000);
    assert.strictEqual(open.risks[0].expectedDays, 0.6 * 20);

    const monitoring = simulatePortfolio(
      [
        makeRisk({
          id: "mon",
          status: "Monitoring",
          preMitigationProbabilityPct: 50,
          postMitigationProbabilityPct: 25,
          preMitigationCostML: 80_000,
          postMitigationCostML: 30_000,
          preMitigationTimeML: 15,
          postMitigationTimeML: 4,
        }),
      ],
      1,
      { costSpreadPct: 0 }
    );
    assert.strictEqual(monitoring.risks[0].expectedCost, 0.5 * 80_000);
    assert.strictEqual(monitoring.risks[0].expectedDays, 0.5 * 15);
  });

  it("Mitigating uses post probability and impacts", () => {
    const snap = simulatePortfolio(
      [
        makeRisk({
          id: "mit",
          status: "Mitigating",
          preMitigationProbabilityPct: 100,
          postMitigationProbabilityPct: 40,
          preMitigationCostML: 100_000,
          postMitigationCostML: 40_000,
          postMitigationTimeML: 5,
        }),
      ],
      1,
      { costSpreadPct: 0 }
    );
    assert.strictEqual(snap.risks[0].expectedCost, 0.4 * 40_000);
    assert.strictEqual(snap.risks[0].expectedDays, 0.4 * 5);
  });

  it("incomplete Mitigating is excluded and flagged by the audit", () => {
    const risk = makeRisk({
      id: "mit-gap",
      status: "Mitigating",
      preMitigationCostML: 100_000,
      postMitigationCostML: undefined,
      postMitigationTimeML: 5,
      appliesTo: "both",
    });
    const snap = simulatePortfolio([risk], 1, { costSpreadPct: 0 });
    assert.strictEqual(snap.risks.length, 0);
    assert.strictEqual(snap.totalExpectedCost, 0);

    const audit = buildSimulationInputAuditRows([risk], null);
    assert.strictEqual(audit.length, 1);
    assert.strictEqual(audit[0].flags.postDataIncomplete, true);
    assert.strictEqual(audit[0].included, false);
  });

  it("Draft, Closed and Archived are excluded", () => {
    const snap = simulatePortfolio(
      [
        makeRisk({ id: "open", status: "Open", preMitigationProbabilityPct: 100, preMitigationCostML: 50_000 }),
        makeRisk({ id: "draft", status: "Draft", preMitigationCostML: 999_000 }),
        makeRisk({ id: "closed", status: "Closed", preMitigationCostML: 999_000 }),
        makeRisk({ id: "archived", status: "Archived", preMitigationCostML: 999_000 }),
      ],
      1,
      { costSpreadPct: 0 }
    );
    assert.strictEqual(snap.risks.length, 1);
    assert.strictEqual(snap.risks[0].id, "open");
    assert.strictEqual(snap.risks[0].expectedCost, 50_000);
  });

  it("mitigation text cannot override canonical lifecycle for Open", () => {
    const snap = simulatePortfolio(
      [
        makeRisk({
          id: "open-text",
          status: "Open",
          mitigation: "Active mitigation narrative",
          mitigationProfile: {
            status: "active",
            effectiveness: 0.9,
            confidence: 0.9,
            reduces: 0.9,
            lagMonths: 0,
          },
          preMitigationProbabilityPct: 80,
          postMitigationProbabilityPct: 10,
          preMitigationCostML: 200_000,
          postMitigationCostML: 10_000,
          preMitigationTimeML: 12,
          postMitigationTimeML: 1,
        }),
      ],
      1,
      { costSpreadPct: 0 }
    );
    assert.strictEqual(snap.risks[0].expectedCost, 0.8 * 200_000);
    assert.strictEqual(snap.risks[0].expectedDays, 0.8 * 12);
  });

  it("schedule-only and cost-only risks retain legitimate zero values", () => {
    const timeOnly = simulatePortfolio(
      [
        makeRisk({
          id: "time-only",
          status: "Mitigating",
          appliesTo: "time",
          preMitigationCostML: 100_000,
          postMitigationCostML: undefined,
          postMitigationProbabilityPct: 100,
          postMitigationTimeML: 8,
        }),
      ],
      1,
      { costSpreadPct: 0 }
    );
    assert.strictEqual(timeOnly.risks.length, 1);
    assert.strictEqual(timeOnly.risks[0].expectedCost, 0);
    assert.strictEqual(timeOnly.risks[0].expectedDays, 8);

    const costOnly = simulatePortfolio(
      [
        makeRisk({
          id: "cost-only",
          status: "Mitigating",
          appliesTo: "cost",
          preMitigationTimeML: 20,
          postMitigationProbabilityPct: 100,
          postMitigationCostML: 25_000,
          postMitigationTimeML: undefined,
        }),
      ],
      1,
      { costSpreadPct: 0 }
    );
    assert.strictEqual(costOnly.risks.length, 1);
    assert.strictEqual(costOnly.risks[0].expectedCost, 25_000);
    assert.strictEqual(costOnly.risks[0].expectedDays, 0);
  });
});
