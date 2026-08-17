import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveWorkspaceOverviewScope, loadWorkspaceArchivedProjects } from "@/lib/workspace/resolveWorkspaceOverviewScope";
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

  not(column: string, operator: string, value: unknown): this {
    if (operator === "is" && value == null) {
      this.filters.push((row) => row[column] != null);
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  maybeSingle(): Promise<QueryResult<T | null>> {
    const result = this.run();
    if (result.error) {
      return Promise.resolve({ data: null, error: result.error });
    }
    return Promise.resolve({ data: result.data[0] ?? null, error: null });
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

const ARCHIVED_PROJECT = {
  id: "project-archived",
  name: "Archived",
  created_at: "2026-01-15T00:00:00Z",
  archived_at: "2026-08-01T00:00:00Z",
  portfolio_id: null,
  workspace_id: GREEN_SQUARE.id,
};

const LEGACY_ARCHIVED_PORTFOLIO_LINKED = {
  id: "project-legacy-archived",
  name: "Legacy archived",
  created_at: "2026-01-16T00:00:00Z",
  archived_at: "2026-08-02T00:00:00Z",
  portfolio_id: "portfolio-1",
  workspace_id: null,
};

const ARCHIVED_OTHER_WS_ON_THIS_PORTFOLIO = {
  id: "project-other-ws-archived",
  name: "Other workspace archived",
  created_at: "2026-01-17T00:00:00Z",
  archived_at: "2026-08-03T00:00:00Z",
  portfolio_id: "portfolio-1",
  workspace_id: OTHER_WORKSPACE.id,
};

const PORTFOLIO_THOUSANDS = {
  id: "portfolio-1",
  reporting_unit: "THOUSANDS",
  workspace_id: GREEN_SQUARE.id,
  created_at: "2026-01-01",
};

const PORTFOLIO_BILLIONS = {
  id: "portfolio-2",
  reporting_unit: "BILLIONS",
  workspace_id: GREEN_SQUARE.id,
  created_at: "2026-02-01",
};

function workspaceRow(reportingUnit: string | null) {
  return {
    id: GREEN_SQUARE.id,
    name: "GreenSquare",
    slug: "greensquare",
    reporting_unit: reportingUnit,
  };
}

function makeSupabase(options?: {
  reportingUnit?: string | null;
  portfolios?: Record<string, unknown>[];
  tableErrors?: Record<string, { message: string }>;
}): SupabaseClient {
  return new FakeSupabase(
    {
      visualify_projects: [
        LINKED_PROJECT,
        UNLINKED_PROJECT,
        OTHER_WS_PROJECT,
        ARCHIVED_PROJECT,
        LEGACY_ARCHIVED_PORTFOLIO_LINKED,
        ARCHIVED_OTHER_WS_ON_THIS_PORTFOLIO,
      ],
      visualify_portfolios: options?.portfolios ?? [PORTFOLIO_THOUSANDS],
      visualify_workspaces: [
        workspaceRow(options?.reportingUnit === undefined ? "MILLIONS" : options.reportingUnit),
      ],
    },
    options?.tableErrors
  ) as unknown as SupabaseClient;
}

function assertGreenSquareProjects(
  result: Awaited<ReturnType<typeof resolveWorkspaceOverviewScope>>
) {
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.projects.map((p) => p.id),
    [LINKED_PROJECT.id, UNLINKED_PROJECT.id]
  );
  assert.equal(result.projects.some((p) => p.portfolio_id === null), true);
  assert.equal(result.projects.some((p) => p.id === OTHER_WS_PROJECT.id), false);
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
    assertGreenSquareProjects(result);
    if (!result.ok) return;
    assert.equal(result.workspace.name, "GreenSquare");
    assert.equal(result.multiplePortfolios, false);
    assert.equal(result.uniquePortfolio?.id, "portfolio-1");
  });

  it("uses visualify_workspaces THOUSANDS as reportingUnit", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({ reportingUnit: "THOUSANDS" }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reportingUnit, "THOUSANDS");
  });

  it("uses visualify_workspaces MILLIONS as reportingUnit", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({ reportingUnit: "MILLIONS" }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reportingUnit, "MILLIONS");
  });

  it("uses visualify_workspaces BILLIONS as reportingUnit", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({ reportingUnit: "BILLIONS" }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reportingUnit, "BILLIONS");
  });

  it("uses the Workspace reporting unit when the Workspace has no internal Portfolio", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({ reportingUnit: "BILLIONS", portfolios: [] }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assertGreenSquareProjects(result);
    if (!result.ok) return;
    assert.equal(result.uniquePortfolio, null);
    assert.equal(result.multiplePortfolios, false);
    assert.equal(result.reportingUnit, "BILLIONS");
  });

  it("uses the Workspace reporting unit when a unique Portfolio has a different unit", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({
        reportingUnit: "MILLIONS",
        portfolios: [PORTFOLIO_THOUSANDS],
      }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assertGreenSquareProjects(result);
    if (!result.ok) return;
    assert.equal(result.uniquePortfolio?.id, "portfolio-1");
    assert.equal(result.multiplePortfolios, false);
    assert.equal(result.reportingUnit, "MILLIONS");
  });

  it("uses the Workspace reporting unit when multiple Portfolios exist", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({
        reportingUnit: "THOUSANDS",
        portfolios: [PORTFOLIO_THOUSANDS, PORTFOLIO_BILLIONS],
      }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assertGreenSquareProjects(result);
    if (!result.ok) return;
    assert.equal(result.uniquePortfolio, null);
    assert.equal(result.multiplePortfolios, true);
    assert.equal(result.reportingUnit, "THOUSANDS");
  });

  it("uses the unique Portfolio reporting unit when the Workspace value is missing", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({
        reportingUnit: null,
        portfolios: [PORTFOLIO_THOUSANDS],
      }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assertGreenSquareProjects(result);
    if (!result.ok) return;
    assert.equal(result.uniquePortfolio?.id, "portfolio-1");
    assert.equal(result.reportingUnit, "THOUSANDS");
  });

  it("uses the default reporting unit when Workspace and unique Portfolio values are missing", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({ reportingUnit: null, portfolios: [] }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assertGreenSquareProjects(result);
    if (!result.ok) return;
    assert.equal(result.uniquePortfolio, null);
    assert.equal(result.reportingUnit, "MILLIONS");
  });

  it("does not pick a Portfolio fallback when more than one Portfolio exists", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase({
        reportingUnit: null,
        portfolios: [PORTFOLIO_THOUSANDS, PORTFOLIO_BILLIONS],
      }),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assertGreenSquareProjects(result);
    if (!result.ok) return;
    assert.equal(result.uniquePortfolio, null);
    assert.equal(result.multiplePortfolios, true);
    assert.equal(result.reportingUnit, "MILLIONS");
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

  it("excludes archived Projects from the active Workspace list", async () => {
    const result = await resolveWorkspaceOverviewScope({
      supabase: makeSupabase(),
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.projects.some((p) => p.id === ARCHIVED_PROJECT.id), false);
  });

  it("includes archived Projects in the Workspace archived section list", async () => {
    const archived = await loadWorkspaceArchivedProjects(makeSupabase(), GREEN_SQUARE.id);
    assert.deepEqual(
      archived.map((p) => p.id),
      [LEGACY_ARCHIVED_PORTFOLIO_LINKED.id, ARCHIVED_PROJECT.id],
    );
  });

  it("includes legacy portfolio-linked archived Projects with a null workspace_id", async () => {
    const archived = await loadWorkspaceArchivedProjects(makeSupabase(), GREEN_SQUARE.id);
    assert.equal(
      archived.some((p) => p.id === LEGACY_ARCHIVED_PORTFOLIO_LINKED.id),
      true,
    );
  });

  it("does not include archived Projects whose project workspace_id is a different Workspace", async () => {
    const archived = await loadWorkspaceArchivedProjects(makeSupabase(), GREEN_SQUARE.id);
    assert.equal(
      archived.some((p) => p.id === ARCHIVED_OTHER_WS_ON_THIS_PORTFOLIO.id),
      false,
    );
  });
});
