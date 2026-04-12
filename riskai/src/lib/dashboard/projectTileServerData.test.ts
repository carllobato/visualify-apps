import { describe, it } from "node:test";
import assert from "node:assert";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPortfolioTopRiskConcentrationRows } from "@/lib/dashboard/projectTileServerData";
import type { RiskRow } from "@/types/risk";

type QueryResult<T> = { data: T; error: null };

class FakeQuery<T extends Record<string, unknown>> {
  private readonly filters: Array<(row: T) => boolean> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;

  constructor(private readonly rows: T[]) {}

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run(): QueryResult<T[]> {
    let data = [...this.rows];
    for (const filter of this.filters) data = data.filter(filter);
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      data.sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av === bv) return 0;
        if (av == null) return ascending ? -1 : 1;
        if (bv == null) return ascending ? 1 : -1;
        if (typeof av === "number" && typeof bv === "number") {
          return ascending ? av - bv : bv - av;
        }
        return ascending
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return { data, error: null };
  }
}

class FakeSupabase {
  constructor(
    private readonly tables: Record<string, Record<string, unknown>[]>
  ) {}

  from(table: string): FakeQuery<Record<string, unknown>> {
    return new FakeQuery(this.tables[table] ?? []);
  }
}

const ISO = "2026-01-01T00:00:00.000Z";

function makeRiskRow(overrides: Partial<RiskRow> = {}): RiskRow {
  return {
    id: "risk-1",
    project_id: "project-1",
    risk_number: 44,
    title: "Utility power upgrade delays",
    description: null,
    category: "programme",
    owner: "Owner 1",
    applies_to: "time",
    status: "Open",
    pre_probability: 4,
    pre_cost_min: 0,
    pre_cost_ml: 0,
    pre_cost_max: 0,
    pre_time_min: 30,
    pre_time_ml: 90,
    pre_time_max: 120,
    mitigation_description: null,
    mitigation_cost: 0,
    post_probability: 4,
    post_cost_min: 0,
    post_cost_ml: 0,
    post_cost_max: 0,
    post_time_min: 0,
    post_time_ml: 0,
    post_time_max: 0,
    created_at: ISO,
    updated_at: ISO,
    ...overrides,
  };
}

function makeSupabase(risks: RiskRow[]): SupabaseClient {
  return new FakeSupabase({
    visualify_projects: [{ id: "project-1", name: "Project 1", portfolio_id: "portfolio-1" }],
    visualify_project_settings: [{ project_id: "project-1", currency: "AUD" }],
    riskai_risks: risks,
  }) as unknown as SupabaseClient;
}

describe("loadPortfolioTopRiskConcentrationRows", () => {
  it("does not treat uncapped schedule duration as opportunity without mitigation", async () => {
    const result = await loadPortfolioTopRiskConcentrationRows(
      makeSupabase([makeRiskRow()]),
      "portfolio-1"
    );

    assert.strictEqual(result.scheduleRows.length, 1);
    assert.strictEqual(result.scheduleRows[0]?.exposureDisplay, "24 days");
    assert.strictEqual(result.scheduleRows[0]?.statusDisplay, "Open");
    assert.deepStrictEqual(result.scheduleOpportunityRows, []);
  });

  it("does not report schedule opportunity for already mitigating risks", async () => {
    const mitigatingRisk = makeRiskRow({
      status: "Mitigating",
      mitigation_description: "Accelerate approvals and resequence electrical works",
      post_probability: 2,
      post_time_min: 5,
      post_time_ml: 10,
      post_time_max: 15,
    });

    const result = await loadPortfolioTopRiskConcentrationRows(
      makeSupabase([mitigatingRisk]),
      "portfolio-1"
    );

    assert.strictEqual(result.scheduleRows.length, 1);
    assert.strictEqual(result.scheduleRows[0]?.exposureDisplay, "10 days");
    assert.strictEqual(result.scheduleRows[0]?.statusDisplay, "Mitigating");
    assert.deepStrictEqual(result.scheduleOpportunityRows, []);
  });

  it("reports schedule opportunity for monitoring risks with planned mitigation", async () => {
    const monitoringRisk = makeRiskRow({
      status: "Monitoring",
      mitigation_description: "Accelerate approvals and resequence electrical works",
      post_probability: 2,
      post_time_min: 5,
      post_time_ml: 10,
      post_time_max: 15,
    });

    const result = await loadPortfolioTopRiskConcentrationRows(
      makeSupabase([monitoringRisk]),
      "portfolio-1"
    );

    assert.strictEqual(result.scheduleRows.length, 1);
    assert.strictEqual(result.scheduleRows[0]?.exposureDisplay, "24 days");
    assert.strictEqual(result.scheduleRows[0]?.statusDisplay, "Monitoring");
    assert.strictEqual(result.scheduleOpportunityRows.length, 1);
    assert.strictEqual(result.scheduleOpportunityRows[0]?.exposureDisplay, "20 days");
    assert.strictEqual(result.scheduleOpportunityRows[0]?.statusDisplay, "Monitoring");
  });

  it("groups severity rows by the same current rating shown in the register", async () => {
    const result = await loadPortfolioTopRiskConcentrationRows(
      makeSupabase([
        makeRiskRow({
          id: "risk-open",
          status: "Open",
          pre_probability: 4,
          pre_time_ml: 90,
          post_probability: 1,
          post_time_ml: 0,
        }),
        makeRiskRow({
          id: "risk-monitoring",
          status: "Monitoring",
          pre_probability: 5,
          pre_time_ml: 200,
          post_probability: 2,
          post_time_ml: 7,
          mitigation_description: "Weekly utility coordination",
        }),
        makeRiskRow({
          id: "risk-mitigating",
          status: "Mitigating",
          mitigation_description: "Split the works and accelerate approvals",
          pre_probability: 2,
          pre_time_ml: 7,
          post_probability: 4,
          post_time_ml: 120,
        }),
      ]),
      "portfolio-1"
    );

    assert.deepStrictEqual(result.activeRiskSummaryRows, [
      {
        projectId: "project-1",
        projectName: "Project 1",
        low: 0,
        medium: 0,
        high: 2,
        extreme: 1,
      },
    ]);
  });

  it("flags needs attention using the same current rating logic", async () => {
    const result = await loadPortfolioTopRiskConcentrationRows(
      makeSupabase([
        makeRiskRow({
          id: "risk-open-needs-attention",
          status: "Open",
          owner: "",
          mitigation_description: "",
          pre_probability: 4,
          pre_time_ml: 90,
          post_probability: 1,
          post_time_ml: 0,
        }),
      ]),
      "portfolio-1"
    );

    assert.deepStrictEqual(result.risksRequiringAttentionRows, [
      {
        projectId: "project-1",
        projectName: "Project 1",
        riskId: "risk-open-needs-attention",
        riskTitle: "Utility power upgrade delays",
        rating: "H",
        ownerDisplay: "Unassigned",
        issueLabel: "No owner; no mitigation plan",
      },
    ]);
  });
});
