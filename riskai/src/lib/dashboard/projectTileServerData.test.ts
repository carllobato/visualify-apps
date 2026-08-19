import { describe, it } from "node:test";
import assert from "node:assert";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyStaleReportingLockRag,
  computeRag,
  getProjectTilePayloads,
  loadPortfolioProjectContingencyTable,
  loadPortfolioProjectRiskSeveritySummary,
  loadPortfolioProjectTilePayloads,
  loadPortfolioTopRiskConcentrationRows,
  loadProjectContingencyTable,
  loadProjectRiskSeveritySummary,
  loadProjectTilePayloads,
  loadTopRiskConcentrationRows,
  REPORTING_LOCK_STALE_MS,
} from "@/lib/dashboard/projectTileServerData";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";
import type { RiskRow } from "@/types/risk";

type QueryResult<T> = { data: T; error: null };

class FakeQuery<T extends Record<string, unknown>> {
  private readonly filters: Array<(row: T) => boolean> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private readonly rows: T[];

  constructor(rows: T[]) {
    this.rows = rows;
  }

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push((row) => {
      if (value === null) return row[column] == null;
      return row[column] === value;
    });
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
  private readonly tables: Record<string, Record<string, unknown>[]>;

  constructor(tables: Record<string, Record<string, unknown>[]>) {
    this.tables = tables;
  }

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
    riskai_risks: risks,
    riskai_simulation_snapshots: [],
  }) as unknown as SupabaseClient;
}

describe("loadPortfolioTopRiskConcentrationRows", () => {
  it("does not treat uncapped schedule duration as opportunity without mitigation", async () => {
    const result = await loadPortfolioTopRiskConcentrationRows(
      makeSupabase([makeRiskRow()]),
      "portfolio-1"
    );

    assert.strictEqual(result.scheduleRows.length, 1);
    assert.strictEqual(result.scheduleRows[0]?.exposureDisplay, "24 working days");
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
    assert.strictEqual(result.scheduleRows[0]?.exposureDisplay, "4 working days");
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
    assert.strictEqual(result.scheduleRows[0]?.exposureDisplay, "12 working days");
    assert.strictEqual(result.scheduleRows[0]?.statusDisplay, "Monitoring");
    assert.strictEqual(result.scheduleOpportunityRows.length, 1);
    assert.strictEqual(result.scheduleOpportunityRows[0]?.exposureDisplay, "20 working days");
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
    assert.strictEqual(result.needsAttentionHealthRun.registerGapCount, 1);
    assert.strictEqual(result.needsAttentionHealthRun.staleSimulationProjectCount, 1);
    assert.strictEqual(result.needsAttentionHealthRun.projectsWithActiveRisksCount, 1);
  });
});

describe("loadPortfolioProjectTilePayloads", () => {
  it("can include portfolio projects without locked reporting snapshots", async () => {
    const supabase = new FakeSupabase({
      visualify_projects: [
        {
          id: "project-with-lock",
          name: "Alpha",
          portfolio_id: "portfolio-1",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "project-without-lock",
          name: "Beta",
          portfolio_id: "portfolio-1",
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      riskai_risks: [],
      riskai_simulation_snapshots: [
        {
          project_id: "project-with-lock",
          locked_for_reporting: true,
          locked_at: "2026-01-03T00:00:00.000Z",
          created_at: "2026-01-03T00:00:00.000Z",
        },
      ],
    }) as unknown as SupabaseClient;

    const defaultResult = await loadPortfolioProjectTilePayloads(supabase, "portfolio-1");
    assert.deepStrictEqual(defaultResult.projectTilePayloads.map((p) => p.id), ["project-with-lock"]);

    const allProjectsResult = await loadPortfolioProjectTilePayloads(supabase, "portfolio-1", {
      onlyProjectsWithLockedReporting: false,
    });
    assert.deepStrictEqual(allProjectsResult.projectTilePayloads.map((p) => p.id), [
      "project-with-lock",
      "project-without-lock",
    ]);
    assert.strictEqual(allProjectsResult.totalProjectsInPortfolio, 2);
  });
});

describe("computeRag + reporting lock staleness", () => {
  it("treats active risks without a locked reporting run as amber", () => {
    assert.strictEqual(
      computeRag({
        riskCount: 2,
        highSeverityCount: 0,
        lastLockedReportingAt: null,
      }),
      "amber"
    );
  });

  it("is green when there is a recent locked run and no high severity", () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    assert.strictEqual(
      computeRag({
        riskCount: 1,
        highSeverityCount: 0,
        lastLockedReportingAt: recent,
      }),
      "green"
    );
  });

  it("bumps green to amber when the locked reporting snapshot is older than 30 days", () => {
    const staleIso = new Date(Date.now() - (REPORTING_LOCK_STALE_MS + 60_000)).toISOString();
    assert.strictEqual(
      applyStaleReportingLockRag("green", { locked_at: staleIso } as SimulationSnapshotRow, Date.now()),
      "amber"
    );
  });

  it("preserves red when the lock is stale", () => {
    const staleIso = new Date(Date.now() - (REPORTING_LOCK_STALE_MS + 60_000)).toISOString();
    assert.strictEqual(
      applyStaleReportingLockRag("red", { locked_at: staleIso } as SimulationSnapshotRow, Date.now()),
      "red"
    );
  });
});

const PORTFOLIO_PROJECT = {
  id: "project-1",
  name: "Project 1",
  created_at: "2026-01-01T00:00:00.000Z",
  portfolio_id: "portfolio-1",
};
const UNLINKED_PROJECT = {
  id: "project-unlinked",
  name: "Unlinked Project",
  created_at: "2026-01-04T00:00:00.000Z",
  portfolio_id: null,
};
const ARCHIVED_PORTFOLIO_PROJECT = {
  id: "project-archived",
  name: "Archived Project",
  created_at: "2026-01-02T00:00:00.000Z",
  portfolio_id: "portfolio-1",
  archived_at: "2026-08-01T00:00:00.000Z",
};

function makeMixedScopeSupabase(extra?: {
  risks?: RiskRow[];
  projects?: Record<string, unknown>[];
  snapshots?: Record<string, unknown>[];
}): SupabaseClient {
  return new FakeSupabase({
    visualify_projects: extra?.projects ?? [PORTFOLIO_PROJECT, UNLINKED_PROJECT, ARCHIVED_PORTFOLIO_PROJECT],
    riskai_risks: extra?.risks ?? [
      makeRiskRow({ id: "risk-portfolio", project_id: PORTFOLIO_PROJECT.id }),
      makeRiskRow({
        id: "risk-unlinked",
        project_id: UNLINKED_PROJECT.id,
        title: "Unlinked schedule risk",
      }),
    ],
    riskai_simulation_snapshots: extra?.snapshots ?? [],
  }) as unknown as SupabaseClient;
}

describe("project-list overview loaders", () => {
  it("loadTopRiskConcentrationRows includes explicit projects that the portfolio wrapper omits", async () => {
    const supabase = makeMixedScopeSupabase();

    const portfolioResult = await loadPortfolioTopRiskConcentrationRows(supabase, "portfolio-1");
    assert.deepStrictEqual(
      portfolioResult.activeRiskSummaryRows.map((r) => r.projectId),
      [PORTFOLIO_PROJECT.id]
    );
    assert.strictEqual(portfolioResult.scheduleRows.length, 1);
    assert.strictEqual(portfolioResult.scheduleRows[0]?.projectId, PORTFOLIO_PROJECT.id);

    const explicitResult = await loadTopRiskConcentrationRows(supabase, [
      { id: PORTFOLIO_PROJECT.id, name: PORTFOLIO_PROJECT.name },
      { id: UNLINKED_PROJECT.id, name: UNLINKED_PROJECT.name },
    ]);
    assert.deepStrictEqual(
      explicitResult.activeRiskSummaryRows.map((r) => r.projectId),
      [PORTFOLIO_PROJECT.id, UNLINKED_PROJECT.id]
    );
    assert.strictEqual(explicitResult.scheduleRows.length, 2);
  });

  it("loadPortfolioTopRiskConcentrationRows matches loadTopRiskConcentrationRows for the same portfolio projects", async () => {
    const supabase = makeSupabase([makeRiskRow()]);
    const fromPortfolio = await loadPortfolioTopRiskConcentrationRows(supabase, "portfolio-1");
    const fromProjects = await loadTopRiskConcentrationRows(supabase, [
      { id: "project-1", name: "Project 1" },
    ]);
    assert.deepStrictEqual(fromProjects, fromPortfolio);
  });

  it("loadProjectContingencyTable includes explicit projects that the portfolio wrapper omits", async () => {
    const supabase = makeMixedScopeSupabase({
      projects: [
        {
          ...PORTFOLIO_PROJECT,
          project_contingency: 1_500_000,
          project_currency: "AUD",
          project_schedule_contingency_working_days: 8,
        },
        {
          ...UNLINKED_PROJECT,
          project_contingency: 2_000_000,
          project_currency: "USD",
          project_schedule_contingency_working_days: 12,
        },
        ARCHIVED_PORTFOLIO_PROJECT,
      ],
    });

    const portfolioRows = await loadPortfolioProjectContingencyTable(supabase, "portfolio-1");
    assert.deepStrictEqual(
      portfolioRows.map((r) => r.projectId),
      [PORTFOLIO_PROJECT.id]
    );
    assert.strictEqual(portfolioRows[0]?.contingencyAmountAbs, 1_500_000);
    assert.strictEqual(portfolioRows[0]?.scheduleContingencyWorkingDays, 8);

    const explicitRows = await loadProjectContingencyTable(supabase, [
      { id: PORTFOLIO_PROJECT.id, name: PORTFOLIO_PROJECT.name },
      { id: UNLINKED_PROJECT.id, name: UNLINKED_PROJECT.name },
    ]);
    assert.deepStrictEqual(
      explicitRows.map((r) => ({ projectId: r.projectId, contingencyAmountAbs: r.contingencyAmountAbs })),
      [
        { projectId: PORTFOLIO_PROJECT.id, contingencyAmountAbs: 1_500_000 },
        { projectId: UNLINKED_PROJECT.id, contingencyAmountAbs: 2_000_000 },
      ]
    );
  });

  it("loadPortfolioProjectContingencyTable matches loadProjectContingencyTable for the same portfolio projects", async () => {
    const supabase = makeMixedScopeSupabase({
      projects: [
        {
          ...PORTFOLIO_PROJECT,
          project_contingency: 1_500_000,
          project_currency: "AUD",
          project_schedule_contingency_working_days: 8,
        },
        UNLINKED_PROJECT,
        ARCHIVED_PORTFOLIO_PROJECT,
      ],
    });
    const fromPortfolio = await loadPortfolioProjectContingencyTable(supabase, "portfolio-1");
    const fromProjects = await loadProjectContingencyTable(supabase, [
      { id: PORTFOLIO_PROJECT.id, name: PORTFOLIO_PROJECT.name },
    ]);
    assert.deepStrictEqual(fromProjects, fromPortfolio);
  });

  it("loadProjectRiskSeveritySummary includes explicit projects that the portfolio wrapper omits", async () => {
    const supabase = makeMixedScopeSupabase();
    const portfolioRows = await loadPortfolioProjectRiskSeveritySummary(supabase, "portfolio-1");
    assert.deepStrictEqual(
      portfolioRows.map((r) => r.projectId),
      [PORTFOLIO_PROJECT.id]
    );

    const explicitRows = await loadProjectRiskSeveritySummary(supabase, [
      { id: PORTFOLIO_PROJECT.id, name: PORTFOLIO_PROJECT.name },
      { id: UNLINKED_PROJECT.id, name: UNLINKED_PROJECT.name },
    ]);
    assert.deepStrictEqual(
      explicitRows.map((r) => r.projectId),
      [PORTFOLIO_PROJECT.id, UNLINKED_PROJECT.id]
    );
  });

  it("loadProjectTilePayloads includes explicit projects that the portfolio wrapper omits", async () => {
    const supabase = makeMixedScopeSupabase({
      snapshots: [
        {
          project_id: PORTFOLIO_PROJECT.id,
          locked_for_reporting: true,
          locked_at: "2026-01-03T00:00:00.000Z",
          created_at: "2026-01-03T00:00:00.000Z",
        },
        {
          project_id: UNLINKED_PROJECT.id,
          locked_for_reporting: true,
          locked_at: "2026-01-05T00:00:00.000Z",
          created_at: "2026-01-05T00:00:00.000Z",
        },
      ],
    });

    const portfolioResult = await loadPortfolioProjectTilePayloads(supabase, "portfolio-1");
    assert.deepStrictEqual(
      portfolioResult.projectTilePayloads.map((p) => p.id),
      [PORTFOLIO_PROJECT.id]
    );
    assert.strictEqual(portfolioResult.totalProjectsInPortfolio, 1);

    const explicitResult = await loadProjectTilePayloads(supabase, [
      {
        id: PORTFOLIO_PROJECT.id,
        name: PORTFOLIO_PROJECT.name,
        created_at: PORTFOLIO_PROJECT.created_at,
      },
      {
        id: UNLINKED_PROJECT.id,
        name: UNLINKED_PROJECT.name,
        created_at: UNLINKED_PROJECT.created_at,
      },
    ]);
    assert.deepStrictEqual(
      explicitResult.projectTilePayloads.map((p) => p.id),
      [PORTFOLIO_PROJECT.id, UNLINKED_PROJECT.id]
    );
    assert.strictEqual(explicitResult.totalProjectsInPortfolio, 2);
  });

  it("loadPortfolioProjectTilePayloads matches loadProjectTilePayloads for the same portfolio projects", async () => {
    const supabase = new FakeSupabase({
      visualify_projects: [PORTFOLIO_PROJECT],
      riskai_risks: [],
      riskai_simulation_snapshots: [
        {
          project_id: PORTFOLIO_PROJECT.id,
          locked_for_reporting: true,
          locked_at: "2026-01-03T00:00:00.000Z",
          created_at: "2026-01-03T00:00:00.000Z",
        },
      ],
    }) as unknown as SupabaseClient;

    const fromPortfolio = await loadPortfolioProjectTilePayloads(supabase, "portfolio-1");
    const fromProjects = await loadProjectTilePayloads(supabase, [
      {
        id: PORTFOLIO_PROJECT.id,
        name: PORTFOLIO_PROJECT.name,
        created_at: PORTFOLIO_PROJECT.created_at,
      },
    ]);
    assert.deepStrictEqual(fromProjects, fromPortfolio);
  });

  it("loadPortfolioProjectTilePayloads excludes archived Projects", async () => {
    const result = await loadPortfolioProjectTilePayloads(makeMixedScopeSupabase(), "portfolio-1", {
      onlyProjectsWithLockedReporting: false,
    });
    assert.equal(
      result.projectTilePayloads.some((p) => p.id === ARCHIVED_PORTFOLIO_PROJECT.id),
      false,
    );
    assert.equal(result.totalProjectsInPortfolio, 1);
  });
});

const CANONICAL_EQUIVALENT_TILE = {
  id: "project-1",
  name: "Project 1",
  portfolio_id: "portfolio-1",
  project_value: 300000000,
  project_contingency: 80000000,
  project_schedule_contingency_working_days: 80,
  project_working_days_per_week: 5,
  project_risk_appetite: "P80",
  project_currency: "AUD",
} as const;

function lockedSnapshotWithLinearCdfs(projectId = "project-1"): Record<string, unknown> {
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
    project_id: projectId,
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

function makeTileSupabase(extra?: {
  projects?: Record<string, unknown>[];
  snapshots?: Record<string, unknown>[];
}): SupabaseClient {
  return new FakeSupabase({
    visualify_projects: extra?.projects ?? [{ ...CANONICAL_EQUIVALENT_TILE }],
    riskai_risks: [],
    riskai_simulation_snapshots: extra?.snapshots ?? [lockedSnapshotWithLinearCdfs()],
  }) as unknown as SupabaseClient;
}

const TILE_PROJECT = { id: "project-1", name: "Project 1", created_at: ISO };

describe("Workspace Overview canonical-only Project parameters", () => {
  it("works with canonical data and no settings row on tiles", async () => {
    const result = await getProjectTilePayloads(makeTileSupabase(), [TILE_PROJECT]);

    assert.equal(result.projectTilePayloads[0]?.reportingCostStatus, "On track");
    assert.equal(result.projectTilePayloads[0]?.reportingOverallStatus, "On Track");
  });

  it("uses canonical contingency on tiles and ignores settings-only data", async () => {
    const fromCanonical = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ ...CANONICAL_EQUIVALENT_TILE, project_contingency: 20_000_000 }],
      }),
      [TILE_PROJECT],
    );
    const fromBaseline = await getProjectTilePayloads(makeTileSupabase(), [TILE_PROJECT]);

    assert.equal(fromBaseline.projectTilePayloads[0]?.reportingCostStatus, "On track");
    assert.equal(fromCanonical.projectTilePayloads[0]?.reportingCostStatus, "Off track");
  });

  it("treats canonical numeric 0 as present contingency on tiles", async () => {
    const fromCanonicalZero = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ ...CANONICAL_EQUIVALENT_TILE, project_contingency: 0 }],
      }),
      [TILE_PROJECT],
    );
    const fromBaseline = await getProjectTilePayloads(makeTileSupabase(), [TILE_PROJECT]);

    assert.equal(fromBaseline.projectTilePayloads[0]?.reportingCostStatus, "On track");
    assert.equal(fromCanonicalZero.projectTilePayloads[0]?.reportingCostStatus, "—");
  });

  it("stays incomplete when canonical values are null even if settings existed historically", async () => {
    const fromNullCanonical = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [
          {
            id: "project-1",
            name: "Project 1",
            project_contingency: null,
            project_value: null,
            project_schedule_contingency_working_days: null,
            project_risk_appetite: null,
            project_currency: null,
          },
        ],
      }),
      [TILE_PROJECT],
    );

    assert.equal(fromNullCanonical.projectTilePayloads[0]?.reportingOverallStatus, undefined);
    assert.equal(fromNullCanonical.portfolioReportingFooter, null);
  });

  it("does not scale canonical financial values on tiles", async () => {
    const canonicalThirty = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ ...CANONICAL_EQUIVALENT_TILE, project_contingency: 30_000_000 }],
      }),
      [TILE_PROJECT],
    );

    assert.equal(canonicalThirty.projectTilePayloads[0]?.reportingCostStatus, "Off track");
    assert.ok((canonicalThirty.projectTilePayloads[0]?.reportingCostShortfallAbs ?? 0) > 40_000_000);
  });

  it("treats canonical schedule contingency as working days on tiles", async () => {
    const canonicalDays = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ ...CANONICAL_EQUIVALENT_TILE, project_schedule_contingency_working_days: 20 }],
      }),
      [TILE_PROJECT],
    );
    const baseline = await getProjectTilePayloads(makeTileSupabase(), [TILE_PROJECT]);

    assert.equal(canonicalDays.projectTilePayloads[0]?.reportingTimeStatus, "Off track");
    assert.equal(baseline.projectTilePayloads[0]?.reportingTimeStatus, "On track");
  });

  it("keeps canonical working days 6.5 and 7 with canonical schedule contingency on tiles", async () => {
    const sixPointFive = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{
          ...CANONICAL_EQUIVALENT_TILE,
          project_working_days_per_week: 6.5,
          project_schedule_contingency_working_days: 26,
        }],
      }),
      [TILE_PROJECT],
    );
    const seven = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{
          ...CANONICAL_EQUIVALENT_TILE,
          project_working_days_per_week: 7,
          project_schedule_contingency_working_days: 28,
        }],
      }),
      [TILE_PROJECT],
    );
    const baseline = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ ...CANONICAL_EQUIVALENT_TILE, project_schedule_contingency_working_days: 20 }],
      }),
      [TILE_PROJECT],
    );

    assert.equal(sixPointFive.portfolioReportingFooter?.timeShortfallDays, 80 - 26);
    assert.equal(seven.portfolioReportingFooter?.timeShortfallDays, 80 - 28);
    assert.equal(baseline.portfolioReportingFooter?.timeShortfallDays, 80 - 20);
  });

  it("keeps canonical P100 as target 100 on tiles", async () => {
    const p100 = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ ...CANONICAL_EQUIVALENT_TILE, project_risk_appetite: "P100" }],
      }),
      [TILE_PROJECT],
    );
    const p80 = await getProjectTilePayloads(makeTileSupabase(), [TILE_PROJECT]);

    assert.equal(p100.projectTilePayloads[0]?.reportingDriverTargetP, 100);
    assert.equal(p80.projectTilePayloads[0]?.reportingDriverTargetP, 80);
  });

  it("keeps canonical EUR and SGD on tiles without remapping to AUD", async () => {
    const eur = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ ...CANONICAL_EQUIVALENT_TILE, project_currency: "EUR" }],
      }),
      [TILE_PROJECT],
    );
    const sgd = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ ...CANONICAL_EQUIVALENT_TILE, project_currency: "SGD" }],
      }),
      [TILE_PROJECT],
    );

    assert.equal(eur.projectTilePayloads[0]?.reportingDriverCurrency, "EUR");
    assert.equal(sgd.projectTilePayloads[0]?.reportingDriverCurrency, "SGD");
  });

  it("produces identical tile/RAG outputs for equivalent canonical inputs", async () => {
    const first = await getProjectTilePayloads(
      makeTileSupabase({ projects: [{ ...CANONICAL_EQUIVALENT_TILE }] }),
      [TILE_PROJECT],
    );
    const second = await getProjectTilePayloads(
      makeTileSupabase({ projects: [{ ...CANONICAL_EQUIVALENT_TILE }] }),
      [TILE_PROJECT],
    );

    assert.deepEqual(first.projectTilePayloads, second.projectTilePayloads);
    assert.deepEqual(first.portfolioReportingFooter, second.portfolioReportingFooter);
  });

  it("preserves unavailable reporting position when canonical values are missing", async () => {
    const missing = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ id: "project-1", name: "MEL1", project_value: null, project_name: "" }],
      }),
      [TILE_PROJECT],
    );

    assert.equal(missing.projectTilePayloads[0]?.reportingOverallStatus, undefined);
    assert.equal(missing.projectTilePayloads[0]?.reportingCostStatus, undefined);
    assert.equal(missing.projectTilePayloads[0]?.ragStatus, "green");
    assert.equal(missing.portfolioReportingFooter, null);
  });

  it("keeps stale locked-reporting RAG amber without rewriting the snapshot", async () => {
    const staleIso = new Date(Date.now() - (REPORTING_LOCK_STALE_MS + 60_000)).toISOString();
    const snapshot = { ...lockedSnapshotWithLinearCdfs(), locked_at: staleIso, created_at: staleIso };
    const before = JSON.stringify(snapshot);
    const nowMs = Date.now();

    const result = await getProjectTilePayloads(
      makeTileSupabase({
        projects: [{ ...CANONICAL_EQUIVALENT_TILE }],
        snapshots: [snapshot],
      }),
      [TILE_PROJECT],
      { nowMs },
    );

    assert.equal(result.projectTilePayloads[0]?.ragStatus, "amber");
    assert.equal(result.projectTilePayloads[0]?.reportingOverallStatus, "On Track");
    assert.equal(JSON.stringify(snapshot), before);
  });

  it("loadProjectContingencyTable uses canonical unscaled contingency and working-day schedule", async () => {
    const rows = await loadProjectContingencyTable(
      makeTileSupabase({
        projects: [
          {
            id: "project-1",
            name: "Project 1",
            project_contingency: 30_000_000,
            project_currency: "EUR",
            project_schedule_contingency_working_days: 20,
          },
        ],
      }),
      [{ id: "project-1", name: "Project 1" }],
    );

    assert.equal(rows[0]?.contingencyAmountAbs, 30_000_000);
    assert.equal(rows[0]?.currency, "EUR");
    assert.equal(rows[0]?.scheduleContingencyWorkingDays, 20);
  });

  it("loadProjectContingencyTable matches equivalent canonical rows", async () => {
    const first = await loadProjectContingencyTable(
      makeTileSupabase({ projects: [{ ...CANONICAL_EQUIVALENT_TILE }] }),
      [{ id: "project-1", name: "Project 1" }],
    );
    const second = await loadProjectContingencyTable(
      makeTileSupabase({ projects: [{ ...CANONICAL_EQUIVALENT_TILE }] }),
      [{ id: "project-1", name: "Project 1" }],
    );

    assert.deepEqual(first, second);
  });

  it("loadTopRiskConcentrationRows keeps canonical EUR on cost exposure slices", async () => {
    const risk = makeRiskRow({
      applies_to: "cost",
      pre_cost_ml: 1_000_000,
      pre_time_ml: 0,
    });
    const result = await loadTopRiskConcentrationRows(
      new FakeSupabase({
        visualify_projects: [
          { id: "project-1", name: "Project 1", portfolio_id: "portfolio-1", project_currency: "EUR" },
        ],
        riskai_risks: [risk],
        riskai_simulation_snapshots: [],
      }) as unknown as SupabaseClient,
      [{ id: "project-1", name: "Project 1" }],
    );

    assert.equal(result.projectCostExposureSlices[0]?.currency, "EUR");
  });
});
