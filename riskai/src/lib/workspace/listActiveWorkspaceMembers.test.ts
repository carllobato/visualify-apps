import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listActiveWorkspaceMembers,
  shapeActiveWorkspaceMemberList,
  workspaceMemberRoleLabel,
} from "./listActiveWorkspaceMembers";

const WS = "ws-1";
const OTHER = "ws-other";

describe("workspaceMemberRoleLabel", () => {
  it("labels every Workspace role", () => {
    assert.equal(workspaceMemberRoleLabel("owner"), "Owner");
    assert.equal(workspaceMemberRoleLabel("admin"), "Admin");
    assert.equal(workspaceMemberRoleLabel("member"), "Member");
    assert.equal(workspaceMemberRoleLabel("viewer"), "Viewer");
  });
});

describe("shapeActiveWorkspaceMemberList", () => {
  it("includes Owner, Admin, Member, and Viewer from the requested Workspace", () => {
    const items = shapeActiveWorkspaceMemberList({
      workspaceId: WS,
      memberRows: [
        { user_id: "u-member", workspace_id: WS, role: "member", status: "active" },
        { user_id: "u-viewer", workspace_id: WS, role: "viewer", status: "active" },
        { user_id: "u-admin", workspace_id: WS, role: "admin", status: "active" },
        { user_id: "u-owner", workspace_id: WS, role: "owner", status: "active" },
      ],
      profiles: [
        { id: "u-owner", first_name: "Ava", surname: "Owner", email: "ava@example.com" },
        { id: "u-admin", first_name: "Ben", surname: "Admin", email: "ben@example.com" },
        { id: "u-member", first_name: "Cara", surname: "Member", email: "cara@example.com" },
        { id: "u-viewer", first_name: "Drew", surname: "Viewer", email: "drew@example.com" },
      ],
    });

    assert.deepEqual(
      items.map((row) => ({ userId: row.userId, role: row.role, name: row.name, email: row.email })),
      [
        { userId: "u-owner", role: "owner", name: "Ava Owner", email: "ava@example.com" },
        { userId: "u-admin", role: "admin", name: "Ben Admin", email: "ben@example.com" },
        { userId: "u-member", role: "member", name: "Cara Member", email: "cara@example.com" },
        { userId: "u-viewer", role: "viewer", name: "Drew Viewer", email: "drew@example.com" },
      ],
    );
  });

  it("does not return members from another Workspace", () => {
    const items = shapeActiveWorkspaceMemberList({
      workspaceId: WS,
      memberRows: [
        { user_id: "u-self", workspace_id: WS, role: "member", status: "active" },
        { user_id: "u-other", workspace_id: OTHER, role: "owner", status: "active" },
      ],
      profiles: [
        { id: "u-self", first_name: "Self", surname: "User", email: "self@example.com" },
        { id: "u-other", first_name: "Other", surname: "User", email: "other@example.com" },
      ],
    });

    assert.deepEqual(
      items.map((row) => row.userId),
      ["u-self"],
    );
  });

  it("drops inactive members and unknown roles", () => {
    const items = shapeActiveWorkspaceMemberList({
      workspaceId: WS,
      memberRows: [
        { user_id: "u-active", workspace_id: WS, role: "member", status: "active" },
        { user_id: "u-empty-status", workspace_id: WS, role: "viewer", status: "" },
        { user_id: "u-inactive", workspace_id: WS, role: "admin", status: "inactive" },
        { user_id: "u-unknown", workspace_id: WS, role: "superadmin", status: "active" },
      ],
      profiles: [
        { id: "u-active", first_name: "Active", surname: "Member", email: "active@example.com" },
        { id: "u-empty-status", first_name: "Empty", surname: "Status", email: "empty@example.com" },
        { id: "u-inactive", first_name: "Gone", surname: "User", email: "gone@example.com" },
        { id: "u-unknown", first_name: "Unknown", surname: "Role", email: "unknown@example.com" },
      ],
    });

    assert.deepEqual(
      items.map((row) => row.userId),
      ["u-active", "u-empty-status"],
    );
  });

  it("falls back to email then Member and does not surface extra profile fields", () => {
    const items = shapeActiveWorkspaceMemberList({
      workspaceId: WS,
      memberRows: [
        { user_id: "u-email-only", workspace_id: WS, role: "member", status: "active" },
        { user_id: "u-nameless", workspace_id: WS, role: "viewer", status: "active" },
      ],
      profiles: [
        {
          id: "u-email-only",
          first_name: "  ",
          surname: "",
          email: "email-only@example.com",
          company: "Should not leak",
        } as { id: string; first_name: string; surname: string; email: string; company: string },
        { id: "u-nameless", first_name: null, surname: null, email: null },
      ],
    });

    assert.equal(items[0]?.name, "email-only@example.com");
    assert.equal(items[0]?.email, "email-only@example.com");
    assert.equal(items[1]?.name, "Member");
    assert.equal(items[1]?.email, null);
    assert.equal("company" in (items[0] ?? {}), false);
  });
});

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

class FakeQuery<T extends Record<string, unknown>> {
  private readonly filters: Array<(row: T) => boolean> = [];
  private inFilter: ((row: T) => boolean) | null = null;
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

  in(column: string, values: unknown[]): this {
    const set = new Set(values);
    this.inFilter = (row) => set.has(row[column]);
    return this;
  }

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run(): QueryResult<T[]> {
    if (this.error) return { data: null, error: this.error };
    let data = [...this.rows];
    for (const filter of this.filters) data = data.filter(filter);
    if (this.inFilter) data = data.filter(this.inFilter);
    return { data, error: null };
  }
}

class FakeSupabase {
  queriedTables: string[] = [];
  private readonly tables: Record<string, Record<string, unknown>[]>;

  constructor(tables: Record<string, Record<string, unknown>[]>) {
    this.tables = tables;
  }

  from(table: string): FakeQuery<Record<string, unknown>> {
    this.queriedTables.push(table);
    return new FakeQuery(this.tables[table] ?? []);
  }
}

describe("listActiveWorkspaceMembers", () => {
  it("queries only the requested Workspace and does not read portfolios", async () => {
    const supabase = new FakeSupabase({
      visualify_workspace_members: [
        { user_id: "u-1", workspace_id: WS, role: "owner", status: "active" },
        { user_id: "u-2", workspace_id: OTHER, role: "admin", status: "active" },
      ],
      visualify_profiles: [
        { id: "u-1", first_name: "Ava", surname: "Owner", email: "ava@example.com" },
        { id: "u-2", first_name: "Other", surname: "Admin", email: "other@example.com" },
      ],
      visualify_portfolios: [{ id: "pf-1", workspace_id: WS }],
    });

    const result = await listActiveWorkspaceMembers(
      supabase as unknown as SupabaseClient,
      WS,
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.members.map((row) => row.userId),
      ["u-1"],
    );
    assert.equal(supabase.queriedTables.includes("visualify_workspace_members"), true);
    assert.equal(supabase.queriedTables.includes("visualify_profiles"), true);
    assert.equal(supabase.queriedTables.includes("visualify_portfolios"), false);
  });
});
