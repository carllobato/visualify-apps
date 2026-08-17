import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterActiveProjects, filterArchivedProjects } from "./activeProjectList";

class FakeQuery {
  filters: Array<{ kind: string; column: string; value: unknown }> = [];

  is(column: string, value: null) {
    this.filters.push({ kind: "is", column, value });
    return this;
  }

  not(column: string, operator: "is", value: null) {
    this.filters.push({ kind: `not-${operator}`, column, value });
    return this;
  }
}

describe("active Project list filters", () => {
  it("filters active lists to archived_at IS NULL", () => {
    const query = filterActiveProjects(new FakeQuery());
    assert.deepEqual(query.filters, [{ kind: "is", column: "archived_at", value: null }]);
  });

  it("filters archived lists to archived_at IS NOT NULL", () => {
    const query = filterArchivedProjects(new FakeQuery());
    assert.deepEqual(query.filters, [{ kind: "not-is", column: "archived_at", value: null }]);
  });
});
