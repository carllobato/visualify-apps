import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORKSPACE_ROLES, type WorkspaceRole } from "@visualify/workspace-product-access";
import {
  CREATE_WORKSPACE_API_PATH,
  RISKAI_WORKSPACE_CREATE_DEFAULTS,
  RISKAI_WORKSPACE_CREATE_TABLES,
  WORKSPACE_NAME_MAX,
  buildRiskAiWorkspaceCreateRecords,
  canCreateRiskAiWorkspace,
  createRiskAiWorkspaceForOwner,
  parseCreateWorkspaceRequestBody,
  workspaceCreateSuccessPath,
  type CreateRiskAiWorkspaceDeps,
} from "./createWorkspace.logic";

const AUTHENTICATED_USER_ID = "user-auth";
const RISKAI_PRODUCT_ID = "45468c15-9627-4983-bf15-0421dbaf80d4";
const OTHER_PRODUCT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_USER_ID = "user-other";

describe("canCreateRiskAiWorkspace", () => {
  it("allows an authenticated RiskAI user regardless of their role in an existing Workspace", () => {
    const roles: Array<WorkspaceRole | null> = [...WORKSPACE_ROLES, null];
    for (const currentWorkspaceRole of roles) {
      assert.equal(
        canCreateRiskAiWorkspace({
          authenticated: true,
          currentWorkspaceRole,
        }),
        true,
        `role=${currentWorkspaceRole}`,
      );
    }
  });

  it("allows an authenticated user with zero Workspaces to create their first Workspace", () => {
    assert.equal(
      canCreateRiskAiWorkspace({
        authenticated: true,
        currentWorkspaceRole: null,
      }),
      true,
    );
  });

  it("does not require an existing RiskAI Workspace entitlement or user-level product grant", () => {
    assert.equal(canCreateRiskAiWorkspace({ authenticated: true }), true);
  });

  it("does not allow an unauthenticated user to create", () => {
    assert.equal(
      canCreateRiskAiWorkspace({
        authenticated: false,
        currentWorkspaceRole: "owner",
      }),
      false,
    );
  });
});

describe("parseCreateWorkspaceRequestBody", () => {
  it("accepts a Workspace name", () => {
    assert.deepEqual(parseCreateWorkspaceRequestBody({ name: "  Northwind  " }), {
      ok: true,
      name: "Northwind",
    });
  });

  it("rejects an empty or whitespace Workspace name", () => {
    assert.deepEqual(parseCreateWorkspaceRequestBody({ name: "" }), {
      ok: false,
      error: "Workspace name is required",
    });
    assert.deepEqual(parseCreateWorkspaceRequestBody({ name: "   " }), {
      ok: false,
      error: "Workspace name is required",
    });
    assert.deepEqual(parseCreateWorkspaceRequestBody({}), {
      ok: false,
      error: "Workspace name is required",
    });
  });

  it("rejects a non-string name", () => {
    assert.deepEqual(parseCreateWorkspaceRequestBody({ name: 12 }), {
      ok: false,
      error: "Invalid name",
    });
  });

  it("rejects a name longer than the maximum", () => {
    const result = parseCreateWorkspaceRequestBody({ name: "a".repeat(WORKSPACE_NAME_MAX + 1) });
    assert.deepEqual(result, { ok: false, error: "Workspace name is too long" });
  });

  it("ignores client-supplied owner, product, role, entitlement, and plan fields", () => {
    const result = parseCreateWorkspaceRequestBody({
      name: "Northwind",
      owner_user_id: OTHER_USER_ID,
      product_id: OTHER_PRODUCT_ID,
      product_key: "report",
      role: "viewer",
      status: "invited",
      subscription_status: "trial",
      plan: "enterprise",
      workspace_type: "personal",
    });
    assert.deepEqual(result, { ok: true, name: "Northwind" });
  });
});

describe("buildRiskAiWorkspaceCreateRecords", () => {
  const records = buildRiskAiWorkspaceCreateRecords({
    name: "Northwind",
    slug: "northwind",
    ownerUserId: AUTHENTICATED_USER_ID,
    workspaceId: "ws-new",
    riskAiProductId: RISKAI_PRODUCT_ID,
  });

  it("sets the authenticated creator as Workspace owner", () => {
    assert.equal(records.workspace.owner_user_id, AUTHENTICATED_USER_ID);
    assert.equal(records.workspace.status, "active");
    assert.equal(records.workspace.workspace_type, "organisation");
    assert.equal("reporting_unit" in records.workspace, false);
  });

  it("creates an active Owner membership for the authenticated creator", () => {
    assert.deepEqual(records.member, {
      workspace_id: "ws-new",
      user_id: AUTHENTICATED_USER_ID,
      role: "owner",
      status: "active",
    });
  });

  it("attaches an active RiskAI-only free entitlement and no other product", () => {
    assert.deepEqual(records.product, {
      workspace_id: "ws-new",
      product_id: RISKAI_PRODUCT_ID,
      subscription_status: "active",
      plan: "free",
      expires_at: null,
    });
    assert.equal(records.product.plan, RISKAI_WORKSPACE_CREATE_DEFAULTS.plan);
    assert.notEqual(records.product.product_id, OTHER_PRODUCT_ID);
  });

  it("does not include a Portfolio write in the created state", () => {
    assert.deepEqual(Object.keys(records).sort(), ["member", "product", "workspace"]);
    assert.equal("portfolio" in records, false);
    assert.deepEqual([...RISKAI_WORKSPACE_CREATE_TABLES], [
      "visualify_workspaces",
      "visualify_workspace_members",
      "visualify_workspace_products",
    ]);
    assert.equal(
      RISKAI_WORKSPACE_CREATE_TABLES.includes(
        "visualify_portfolios" as (typeof RISKAI_WORKSPACE_CREATE_TABLES)[number],
      ),
      false,
    );
  });
});

describe("createRiskAiWorkspaceForOwner", () => {
  function makeDeps(options?: {
    memberOk?: boolean;
    productOk?: boolean;
    productId?: string;
  }): CreateRiskAiWorkspaceDeps & {
    writes: Array<{ table: string; row: Record<string, unknown> }>;
    rollbacks: string[];
  } {
    const writes: Array<{ table: string; row: Record<string, unknown> }> = [];
    const rollbacks: string[] = [];
    return {
      writes,
      rollbacks,
      allocateUniqueWorkspaceSlug: async (name) => name.trim().toLowerCase().replace(/\s+/g, "-"),
      resolveRiskAiProductId: async () => options?.productId ?? RISKAI_PRODUCT_ID,
      insertWorkspace: async (row) => {
        writes.push({ table: "visualify_workspaces", row: { ...row } });
        return { ok: true, workspaceId: "ws-new" };
      },
      insertOwnerMembership: async (row) => {
        writes.push({ table: "visualify_workspace_members", row: { ...row } });
        return options?.memberOk !== false;
      },
      insertRiskAiEntitlement: async (row) => {
        writes.push({ table: "visualify_workspace_products", row: { ...row } });
        return options?.productOk !== false;
      },
      rollbackCreatedWorkspace: async (workspaceId) => {
        rollbacks.push(workspaceId);
      },
    };
  }

  it("returns the new Workspace identity required for routing", async () => {
    const deps = makeDeps();
    const result = await createRiskAiWorkspaceForOwner(deps, {
      ownerUserId: AUTHENTICATED_USER_ID,
      name: "Northwind",
    });
    assert.deepEqual(result, { ok: true, workspaceId: "ws-new" });
    assert.equal(workspaceCreateSuccessPath(result.ok ? result.workspaceId : ""), "/workspaces/ws-new");
    assert.equal(CREATE_WORKSPACE_API_PATH, "/api/workspaces");
  });

  it("always uses the authenticated user as owner, not a client-supplied id", async () => {
    const deps = makeDeps();
    await createRiskAiWorkspaceForOwner(deps, {
      ownerUserId: AUTHENTICATED_USER_ID,
      name: "Northwind",
    });
    const workspace = deps.writes.find((write) => write.table === "visualify_workspaces");
    const member = deps.writes.find((write) => write.table === "visualify_workspace_members");
    assert.equal(workspace?.row.owner_user_id, AUTHENTICATED_USER_ID);
    assert.equal(member?.row.user_id, AUTHENTICATED_USER_ID);
    assert.notEqual(workspace?.row.owner_user_id, OTHER_USER_ID);
  });

  it("attaches the resolved RiskAI product and ignores another product id", async () => {
    const deps = makeDeps();
    await createRiskAiWorkspaceForOwner(deps, {
      ownerUserId: AUTHENTICATED_USER_ID,
      name: "Northwind",
    });
    const product = deps.writes.find((write) => write.table === "visualify_workspace_products");
    assert.equal(product?.row.product_id, RISKAI_PRODUCT_ID);
    assert.equal(product?.row.plan, "free");
    assert.equal(product?.row.subscription_status, "active");
    assert.equal(product?.row.expires_at, null);
    assert.notEqual(product?.row.product_id, OTHER_PRODUCT_ID);
  });

  it("does not write a user-level product grant", async () => {
    const deps = makeDeps();
    await createRiskAiWorkspaceForOwner(deps, {
      ownerUserId: AUTHENTICATED_USER_ID,
      name: "Northwind",
    });
    assert.equal(
      deps.writes.some((write) => write.table === "visualify_user_product_grants"),
      false,
    );
    assert.equal(
      deps.writes.some((write) => write.table === "visualify_user_product_access"),
      false,
    );
  });

  it("does not write a Portfolio", async () => {
    const deps = makeDeps();
    await createRiskAiWorkspaceForOwner(deps, {
      ownerUserId: AUTHENTICATED_USER_ID,
      name: "Northwind",
    });
    assert.equal(
      deps.writes.some((write) => write.table === "visualify_portfolios"),
      false,
    );
    assert.deepEqual(
      deps.writes.map((write) => write.table),
      [...RISKAI_WORKSPACE_CREATE_TABLES],
    );
  });

  it("rolls back when owner membership creation fails", async () => {
    const deps = makeDeps({ memberOk: false });
    const result = await createRiskAiWorkspaceForOwner(deps, {
      ownerUserId: AUTHENTICATED_USER_ID,
      name: "Northwind",
    });
    assert.deepEqual(result, { ok: false, code: "DB_ERROR" });
    assert.deepEqual(deps.rollbacks, ["ws-new"]);
  });

  it("rolls back when RiskAI entitlement creation fails", async () => {
    const deps = makeDeps({ productOk: false });
    const result = await createRiskAiWorkspaceForOwner(deps, {
      ownerUserId: AUTHENTICATED_USER_ID,
      name: "Northwind",
    });
    assert.deepEqual(result, { ok: false, code: "PRODUCT_PROVISION_FAILED" });
    assert.deepEqual(deps.rollbacks, ["ws-new"]);
  });
});
