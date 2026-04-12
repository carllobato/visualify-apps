import { describe, it } from "node:test";
import assert from "node:assert";
import type { Risk } from "@/domain/risk/risk.schema";
import {
  monitoringCostOpportunityExpected,
  monitoringScheduleOpportunityExpected,
  preMitigationScheduleExpectedForOpportunity,
} from "@/lib/opportunityMetrics";

const ISO = "2026-01-01T00:00:00.000Z";

function rating(probability: 1 | 2 | 3 | 4 | 5) {
  return {
    probability,
    consequence: 3 as const,
    score: (probability * 3) as 3 | 6 | 9 | 12 | 15,
    level: "high" as const,
  };
}

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "risk-1",
    title: "Risk 1",
    category: "programme",
    status: "Monitoring",
    mitigation: "Planned mitigation",
    inherentRating: rating(4),
    residualRating: rating(2),
    preMitigationCostML: 100,
    preMitigationTimeML: 90,
    postMitigationCostML: 50,
    postMitigationTimeML: 10,
    appliesTo: "both",
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

describe("opportunityMetrics", () => {
  it("caps pre-mitigation schedule opportunity basis at 30 days", () => {
    const value = preMitigationScheduleExpectedForOpportunity(makeRisk());
    assert.strictEqual(value, 24);
  });

  it("only returns schedule opportunity for monitoring risks", () => {
    const monitoring = monitoringScheduleOpportunityExpected(makeRisk());
    const mitigating = monitoringScheduleOpportunityExpected(makeRisk({ status: "Mitigating" }));

    assert.strictEqual(monitoring, 20);
    assert.strictEqual(mitigating, null);
  });

  it("requires a mitigation plan for opportunity calculations", () => {
    const noPlan = makeRisk({ mitigation: undefined });

    assert.strictEqual(monitoringCostOpportunityExpected(noPlan), null);
    assert.strictEqual(monitoringScheduleOpportunityExpected(noPlan), null);
  });
});
