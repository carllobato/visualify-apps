import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccessibleProjects } from "@/lib/portfolios-server";

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

  in(column: string, values: unknown[]): this {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push((row) => {
      if (value === null) return row[column] == null;
      return row[column] === value;
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
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
        return ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return { data, error: null };
  }
}

class FakeSupabase {
  private readonly tables: Record<string, Record<string, unknown>[]>;
  queriedTables: string[] = [];

  constructor(tables: Record<string, Record<string, unknown>[]>) {
    this.tables = tables;
  }

  from(table: string): FakeQuery<Record<string, unknown>> {
    this.queriedTables.push(table);
    return new FakeQuery(this.tables[table] ?? []);
  }
}

const USER_ID = "user-1";
const ACTIVE = {
  id: "project-active",
  name: "Active",
  created_at: "2026-01-01T00:00:00Z",
  owner_user_id: USER_ID,
  workspace_id: "ws-1",
  portfolio_id: "portfolio-1",
  archived_at: null,
};
const ARCHIVED = {
  id: "project-archived",
  name: "Archived",
  created_at: "2026-01-02T00:00:00Z",
  owner_user_id: USER_ID,
  workspace_id: "ws-1",
  portfolio_id: "portfolio-1",
  archived_at: "2026-08-01T00:00:00Z",
};

describe("getAccessibleProjects", () => {
  it("excludes archived Projects from the dashboard active list", async () => {
    const supabase = new FakeSupabase({
      visualify_projects: [ACTIVE, ARCHIVED],
      visualify_project_members: [],
      visualify_workspace_members: [{ workspace_id: "ws-1", user_id: USER_ID, status: "active" }],
    });

    const result = await getAccessibleProjects(supabase as unknown as SupabaseClient, USER_ID);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.projects.map((p) => p.id),
      [ACTIVE.id],
    );
    assert.equal(supabase.queriedTables.includes("visualify_portfolios"), false);
    assert.equal(supabase.queriedTables.includes("visualify_portfolio_members"), false);
  });
});
