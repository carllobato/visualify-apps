import { describe, it } from "node:test";
import assert from "node:assert";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchLatestReportingMonthYearKeyForScope } from "@/lib/db/fetchLatestReportingMonthYearKeyForScope";

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

  not(column: string, operator: string, value: unknown): this {
    if (operator === "is" && value == null) {
      this.filters.push((row) => row[column] != null);
    }
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

function makeSupabase(): SupabaseClient {
  return new FakeSupabase({
    visualify_projects: [PORTFOLIO_PROJECT, UNLINKED_PROJECT],
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
    ],
  }) as unknown as SupabaseClient;
}

describe("fetchLatestReportingMonthYearKeyForScope", () => {
  it("returns the newest locked month for an explicit projectIds list", async () => {
    const latest = await fetchLatestReportingMonthYearKeyForScope(makeSupabase(), {
      projectIds: [PORTFOLIO_PROJECT.id, UNLINKED_PROJECT.id],
    });
    assert.strictEqual(latest, "2026-04");
  });

  it("returns null for an empty projectIds list", async () => {
    const latest = await fetchLatestReportingMonthYearKeyForScope(makeSupabase(), {
      projectIds: [],
    });
    assert.strictEqual(latest, null);
  });

  it("returns null when projectIds are blank", async () => {
    const latest = await fetchLatestReportingMonthYearKeyForScope(makeSupabase(), {
      projectIds: ["", "  "],
    });
    assert.strictEqual(latest, null);
  });

  it("keeps existing portfolioId behaviour: only projects in that portfolio", async () => {
    const latest = await fetchLatestReportingMonthYearKeyForScope(makeSupabase(), {
      portfolioId: "portfolio-1",
    });
    assert.strictEqual(latest, "2026-03");
  });

  it("keeps existing projectId behaviour: only that project", async () => {
    const latest = await fetchLatestReportingMonthYearKeyForScope(makeSupabase(), {
      projectId: PORTFOLIO_PROJECT.id,
    });
    assert.strictEqual(latest, "2026-03");
  });

  it("returns null for an empty projectId", async () => {
    const latest = await fetchLatestReportingMonthYearKeyForScope(makeSupabase(), {
      projectId: "  ",
    });
    assert.strictEqual(latest, null);
  });
});
