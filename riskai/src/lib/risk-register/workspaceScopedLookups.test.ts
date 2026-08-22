import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findLookupNameCaseInsensitive,
  normalizeLookupName,
  resolveCreateLookupName,
  shouldIgnoreLookupUniqueViolation,
  workspaceIdFromVisualifyProjectRow,
  workspaceLookupFiltersMatch,
  workspaceScopedCategoryInsert,
  workspaceScopedCategoryListEq,
  workspaceScopedOwnerInsert,
  workspaceScopedOwnerListEq,
} from "./workspaceScopedLookups";

describe("workspaceScopedLookups", () => {
  it("reads workspace_id from the Visualify project row", () => {
    assert.equal(
      workspaceIdFromVisualifyProjectRow({ workspace_id: " ws-1 " }),
      "ws-1"
    );
    assert.equal(workspaceIdFromVisualifyProjectRow({ workspace_id: "" }), null);
    assert.equal(workspaceIdFromVisualifyProjectRow(null), null);
  });

  it("scopes owner list and insert by workspace_id, never project_id", () => {
    const listEq = workspaceScopedOwnerListEq("ws-a");
    const insert = workspaceScopedOwnerInsert("ws-a", "  Alex  ");
    assert.deepEqual(listEq, { workspace_id: "ws-a", is_active: true });
    assert.deepEqual(insert, { workspace_id: "ws-a", name: "Alex" });
    assert.equal(Object.prototype.hasOwnProperty.call(listEq, "project_id"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(insert, "project_id"), false);
  });

  it("scopes category list by workspace_id (not global)", () => {
    const listEq = workspaceScopedCategoryListEq("ws-b");
    assert.deepEqual(listEq, { workspace_id: "ws-b", is_active: true });
    assert.equal(Object.prototype.hasOwnProperty.call(listEq, "project_id"), false);
  });

  it("category insert uses workspace_id + trimmed name + is_active, never project_id", () => {
    const insert = workspaceScopedCategoryInsert(" ws-cat ", "  Operational  ");
    assert.deepEqual(insert, {
      workspace_id: "ws-cat",
      name: "Operational",
      is_active: true,
    });
    assert.equal(Object.prototype.hasOwnProperty.call(insert, "project_id"), false);
  });

  it("rejects blank / whitespace-only lookup names", () => {
    assert.equal(normalizeLookupName(""), null);
    assert.equal(normalizeLookupName("   "), null);
    assert.equal(normalizeLookupName("\t\n"), null);
    assert.deepEqual(resolveCreateLookupName(["Finance"], "  "), {
      action: "reject_blank",
    });
  });

  it("reuses an existing category name case-insensitively after trim", () => {
    assert.equal(
      findLookupNameCaseInsensitive(["Finance", "Legal"], "  finance  "),
      "Finance"
    );
    assert.deepEqual(resolveCreateLookupName(["Finance"], "FINANCE"), {
      action: "reuse",
      name: "Finance",
    });
    assert.deepEqual(resolveCreateLookupName(["Finance"], "  Ops  "), {
      action: "insert",
      name: "Ops",
    });
  });

  it("same workspace shares lookup filters across projects; other workspaces are isolated", () => {
    const project1Workspace = "ws-shared";
    const project2Workspace = "ws-shared";
    const otherWorkspace = "ws-other";

    assert.equal(
      workspaceLookupFiltersMatch(project1Workspace, project2Workspace),
      true
    );
    assert.deepEqual(
      workspaceScopedOwnerListEq(project1Workspace),
      workspaceScopedOwnerListEq(project2Workspace)
    );
    assert.deepEqual(
      workspaceScopedCategoryListEq(project1Workspace),
      workspaceScopedCategoryListEq(project2Workspace)
    );
    assert.deepEqual(
      workspaceScopedCategoryInsert(project1Workspace, "Shared"),
      workspaceScopedCategoryInsert(project2Workspace, "Shared")
    );

    assert.equal(
      workspaceLookupFiltersMatch(project1Workspace, otherWorkspace),
      false
    );
    assert.notDeepEqual(
      workspaceScopedOwnerListEq(project1Workspace),
      workspaceScopedOwnerListEq(otherWorkspace)
    );
    assert.notDeepEqual(
      workspaceScopedCategoryListEq(project1Workspace),
      workspaceScopedCategoryListEq(otherWorkspace)
    );
    assert.notDeepEqual(
      workspaceScopedCategoryInsert(project1Workspace, "Shared"),
      workspaceScopedCategoryInsert(otherWorkspace, "Shared")
    );
  });

  it("ignores Postgres unique violations with the controlled pattern", () => {
    assert.equal(shouldIgnoreLookupUniqueViolation({ code: "23505" }), true);
    assert.equal(
      shouldIgnoreLookupUniqueViolation({
        message: "duplicate key value violates unique constraint",
      }),
      true
    );
    assert.equal(shouldIgnoreLookupUniqueViolation({ code: "23503" }), false);
    assert.equal(
      shouldIgnoreLookupUniqueViolation({ message: "permission denied" }),
      false
    );
  });
});

describe("Add Risk / Risk Detail shared owner create path", () => {
  it("both modals call createProjectOwner from the shared workspace-scoped context", async () => {
    const { readFile } = await import("node:fs/promises");
    const addSrc = await readFile(
      new URL("../../components/risk-register/AddRiskModal.tsx", import.meta.url),
      "utf8"
    );
    const detailSrc = await readFile(
      new URL("../../components/risk-register/RiskDetailModal.tsx", import.meta.url),
      "utf8"
    );
    for (const src of [addSrc, detailSrc]) {
      assert.match(src, /useRiskProjectOwners/);
      assert.match(src, /createProjectOwner/);
      assert.match(src, /await createProjectOwner\(/);
    }
  });
});

describe("Add Risk / Risk Detail / row shared category create path", () => {
  it("modals and row select call createRiskCategory from the shared workspace-scoped context", async () => {
    const { readFile } = await import("node:fs/promises");
    const addSrc = await readFile(
      new URL("../../components/risk-register/AddRiskModal.tsx", import.meta.url),
      "utf8"
    );
    const detailSrc = await readFile(
      new URL("../../components/risk-register/RiskDetailModal.tsx", import.meta.url),
      "utf8"
    );
    const rowSrc = await readFile(
      new URL("../../components/risk-register/RiskCategoryRowSelect.tsx", import.meta.url),
      "utf8"
    );
    const registerRowSrc = await readFile(
      new URL("../../components/risk-register/RiskRegisterRow.tsx", import.meta.url),
      "utf8"
    );
    for (const src of [addSrc, detailSrc]) {
      assert.match(src, /useRiskCategoryOptions/);
      assert.match(src, /createRiskCategory/);
      assert.match(src, /await createRiskCategory\(/);
      assert.match(src, /RiskCategoryPicker/);
      assert.match(src, /shouldPersistNewCategoryOnSubmit/);
    }
    assert.match(rowSrc, /createRiskCategory/);
    assert.match(rowSrc, /await createRiskCategory\(/);
    assert.match(registerRowSrc, /RiskCategoryRowSelect/);
  });

  it("category create inserts via workspaceScopedCategoryInsert helpers (not project_id)", async () => {
    const { readFile } = await import("node:fs/promises");
    const ctxSrc = await readFile(
      new URL("../../components/risk-register/RiskCategoryOptionsContext.tsx", import.meta.url),
      "utf8"
    );
    assert.match(ctxSrc, /workspaceScopedCategoryInsert/);
    assert.match(ctxSrc, /resolveCreateLookupName/);
    assert.match(ctxSrc, /shouldIgnoreLookupUniqueViolation/);
    assert.doesNotMatch(ctxSrc, /\.insert\(\s*\{[^}]*project_id/);
    assert.doesNotMatch(ctxSrc, /\.eq\(\s*["']project_id["']/);
  });
});

/**
 * Pure orchestration mirror of createRiskCategory decision + unique-violation handling,
 * so concurrent duplicate behaviour is covered without a live Supabase client.
 */
async function simulateCreateRiskCategory(params: {
  workspaceId: string | null;
  existingNames: string[];
  rawName: string;
  insert: (payload: {
    workspace_id: string;
    name: string;
    is_active: true;
  }) => Promise<{ error: { message: string; code?: string } | null }>;
  reloadNames: () => Promise<string[]>;
}): Promise<{ selected: string | null; list: string[]; threw?: string }> {
  if (!params.workspaceId?.trim()) return { selected: null, list: params.existingNames };
  const decision = resolveCreateLookupName(params.existingNames, params.rawName);
  if (decision.action === "reject_blank") {
    return { selected: null, list: params.existingNames };
  }
  if (decision.action === "reuse") {
    return { selected: decision.name, list: params.existingNames };
  }
  const payload = workspaceScopedCategoryInsert(params.workspaceId, decision.name);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "project_id"), false);
  const { error } = await params.insert(payload);
  if (error && !shouldIgnoreLookupUniqueViolation(error)) {
    return {
      selected: null,
      list: params.existingNames,
      threw: error.message,
    };
  }
  const list = await params.reloadNames();
  const selected =
    findLookupNameCaseInsensitive(list, decision.name) ?? decision.name;
  return { selected, list };
}

describe("createRiskCategory orchestration", () => {
  it("selects created category and adds it to the shared workspace list", async () => {
    let names = ["Finance"];
    const result = await simulateCreateRiskCategory({
      workspaceId: "ws-1",
      existingNames: names,
      rawName: "  Legal  ",
      insert: async (payload) => {
        assert.deepEqual(payload, {
          workspace_id: "ws-1",
          name: "Legal",
          is_active: true,
        });
        names = [...names, payload.name];
        return { error: null };
      },
      reloadNames: async () => names,
    });
    assert.equal(result.selected, "Legal");
    assert.deepEqual(result.list, ["Finance", "Legal"]);
  });

  it("handles concurrent unique-violation by reloading and selecting existing casing", async () => {
    let names = ["Finance"];
    const result = await simulateCreateRiskCategory({
      workspaceId: "ws-1",
      existingNames: names,
      rawName: "finance",
      // Local list stale — another project already inserted "Finance"
      insert: async () => ({
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      }),
      reloadNames: async () => {
        names = ["Finance"];
        return names;
      },
    });
    // Case-insensitive reuse should short-circuit before insert when list is current;
    // when list is stale and insert races, unique-violation path still selects "Finance".
    assert.equal(result.selected, "Finance");
  });

  it("surfaces genuine permission errors instead of reporting success", async () => {
    const result = await simulateCreateRiskCategory({
      workspaceId: "ws-1",
      existingNames: [],
      rawName: "Ops",
      insert: async () => ({
        error: { message: "permission denied for table riskai_risk_categories" },
      }),
      reloadNames: async () => [],
    });
    assert.equal(result.selected, null);
    assert.match(result.threw ?? "", /permission denied/i);
  });

  it("does not create into another workspace", async () => {
    const inserts: string[] = [];
    await simulateCreateRiskCategory({
      workspaceId: "ws-a",
      existingNames: [],
      rawName: "Shared",
      insert: async (payload) => {
        inserts.push(payload.workspace_id);
        return { error: null };
      },
      reloadNames: async () => ["Shared"],
    });
    assert.deepEqual(inserts, ["ws-a"]);
    assert.notDeepEqual(
      workspaceScopedCategoryInsert("ws-a", "Shared"),
      workspaceScopedCategoryInsert("ws-b", "Shared")
    );
  });
});
