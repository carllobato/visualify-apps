import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_REPORTING_UNIT } from "@/lib/portfolio/reportingPreferences";
import { resolveWorkspaceSettingsScope } from "./resolveWorkspaceSettingsScope";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

class FakeQuery<T extends Record<string, unknown>> {
  private readonly filters: Array<(row: T) => boolean> = [];
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

  maybeSingle(): Promise<QueryResult<T | null>> {
    const result = this.run();
    if (result.error) {
      return Promise.resolve({ data: null, error: result.error });
    }
    return Promise.resolve({ data: result.data[0] ?? null, error: null });
  }

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run(): QueryResult<T[]> {
    if (this.error) {
      return { data: null, error: this.error };
    }
    let data = [...this.rows];
    for (const filter of this.filters) data = data.filter(filter);
    return { data, error: null };
  }
}

class FakeSupabase {
  private readonly tables: Record<string, Record<string, unknown>[]>;
  private readonly tableErrors: Record<string, { message: string }>;
  queriedTables: string[] = [];

  constructor(
    tables: Record<string, Record<string, unknown>[]>,
    tableErrors: Record<string, { message: string }> = {},
  ) {
    this.tables = tables;
    this.tableErrors = tableErrors;
  }

  from(table: string): FakeQuery<Record<string, unknown>> {
    this.queriedTables.push(table);
    return new FakeQuery(this.tables[table] ?? [], this.tableErrors[table] ?? null);
  }
}

const GREEN_SQUARE: EntitledWorkspace = {
  id: "ws-green-square",
  name: "GreenSquare (entitled fallback)",
  slug: "greensquare-entitled",
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

function makeSupabase(options?: {
  workspaces?: Record<string, unknown>[];
  portfolios?: Record<string, unknown>[];
  tableErrors?: Record<string, { message: string }>;
}): FakeSupabase {
  return new FakeSupabase(
    {
      visualify_workspaces: options?.workspaces ?? [
        {
          id: GREEN_SQUARE.id,
          name: "GreenSquare",
          slug: "greensquare",
          reporting_unit: "THOUSANDS",
        },
      ],
      visualify_portfolios: options?.portfolios ?? [],
    },
    options?.tableErrors,
  );
}

describe("resolveWorkspaceSettingsScope", () => {
  it("rejects a blank workspace id without reading Workspace rows", async () => {
    const supabase = makeSupabase();
    const result = await resolveWorkspaceSettingsScope({
      supabase: supabase as unknown as SupabaseClient,
      workspaceId: "  ",
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.deepEqual(result, { ok: false, error: "invalid" });
    assert.deepEqual(supabase.queriedTables, []);
  });

  it("rejects a Workspace id that is not in the entitled set", async () => {
    const supabase = makeSupabase();
    const result = await resolveWorkspaceSettingsScope({
      supabase: supabase as unknown as SupabaseClient,
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [OTHER_WORKSPACE],
    });
    assert.deepEqual(result, { ok: false, error: "forbidden" });
    assert.deepEqual(supabase.queriedTables, []);
  });

  it("loads name, reporting_unit, id, and slug from visualify_workspaces", async () => {
    const supabase = makeSupabase();
    const result = await resolveWorkspaceSettingsScope({
      supabase: supabase as unknown as SupabaseClient,
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.deepEqual(result, {
      ok: true,
      workspaceId: GREEN_SQUARE.id,
      workspaceName: "GreenSquare",
      workspaceSlug: "greensquare",
      reportingUnit: "THOUSANDS",
    });
    assert.equal(supabase.queriedTables.includes("visualify_workspaces"), true);
  });

  it("does not require a Portfolio row to load Settings", async () => {
    const supabase = makeSupabase({
      workspaces: [
        {
          id: GREEN_SQUARE.id,
          name: "Zero Portfolio Workspace",
          slug: "zero-portfolio",
          reporting_unit: "BILLIONS",
        },
      ],
      portfolios: [],
    });
    const result = await resolveWorkspaceSettingsScope({
      supabase: supabase as unknown as SupabaseClient,
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.workspaceName, "Zero Portfolio Workspace");
    assert.equal(result.reportingUnit, "BILLIONS");
  });

  it("uses the unique Portfolio reporting unit when the Workspace value is missing", async () => {
    const supabase = makeSupabase({
      workspaces: [
        {
          id: GREEN_SQUARE.id,
          name: "GreenSquare",
          slug: "greensquare",
          reporting_unit: null,
        },
      ],
      portfolios: [
        {
          id: "portfolio-1",
          workspace_id: GREEN_SQUARE.id,
          reporting_unit: "BILLIONS",
        },
      ],
    });
    const result = await resolveWorkspaceSettingsScope({
      supabase: supabase as unknown as SupabaseClient,
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reportingUnit, "BILLIONS");
  });

  it("keeps the Workspace reporting unit when a unique Portfolio has a different unit", async () => {
    const supabase = makeSupabase({
      workspaces: [
        {
          id: GREEN_SQUARE.id,
          name: "GreenSquare",
          slug: "greensquare",
          reporting_unit: "THOUSANDS",
        },
      ],
      portfolios: [
        {
          id: "portfolio-1",
          workspace_id: GREEN_SQUARE.id,
          reporting_unit: "BILLIONS",
        },
      ],
    });
    const result = await resolveWorkspaceSettingsScope({
      supabase: supabase as unknown as SupabaseClient,
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reportingUnit, "THOUSANDS");
  });

  it("uses the default reporting unit when Workspace and unique Portfolio values are missing", async () => {
    const supabase = makeSupabase({
      workspaces: [
        {
          id: GREEN_SQUARE.id,
          name: "GreenSquare",
          slug: "greensquare",
          reporting_unit: null,
        },
      ],
      portfolios: [],
    });
    const result = await resolveWorkspaceSettingsScope({
      supabase: supabase as unknown as SupabaseClient,
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reportingUnit, DEFAULT_REPORTING_UNIT);
  });

  it("does not pick a Portfolio fallback when more than one Portfolio exists", async () => {
    const supabase = makeSupabase({
      workspaces: [
        {
          id: GREEN_SQUARE.id,
          name: "GreenSquare",
          slug: "greensquare",
          reporting_unit: null,
        },
      ],
      portfolios: [
        {
          id: "portfolio-1",
          workspace_id: GREEN_SQUARE.id,
          reporting_unit: "BILLIONS",
        },
        {
          id: "portfolio-2",
          workspace_id: GREEN_SQUARE.id,
          reporting_unit: "THOUSANDS",
        },
      ],
    });
    const result = await resolveWorkspaceSettingsScope({
      supabase: supabase as unknown as SupabaseClient,
      workspaceId: GREEN_SQUARE.id,
      entitledWorkspaces: [GREEN_SQUARE],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reportingUnit, DEFAULT_REPORTING_UNIT);
  });
});
