import { describe, it } from "node:test";
import assert from "node:assert";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchDistinctLockedReportingMonthKeysFromScope } from "@/lib/db/lockedReportingMonths";

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

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run(): QueryResult<T[]> {
    let data = [...this.rows];
    for (const filter of this.filters) data = data.filter(filter);
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

const PORTFOLIO_PROJECT = { id: "project-1", portfolio_id: "portfolio-1" };
const UNLINKED_PROJECT = { id: "project-unlinked", portfolio_id: null };
const ARCHIVED_PORTFOLIO_PROJECT = {
  id: "project-archived",
  portfolio_id: "portfolio-1",
  archived_at: "2026-08-01T00:00:00Z",
};

function makeSupabase(): SupabaseClient {
  return new FakeSupabase({
    visualify_projects: [PORTFOLIO_PROJECT, UNLINKED_PROJECT, ARCHIVED_PORTFOLIO_PROJECT],
    riskai_simulation_snapshots: [
      {
        project_id: PORTFOLIO_PROJECT.id,
        locked_for_reporting: true,
        report_month: "2026-03-01",
      },
      {
        project_id: UNLINKED_PROJECT.id,
        locked_for_reporting: true,
        report_month: "2026-04-01",
      },
      {
        project_id: PORTFOLIO_PROJECT.id,
        locked_for_reporting: false,
        report_month: "2026-05-01",
      },
      {
        project_id: ARCHIVED_PORTFOLIO_PROJECT.id,
        locked_for_reporting: true,
        report_month: "2026-06-01",
      },
    ],
  }) as unknown as SupabaseClient;
}

describe("fetchDistinctLockedReportingMonthKeysFromScope", () => {
  it("returns locked months for an explicit projectIds list, newest first", async () => {
    const result = await fetchDistinctLockedReportingMonthKeysFromScope(makeSupabase(), {
      projectIds: [PORTFOLIO_PROJECT.id, UNLINKED_PROJECT.id],
    });
    assert.deepStrictEqual(result.monthYearKeys, ["2026-04", "2026-03"]);
    assert.strictEqual(result.legacyLockedWithoutReportMonth, false);
  });

  it("returns an empty result for an empty projectIds list without querying a portfolio", async () => {
    const result = await fetchDistinctLockedReportingMonthKeysFromScope(makeSupabase(), {
      projectIds: [],
    });
    assert.deepStrictEqual(result, {
      monthYearKeys: [],
      legacyLockedWithoutReportMonth: false,
    });
  });

  it("treats blank projectIds as an empty scope", async () => {
    const result = await fetchDistinctLockedReportingMonthKeysFromScope(makeSupabase(), {
      projectIds: ["", "  "],
    });
    assert.deepStrictEqual(result.monthYearKeys, []);
    assert.strictEqual(result.legacyLockedWithoutReportMonth, false);
  });

  it("keeps existing portfolioId behaviour: only projects in that portfolio", async () => {
    const result = await fetchDistinctLockedReportingMonthKeysFromScope(makeSupabase(), {
      portfolioId: "portfolio-1",
    });
    assert.deepStrictEqual(result.monthYearKeys, ["2026-03"]);
  });

  it("keeps existing projectId behaviour: only that project", async () => {
    const result = await fetchDistinctLockedReportingMonthKeysFromScope(makeSupabase(), {
      projectId: PORTFOLIO_PROJECT.id,
    });
    assert.deepStrictEqual(result.monthYearKeys, ["2026-03"]);
  });

  it("lets projectId take precedence over projectIds", async () => {
    const result = await fetchDistinctLockedReportingMonthKeysFromScope(makeSupabase(), {
      projectId: PORTFOLIO_PROJECT.id,
      projectIds: [UNLINKED_PROJECT.id],
    });
    assert.deepStrictEqual(result.monthYearKeys, ["2026-03"]);
  });
});
