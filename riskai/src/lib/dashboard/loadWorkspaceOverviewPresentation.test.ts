import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_REPORTING_UNIT } from "@/lib/portfolio/reportingPreferences";
import { loadWorkspaceOverviewPresentation } from "../../../app/(protected)/workspaces/[workspaceId]/loadWorkspaceOverviewData";

type QueryResult<T> = { data: T; error: null };

class FakeQuery<T extends Record<string, unknown>> {
  private readonly filters: Array<(row: T) => boolean> = [];
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

  in(column: string, values: unknown[]): this {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    let data = [...this.rows];
    for (const filter of this.filters) data = data.filter(filter);
    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
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

const CANONICAL_EQUIVALENT = {
  id: "project-1",
  name: "Project 1",
  created_at: "2026-01-01T00:00:00.000Z",
  project_value: 300000000,
  project_contingency: 80000000,
  project_schedule_contingency_working_days: 80,
  project_working_days_per_week: 5,
  project_risk_appetite: "P80",
  project_currency: "AUD",
} as const;

function lockedSnapshotWithLinearCdfs(): Record<string, unknown> {
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
      risks: [],
      distributions: { costHistogram, timeHistogram, binCount: 100 },
      seed: 1,
      inputs_used: [],
    },
  };
}

function makeOverviewSupabase(extra?: {
  projects?: Record<string, unknown>[];
}): SupabaseClient {
  return new FakeSupabase({
    visualify_projects: extra?.projects ?? [{ ...CANONICAL_EQUIVALENT }],
    riskai_risks: [],
    riskai_simulation_snapshots: [lockedSnapshotWithLinearCdfs()],
  }) as unknown as SupabaseClient;
}

const OVERVIEW_PROJECTS = [
  { id: "project-1", name: "Project 1", created_at: "2026-01-01T00:00:00.000Z" },
];

function comparablePresentation(value: Awaited<ReturnType<typeof loadWorkspaceOverviewPresentation>>) {
  return {
    contingencyPrimaryValue: value.contingencyPrimaryValue,
    scheduleContingencyHeldPrimaryValue: value.scheduleContingencyHeldPrimaryValue,
    coveragePrimaryValue: value.coveragePrimaryValue,
    projectTilePayloads: value.projectTilePayloads,
    portfolioReportingFooter: value.portfolioReportingFooter,
    coverageRatioRows: value.coverageRatioRows,
    scheduleCoverageRows: value.scheduleCoverageRows,
  };
}

describe("loadWorkspaceOverviewPresentation canonical-only Project parameters", () => {
  it("queries canonical visualify_projects fields and does not query visualify_project_settings", () => {
    const source = readFileSync(
      fileURLToPath(
        new URL("../../../app/(protected)/workspaces/[workspaceId]/loadWorkspaceOverviewData.ts", import.meta.url),
      ),
      "utf8",
    );

    assert.match(source, /WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT/);
    assert.match(source, /from\("visualify_projects"\)/);
    assert.equal(source.includes('from("visualify_project_settings")'), false);
    assert.match(source, /sumWorkspaceOverviewContingencyByCurrency/);
    assert.equal(source.includes("computeValueM"), false);
    assert.equal(source.includes("majorCurrencyFromLegacyScaledInput"), false);
  });

  it("works with canonical data and no settings row", async () => {
    const presentation = await loadWorkspaceOverviewPresentation(
      makeOverviewSupabase(),
      OVERVIEW_PROJECTS,
      DEFAULT_REPORTING_UNIT,
      null,
    );

    assert.equal(presentation.coverageRatioRows[0]?.contingencyAmountAbs, 80_000_000);
    assert.equal(presentation.projectTilePayloads[0]?.reportingOverallStatus, "On Track");
  });

  it("ignores conflicting settings data that is no longer queried", async () => {
    const baseline = await loadWorkspaceOverviewPresentation(
      makeOverviewSupabase({ projects: [{ ...CANONICAL_EQUIVALENT, project_contingency: 30_000_000 }] }),
      OVERVIEW_PROJECTS,
      DEFAULT_REPORTING_UNIT,
      null,
    );
    const fromCanonical = await loadWorkspaceOverviewPresentation(
      makeOverviewSupabase({ projects: [{ ...CANONICAL_EQUIVALENT, project_contingency: 30_000_000 }] }),
      OVERVIEW_PROJECTS,
      DEFAULT_REPORTING_UNIT,
      null,
    );

    assert.equal(fromCanonical.coverageRatioRows[0]?.contingencyAmountAbs, 30_000_000);
    assert.deepEqual(comparablePresentation(fromCanonical), comparablePresentation(baseline));
  });

  it("keeps aggregation results identical for equivalent canonical data", async () => {
    const first = await loadWorkspaceOverviewPresentation(
      makeOverviewSupabase({ projects: [{ ...CANONICAL_EQUIVALENT }] }),
      OVERVIEW_PROJECTS,
      DEFAULT_REPORTING_UNIT,
      null,
    );
    const second = await loadWorkspaceOverviewPresentation(
      makeOverviewSupabase({ projects: [{ ...CANONICAL_EQUIVALENT }] }),
      OVERVIEW_PROJECTS,
      DEFAULT_REPORTING_UNIT,
      null,
    );

    assert.deepEqual(comparablePresentation(first), comparablePresentation(second));
  });

  it("preserves incomplete contingency behaviour when canonical values are missing", async () => {
    const missing = await loadWorkspaceOverviewPresentation(
      makeOverviewSupabase({
        projects: [{ id: "project-1", name: "MEL1", created_at: "2026-01-01T00:00:00.000Z", project_contingency: null }],
      }),
      OVERVIEW_PROJECTS,
      DEFAULT_REPORTING_UNIT,
      null,
    );

    assert.equal(missing.contingencyPrimaryValue, "—");
    assert.equal(missing.coverageRatioRows[0]?.contingencyAmountAbs, 0);
    assert.equal(missing.scheduleCoverageRows[0]?.scheduleContingencyWorkingDays, null);
    assert.equal(missing.projectTilePayloads[0]?.reportingOverallStatus, undefined);
  });
});
