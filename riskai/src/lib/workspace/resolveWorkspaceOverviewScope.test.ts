import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_REPORTING_UNIT } from "@/lib/portfolio/reportingPreferences";
import { resolveWorkspaceOverviewScope } from "@/lib/workspace/resolveWorkspaceOverviewScope";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

class FakeQuery<T extends Record<string, unknown>> {
  private readonly filters: Array<(row: T) => boolean> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private readonly rows: T[];
  private readonly error: { message: string } | null;

  constructor(rows: T[], error: { message: string } | null = null) {
    this.rows = rows;
    this.error = error;
  }

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
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
    if (this.error) {
      return { data: null, error: this.error };
    }
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
  private readonly tableErrors: Record<string, { message: string }>;

  constructor(
    tables: Record<string, Record<string, unknown>[]>,
    tableErrors: Record<string, { message: string }> = {}
  ) {
    this.tables = tables;
    this.tableErrors = tableErrors;
  }

  from(table: string): FakeQuery<Record<string, unknown>> {
    return new FakeQuery(this.tables[table] ?? [], this.tableErrors[table] ?? null);
  }
}

const GREEN_SQUARE: EntitledWorkspace = {
  id: "ws-green-square",
  name: "GreenSquare",
  slug: "greensquare",
  website_url: null,
  logo_url: null,
};

const OTHER_WORKSPACE: EntitledWorkspace = {
  id: "ws-other",
  name: "Other",
  slug: "other",
  website_url: null,
  logo_url: null,
};

const LINKED_PROJECT = {
  id: "project-linked",
  name: "Linked",
  created_at: "2026-01-01T00:00:00Z",
  portfolio_id: "portfolio-1",
  workspace_id: GREEN_SQUARE.id,
};

const UNLINKED_PROJECT = {
  id: "project-unlinked",
  name: "Unlinked",
  created_at: "2026-02-01T00:00:00Z",
  portfolio_id: null,
  workspace_id: GREEN_SQUARE.id,
};

const OTHER_WS_PROJECT = {
  id: "project-other-ws",
  name: "Other workspace",
  created_at: "2026-03-01T00:00:00Z",
  portfolio_id: null,
  workspace_id: OTHER_WORKSPACE.id,
};

function makeSupabase(options?: {
  portfolios?: Record<string, unknown>[];
  tableErrors?: Record<string, { message: string }>;
}): SupabaseClient {
  return new FakeSupabase(
    {
      visualify_projects: [LINKED_PROJECT, UNLINKED_PROJECT, OTHER_WS_PROJECT],
      visualify_portfolios: options?.portfolios ?? [
        { id: "portfolio-1", reporting_unit: "THOUSANDS", workspace_id: GREEN_SQUARE.id, created_at: "2026-01-01" },
      ],
    },
    options?.tableErrors
  ) as unknown as SupabaseClient;
}

describe("resolveWorkspaceOverviewScope", () => {
  it("rejects a blank workspace id without loading Projects", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase(),
      workspaceId: "  ",
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.deepEqual(result, { ok: false, error: "invalid" });
  });

  it("rejects a Workspace id that is not in the entitled set", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase(),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [OTHER_WORKSPACE],
    });
    assert.deepEqual(result, { ok: false, error: "forbidden" });
  });

  it("loads Workspace Projects by workspace_id, including portfolio_id null", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase(),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE, OTHER_WORKSPACE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.workspace.name, "GreenSquare");
    assert.deepEqual(
      result.projects.map((p) => p.id),
      [LINKED_PROJECT.id, UNLINKED_PROJECT.id]
    );
    assert.equal(result.projects.some((p) => p.portfolio_id === null), true);
    assert.equal(result.projects.some((p) => p.id === OTHER_WS_PROJECT.id), false);
    assert.equal(result.multiplePortfolios, false);
    assert.equal(result.uniquePortfolio?.id, "portfolio-1");
    assert.equal(result.reportingUnit, "THOUSANDS");
  });

  it("uses default reporting_unit when the Workspace has no internal Portfolio", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({ portfolios: [] }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.uniquePortfolio, null);
    assert.equal(result.multiplePortfolios, false);
    assert.equal(result.reportingUnit, DEFAULT_REPORTING_UNIT);
    assert.equal(result.projects.length, 2);
  });

  it("does not arbitrarily select metadata when multiple Portfolios exist", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({
        portfolios: [
          { id: "portfolio-1", reporting_unit: "THOUSANDS", workspace_id: GREEN_SQUARE.id, created_at: "2026-01-01" },
          { id: "portfolio-2", reporting_unit: "BILLIONS", workspace_id: GREEN_SQUARE.id, created_at: "2026-02-01" },
        ],
      }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.uniquePortfolio, null);
    assert.equal(result.multiplePortfolios, true);
    assert.equal(result.reportingUnit, DEFAULT_REPORTING_UNIT);
    assert.deepEqual(
      result.projects.map((p) => p.id),
      [LINKED_PROJECT.id, UNLINKED_PROJECT.id]
    );
  });

  it("fails safely to empty Projects when the Project query errors", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({
        tableErrors: { visualify_projects: { message: "boom" } },
      }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.projects, []);
  });
});
