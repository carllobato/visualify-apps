import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Risk } from "@/domain/risk/risk.schema";
import { buildRating } from "@/domain/risk/risk.logic";
import type { RiskRow } from "@/types/risk";
import {
  LEGACY_PRE_PROBABILITY_PCT_BACKFILL,
  RISK_DB_SELECT_COLUMNS,
  mapRiskRowToDomain,
  mapRiskToRow,
  normalizeRiskRow,
  parseNullableNumber,
} from "./risks";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const RISK_ID = "22222222-2222-4222-8222-222222222222";
const ISO = "2026-08-20T00:00:00.000Z";

function baseDomainRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: RISK_ID,
    riskNumber: 1,
    title: "Draft risk",
    category: "",
    status: "Draft",
    inherentRating: buildRating(1, 1),
    residualRating: buildRating(1, 1),
    createdAt: ISO,
    updatedAt: ISO,
    scoreHistory: [],
    ...overrides,
  };
}

function roundTrip(risk: Risk): Risk {
  const row = mapRiskToRow(risk, PROJECT_ID);
  const normalized = normalizeRiskRow(row, PROJECT_ID);
  assert.ok(normalized, "normalizeRiskRow should accept mapper output");
  return mapRiskRowToDomain(normalized as RiskRow);
}

describe("parseNullableNumber", () => {
  it("preserves explicit 0 and maps blank/null/invalid to null", () => {
    assert.equal(parseNullableNumber(0), 0);
    assert.equal(parseNullableNumber("0"), 0);
    assert.equal(parseNullableNumber(null), null);
    assert.equal(parseNullableNumber(undefined), null);
    assert.equal(parseNullableNumber(""), null);
    assert.equal(parseNullableNumber("  "), null);
    assert.equal(parseNullableNumber("x"), null);
    assert.equal(parseNullableNumber(Number.NaN), null);
  });
});

describe("null vs zero risk persistence", () => {
  it("null survives save/reload as null (undefined on domain)", () => {
    const saved = roundTrip(
      baseDomainRisk({
        preMitigationProbabilityPct: undefined,
        preMitigationCostML: undefined,
        preMitigationTimeML: undefined,
        mitigationCost: undefined,
        postMitigationProbabilityPct: undefined,
        postMitigationCostML: undefined,
        postMitigationTimeML: undefined,
      })
    );

    assert.equal(saved.preMitigationProbabilityPct, undefined);
    assert.equal(saved.preMitigationCostML, undefined);
    assert.equal(saved.preMitigationTimeML, undefined);
    assert.equal(saved.mitigationCost, undefined);
    assert.equal(saved.postMitigationProbabilityPct, undefined);
    assert.equal(saved.postMitigationCostML, undefined);
    assert.equal(saved.postMitigationTimeML, undefined);

    const row = mapRiskToRow(
      baseDomainRisk({
        preMitigationCostML: undefined,
        mitigationCost: undefined,
      }),
      PROJECT_ID
    );
    assert.equal(row.pre_cost_ml, null);
    assert.equal(row.mitigation_cost, null);
    assert.equal(row.pre_probability, null);
    assert.equal(row.pre_probability_pct, null);
  });

  it("explicit 0 survives save/reload as 0", () => {
    const saved = roundTrip(
      baseDomainRisk({
        preMitigationProbabilityPct: 0,
        preMitigationCostML: 0,
        preMitigationTimeML: 0,
        preMitigationCostMin: 0,
        preMitigationTimeMin: 0,
        mitigation: "Fence temporary works",
        mitigationCost: 0,
        postMitigationProbabilityPct: 0,
        postMitigationCostML: 0,
        postMitigationTimeML: 0,
      })
    );

    assert.equal(saved.preMitigationProbabilityPct, 0);
    assert.equal(saved.preMitigationCostML, 0);
    assert.equal(saved.preMitigationTimeML, 0);
    assert.equal(saved.preMitigationCostMin, 0);
    assert.equal(saved.mitigationCost, 0);
    assert.equal(saved.postMitigationProbabilityPct, 0);
    assert.equal(saved.postMitigationCostML, 0);
    assert.equal(saved.postMitigationTimeML, 0);

    const row = mapRiskToRow(
      baseDomainRisk({
        preMitigationProbabilityPct: 0,
        mitigation: "Fence temporary works",
        mitigationCost: 0,
      }),
      PROJECT_ID
    );
    assert.equal(row.pre_probability_pct, 0);
    assert.equal(row.pre_probability, 1);
    assert.equal(row.mitigation_cost, 0);
  });

  it("missing mitigation cost is distinct from $0", () => {
    const missingCost = roundTrip(
      baseDomainRisk({
        mitigation: "Install monitoring",
        mitigationCost: undefined,
      })
    );
    const zeroCost = roundTrip(
      baseDomainRisk({
        mitigation: "Install monitoring",
        mitigationCost: 0,
      })
    );

    assert.equal(missingCost.mitigationCost, undefined);
    assert.equal(zeroCost.mitigationCost, 0);

    const missingRow = mapRiskToRow(
      baseDomainRisk({ mitigation: "Install monitoring", mitigationCost: undefined }),
      PROJECT_ID
    );
    const zeroRow = mapRiskToRow(
      baseDomainRisk({ mitigation: "Install monitoring", mitigationCost: 0 }),
      PROJECT_ID
    );
    assert.equal(missingRow.mitigation_cost, null);
    assert.equal(zeroRow.mitigation_cost, 0);
  });

  it("blank post values remain null", () => {
    const row = mapRiskToRow(
      baseDomainRisk({
        mitigation: "Planned mitigation",
        preMitigationProbabilityPct: 40,
        postMitigationProbabilityPct: undefined,
        postMitigationCostML: undefined,
        postMitigationTimeML: undefined,
        postMitigationCostMin: undefined,
        postMitigationCostMax: undefined,
        postMitigationTimeMin: undefined,
        postMitigationTimeMax: undefined,
      }),
      PROJECT_ID
    );

    assert.equal(row.post_probability_pct, null);
    assert.equal(row.post_probability, null);
    assert.equal(row.post_cost_ml, null);
    assert.equal(row.post_time_ml, null);
    assert.equal(row.post_cost_min, null);
    assert.equal(row.post_cost_max, null);
    assert.equal(row.post_time_min, null);
    assert.equal(row.post_time_max, null);

    const saved = mapRiskRowToDomain(normalizeRiskRow(row, PROJECT_ID)!);
    assert.equal(saved.postMitigationProbabilityPct, undefined);
    assert.equal(saved.postMitigationCostML, undefined);
    assert.equal(saved.postMitigationTimeML, undefined);
  });

  it("blank Draft fields can persist without inventing scores or zeros", () => {
    const draft = baseDomainRisk({
      title: "Incomplete draft",
      status: "Draft",
      category: "",
      preMitigationProbabilityPct: undefined,
      preMitigationCostMin: undefined,
      preMitigationCostML: undefined,
      preMitigationCostMax: undefined,
      preMitigationTimeMin: undefined,
      preMitigationTimeML: undefined,
      preMitigationTimeMax: undefined,
      mitigation: undefined,
      mitigationCost: undefined,
      postMitigationProbabilityPct: undefined,
      postMitigationCostML: undefined,
      postMitigationTimeML: undefined,
    });

    const row = mapRiskToRow(draft, PROJECT_ID);
    assert.equal(row.status, "Draft");
    assert.equal(row.pre_probability, null);
    assert.equal(row.pre_probability_pct, null);
    assert.equal(row.pre_cost_ml, null);
    assert.equal(row.pre_time_ml, null);
    assert.equal(row.mitigation_cost, null);
    assert.equal(row.post_probability, null);
    assert.equal(row.post_probability_pct, null);

    const saved = roundTrip(draft);
    assert.equal(saved.preMitigationProbabilityPct, undefined);
    assert.equal(saved.preMitigationCostML, undefined);
    assert.equal(saved.preMitigationTimeML, undefined);
    assert.equal(saved.mitigationCost, undefined);
  });

  it("pre_probability_pct backfill mapping matches migration CASE (1→10 … 5→90)", () => {
    assert.deepEqual(LEGACY_PRE_PROBABILITY_PCT_BACKFILL, {
      1: 10,
      2: 30,
      3: 50,
      4: 70,
      5: 90,
    });
    for (const score of [1, 2, 3, 4, 5] as const) {
      assert.equal(LEGACY_PRE_PROBABILITY_PCT_BACKFILL[score], score * 20 - 10);
    }
  });

  it("does not introduce Impact % fields", () => {
    const columns = RISK_DB_SELECT_COLUMNS.split(",");
    assert.ok(!columns.some((c) => /impact.*pct|pct.*impact/i.test(c)));
    assert.ok(!columns.includes("pre_impact_pct"));
    assert.ok(!columns.includes("post_impact_pct"));
    assert.ok(!columns.includes("impact_pct"));

    const row = mapRiskToRow(baseDomainRisk({ preMitigationProbabilityPct: 40 }), PROJECT_ID);
    const keys = Object.keys(row);
    assert.ok(!keys.some((k) => /impact.*pct|pct.*impact/i.test(k)));
  });

  it("derives legacy 1–5 scores from supplied percentage only", () => {
    const withPct = mapRiskToRow(baseDomainRisk({ preMitigationProbabilityPct: 70 }), PROJECT_ID);
    assert.equal(withPct.pre_probability_pct, 70);
    assert.equal(withPct.pre_probability, 4);

    const withoutPct = mapRiskToRow(baseDomainRisk({ preMitigationProbabilityPct: undefined }), PROJECT_ID);
    assert.equal(withoutPct.pre_probability_pct, null);
    assert.equal(withoutPct.pre_probability, null);
  });

  it("normalizeRiskRow preserves null and does not coerce to 0", () => {
    const normalized = normalizeRiskRow(
      {
        id: RISK_ID,
        title: "Normalize nulls",
        category: "programme",
        status: "Draft",
        created_at: ISO,
        updated_at: ISO,
        pre_probability: null,
        pre_probability_pct: null,
        pre_cost_ml: null,
        pre_time_ml: null,
        mitigation_cost: null,
        post_probability: null,
        post_probability_pct: null,
        post_cost_ml: null,
        post_time_ml: null,
      },
      PROJECT_ID
    );
    assert.ok(normalized);
    assert.equal(normalized.pre_probability, null);
    assert.equal(normalized.pre_cost_ml, null);
    assert.equal(normalized.mitigation_cost, null);
    assert.equal(normalized.post_cost_ml, null);

    const withZero = normalizeRiskRow(
      {
        id: RISK_ID,
        title: "Normalize zeros",
        category: "programme",
        status: "Open",
        created_at: ISO,
        updated_at: ISO,
        pre_probability_pct: 0,
        pre_cost_ml: 0,
        mitigation_description: "Done",
        mitigation_cost: 0,
        post_probability_pct: 0,
        post_cost_ml: 0,
      },
      PROJECT_ID
    );
    assert.ok(withZero);
    assert.equal(withZero.pre_probability_pct, 0);
    assert.equal(withZero.pre_cost_ml, 0);
    assert.equal(withZero.mitigation_cost, 0);
    assert.equal(withZero.post_cost_ml, 0);
  });
});
