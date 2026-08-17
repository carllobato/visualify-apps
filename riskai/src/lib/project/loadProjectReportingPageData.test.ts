import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadProjectReportingPageData,
  projectReportingPageUrlWithReportingMonth,
  rawReportingMonthParamFromSearchParams,
  reportingMonthYearKeyFromSearchParams,
} from "./loadProjectReportingPageData";

type QueryResult<T> = { data: T; error: null };

class FakeQuery<T extends Record<string, unknown>> {
  private readonly filters: Array<(row: T) => boolean> = [];
  private readonly orders: Array<{ column: string; ascending: boolean; nullsFirst: boolean }> = [];
  private limitCount: number | null = null;
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

  or(expr: string): this {
    if (expr.includes("locked_for_reporting.is.null") && expr.includes("locked_for_reporting.eq.false")) {
      this.filters.push(
        (row) => row.locked_for_reporting == null || row.locked_for_reporting === false
      );
    }
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push((row) => String(row[column] ?? "") > String(value ?? ""));
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orders.push({
      column,
      ascending: options?.ascending !== false,
      nullsFirst: options?.nullsFirst === true,
    });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  maybeSingle(): Promise<QueryResult<T | null>> {
    const rows = this.filteredSorted();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.filteredSorted(), error: null }).then(onfulfilled, onrejected);
  }

  private filteredSorted(): T[] {
    let data = [...this.rows];
    for (const filter of this.filters) data = data.filter(filter);
    if (this.orders.length > 0) {
      data.sort((a, b) => {
        for (const order of this.orders) {
          const av = a[order.column];
          const bv = b[order.column];
          if (av == null && bv == null) continue;
          if (av == null) return order.nullsFirst ? -1 : 1;
          if (bv == null) return order.nullsFirst ? 1 : -1;
          if (av === bv) continue;
          const cmp = String(av) < String(bv) ? -1 : 1;
          return order.ascending ? cmp : -cmp;
        }
        return 0;
      });
    }
    if (this.limitCount != null) return data.slice(0, this.limitCount);
    return data;
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

function makeSupabase(rows: Record<string, unknown>[]): SupabaseClient {
  return new FakeSupabase({
    riskai_simulation_snapshots: rows,
  }) as unknown as SupabaseClient;
}

describe("reportingMonthYearKeyFromSearchParams", () => {
  it("reads a valid YYYY-MM reportingMonth", () => {
    assert.equal(reportingMonthYearKeyFromSearchParams({ reportingMonth: "2026-03" }), "2026-03");
  });

  it("returns null for unpublished and invalid values", () => {
    assert.equal(reportingMonthYearKeyFromSearchParams({ reportingMonth: "unpublished" }), null);
    assert.equal(reportingMonthYearKeyFromSearchParams({ reportingMonth: "not-a-month" }), null);
    assert.equal(reportingMonthYearKeyFromSearchParams({ reportingMonth: "" }), null);
    assert.equal(reportingMonthYearKeyFromSearchParams({}), null);
  });
});

describe("rawReportingMonthParamFromSearchParams", () => {
  it("preserves unpublished and first array value", () => {
    assert.equal(rawReportingMonthParamFromSearchParams({ reportingMonth: "unpublished" }), "unpublished");
    assert.equal(
      rawReportingMonthParamFromSearchParams({ reportingMonth: ["2026-03", "2026-04"] }),
      "2026-03"
    );
  });
});

describe("projectReportingPageUrlWithReportingMonth", () => {
  it("keeps Overview and Report on their own paths when defaulting unpublished", () => {
    assert.equal(
      projectReportingPageUrlWithReportingMonth("/projects/p-1", {}, "unpublished"),
      "/projects/p-1?reportingMonth=unpublished"
    );
    assert.equal(
      projectReportingPageUrlWithReportingMonth("/projects/p-1/report", {}, "unpublished"),
      "/projects/p-1/report?reportingMonth=unpublished"
    );
  });

  it("replaces reportingMonth and preserves other query params", () => {
    assert.equal(
      projectReportingPageUrlWithReportingMonth(
        "/projects/p-1/report",
        { reportingMonth: "2026-01", tab: "cost" },
        "2026-03"
      ),
      "/projects/p-1/report?tab=cost&reportingMonth=2026-03"
    );
  });
});

describe("loadProjectReportingPageData", () => {
  it("redirects unpublished defaults onto the Report path, not Overview", async () => {
    const result = await loadProjectReportingPageData({
      supabase: makeSupabase([
        {
          id: "unlocked-1",
          project_id: "p-1",
          locked_for_reporting: false,
          created_at: "2026-03-02T00:00:00.000Z",
        },
      ]),
      projectId: "p-1",
      searchParams: {},
      pagePath: "/projects/p-1/report",
      initialUrlSearch: "",
    });
    assert.deepEqual(result, {
      kind: "redirect",
      url: "/projects/p-1/report?reportingMonth=unpublished",
    });
  });

  it("redirects unpublished defaults onto Overview when that path is requested", async () => {
    const result = await loadProjectReportingPageData({
      supabase: makeSupabase([
        {
          id: "unlocked-1",
          project_id: "p-1",
          locked_for_reporting: false,
          created_at: "2026-03-02T00:00:00.000Z",
        },
      ]),
      projectId: "p-1",
      searchParams: {},
      pagePath: "/projects/p-1",
      initialUrlSearch: "",
    });
    assert.deepEqual(result, {
      kind: "redirect",
      url: "/projects/p-1?reportingMonth=unpublished",
    });
  });

  it("keeps an explicit unpublished URL on the Report page", async () => {
    const result = await loadProjectReportingPageData({
      supabase: makeSupabase([
        {
          id: "unlocked-1",
          project_id: "p-1",
          locked_for_reporting: false,
          created_at: "2026-03-02T00:00:00.000Z",
        },
      ]),
      projectId: "p-1",
      searchParams: { reportingMonth: "unpublished" },
      pagePath: "/projects/p-1/report",
      initialUrlSearch: "?reportingMonth=unpublished",
    });
    assert.equal(result.kind, "data");
    if (result.kind !== "data") return;
    assert.equal(result.initialData.unpublishedMode, true);
    assert.equal(result.initialData.reportingSnapshot?.id, "unlocked-1");
    assert.equal(result.initialData.lockedReportingBaselineSnapshot, null);
  });

  it("loads the locked snapshot for an explicit reportingMonth", async () => {
    const result = await loadProjectReportingPageData({
      supabase: makeSupabase([
        {
          id: "locked-march",
          project_id: "p-1",
          locked_for_reporting: true,
          report_month: "2026-03-01",
          locked_at: "2026-03-10T00:00:00.000Z",
          created_at: "2026-03-10T00:00:00.000Z",
        },
        {
          id: "locked-april",
          project_id: "p-1",
          locked_for_reporting: true,
          report_month: "2026-04-01",
          locked_at: "2026-04-10T00:00:00.000Z",
          created_at: "2026-04-10T00:00:00.000Z",
        },
      ]),
      projectId: "p-1",
      searchParams: { reportingMonth: "2026-03" },
      pagePath: "/projects/p-1/report",
      initialUrlSearch: "?reportingMonth=2026-03",
    });
    assert.equal(result.kind, "data");
    if (result.kind !== "data") return;
    assert.equal(result.initialData.unpublishedMode, false);
    assert.equal(result.initialData.reportingSnapshot?.id, "locked-march");
  });
});
