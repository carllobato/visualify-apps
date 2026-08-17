import type { WorkspaceRole } from "@visualify/workspace-product-access";
import { workspaceOverviewPath } from "@/lib/routes";

export const CREATE_WORKSPACE_API_PATH = "/api/workspaces";
export const WORKSPACE_NAME_MAX = 120;

export const RISKAI_WORKSPACE_CREATE_DEFAULTS = {
  workspaceType: "organisation",
  status: "active",
  ownerRole: "owner",
  memberStatus: "active",
  subscriptionStatus: "active",
  plan: "free",
} as const;

export const RISKAI_WORKSPACE_CREATE_TABLES = [
  "visualify_workspaces",
  "visualify_workspace_members",
  "visualify_workspace_products",
] as const;

const SLUG_INSERT_ATTEMPTS = 5;

export type CreateWorkspaceResult =
  | { ok: true; workspaceId: string }
  | {
      ok: false;
      code: "INVALID_INPUT" | "UNAUTHORIZED" | "FORBIDDEN" | "SERVICE_ROLE_UNAVAILABLE" | "DB_ERROR" | "PRODUCT_PROVISION_FAILED";
    };

export type ParseCreateWorkspaceBodyResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

export type RiskAiWorkspaceInsert = {
  name: string;
  slug: string;
  workspace_type: typeof RISKAI_WORKSPACE_CREATE_DEFAULTS.workspaceType;
  owner_user_id: string;
  status: typeof RISKAI_WORKSPACE_CREATE_DEFAULTS.status;
};

export type RiskAiWorkspaceMemberInsert = {
  workspace_id: string;
  user_id: string;
  role: typeof RISKAI_WORKSPACE_CREATE_DEFAULTS.ownerRole;
  status: typeof RISKAI_WORKSPACE_CREATE_DEFAULTS.memberStatus;
};

export type RiskAiWorkspaceProductInsert = {
  workspace_id: string;
  product_id: string;
  subscription_status: typeof RISKAI_WORKSPACE_CREATE_DEFAULTS.subscriptionStatus;
  plan: typeof RISKAI_WORKSPACE_CREATE_DEFAULTS.plan;
  expires_at: null;
};

export type RiskAiWorkspaceCreateRecords = {
  workspace: RiskAiWorkspaceInsert;
  member: RiskAiWorkspaceMemberInsert;
  product: RiskAiWorkspaceProductInsert;
};

/**
 * Creating a Workspace is a user/account-level action. Existing Workspace role is ignored.
 */
export function canCreateRiskAiWorkspace(input: {
  authenticated: boolean;
  hasRiskAiProductAccess: boolean;
  currentWorkspaceRole?: WorkspaceRole | null;
}): boolean {
  void input.currentWorkspaceRole;
  return input.authenticated && input.hasRiskAiProductAccess;
}

/**
 * Accepts only `name`. Client-supplied owner, product, role, plan, and entitlement fields are ignored.
 */
export function parseCreateWorkspaceRequestBody(body: unknown): ParseCreateWorkspaceBodyResult {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid JSON" };
  }

  const nameRaw = (body as Record<string, unknown>).name;
  if (nameRaw === undefined) {
    return { ok: false, error: "Workspace name is required" };
  }
  if (typeof nameRaw !== "string") {
    return { ok: false, error: "Invalid name" };
  }

  const name = nameRaw.trim();
  if (!name) {
    return { ok: false, error: "Workspace name is required" };
  }
  if (name.length > WORKSPACE_NAME_MAX) {
    return { ok: false, error: "Workspace name is too long" };
  }

  return { ok: true, name };
}

export function buildRiskAiWorkspaceInsert(params: {
  name: string;
  slug: string;
  ownerUserId: string;
}): RiskAiWorkspaceInsert {
  return {
    name: params.name,
    slug: params.slug,
    workspace_type: RISKAI_WORKSPACE_CREATE_DEFAULTS.workspaceType,
    owner_user_id: params.ownerUserId,
    status: RISKAI_WORKSPACE_CREATE_DEFAULTS.status,
  };
}

export function buildRiskAiOwnerMembershipInsert(params: {
  workspaceId: string;
  ownerUserId: string;
}): RiskAiWorkspaceMemberInsert {
  return {
    workspace_id: params.workspaceId,
    user_id: params.ownerUserId,
    role: RISKAI_WORKSPACE_CREATE_DEFAULTS.ownerRole,
    status: RISKAI_WORKSPACE_CREATE_DEFAULTS.memberStatus,
  };
}

export function buildRiskAiEntitlementInsert(params: {
  workspaceId: string;
  riskAiProductId: string;
}): RiskAiWorkspaceProductInsert {
  return {
    workspace_id: params.workspaceId,
    product_id: params.riskAiProductId,
    subscription_status: RISKAI_WORKSPACE_CREATE_DEFAULTS.subscriptionStatus,
    plan: RISKAI_WORKSPACE_CREATE_DEFAULTS.plan,
    expires_at: null,
  };
}

export function buildRiskAiWorkspaceCreateRecords(params: {
  name: string;
  slug: string;
  ownerUserId: string;
  workspaceId: string;
  riskAiProductId: string;
}): RiskAiWorkspaceCreateRecords {
  return {
    workspace: buildRiskAiWorkspaceInsert({
      name: params.name,
      slug: params.slug,
      ownerUserId: params.ownerUserId,
    }),
    member: buildRiskAiOwnerMembershipInsert({
      workspaceId: params.workspaceId,
      ownerUserId: params.ownerUserId,
    }),
    product: buildRiskAiEntitlementInsert({
      workspaceId: params.workspaceId,
      riskAiProductId: params.riskAiProductId,
    }),
  };
}

export function workspaceCreateSuccessPath(workspaceId: string): string {
  return workspaceOverviewPath(workspaceId);
}

export type CreateRiskAiWorkspaceDeps = {
  allocateUniqueWorkspaceSlug: (name: string) => Promise<string>;
  resolveRiskAiProductId: () => Promise<string>;
  insertWorkspace: (
    row: RiskAiWorkspaceInsert,
  ) => Promise<{ ok: true; workspaceId: string } | { ok: false; uniqueViolation: boolean }>;
  insertOwnerMembership: (row: RiskAiWorkspaceMemberInsert) => Promise<boolean>;
  insertRiskAiEntitlement: (row: RiskAiWorkspaceProductInsert) => Promise<boolean>;
  rollbackCreatedWorkspace: (workspaceId: string) => Promise<void>;
};

/**
 * Workspace + owner membership + RiskAI entitlement. Compensates with delete if a later write fails.
 * Does not create a Portfolio.
 */
export async function createRiskAiWorkspaceForOwner(
  deps: CreateRiskAiWorkspaceDeps,
  params: { ownerUserId: string; name: string },
): Promise<CreateWorkspaceResult> {
  const ownerUserId = params.ownerUserId.trim();
  const parsed = parseCreateWorkspaceRequestBody({ name: params.name });
  if (!ownerUserId || !parsed.ok) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  let productId: string;
  try {
    productId = await deps.resolveRiskAiProductId();
  } catch {
    return { ok: false, code: "PRODUCT_PROVISION_FAILED" };
  }
  if (!productId.trim()) {
    return { ok: false, code: "PRODUCT_PROVISION_FAILED" };
  }

  for (let slugAttempt = 0; slugAttempt < SLUG_INSERT_ATTEMPTS; slugAttempt++) {
    let slug: string;
    try {
      slug = await deps.allocateUniqueWorkspaceSlug(parsed.name);
    } catch {
      return { ok: false, code: "DB_ERROR" };
    }

    const inserted = await deps.insertWorkspace(
      buildRiskAiWorkspaceInsert({
        name: parsed.name,
        slug,
        ownerUserId,
      }),
    );
    if (!inserted.ok) {
      if (inserted.uniqueViolation) continue;
      return { ok: false, code: "DB_ERROR" };
    }

    const workspaceId = inserted.workspaceId;
    const memberOk = await deps.insertOwnerMembership(
      buildRiskAiOwnerMembershipInsert({ workspaceId, ownerUserId }),
    );
    if (!memberOk) {
      await deps.rollbackCreatedWorkspace(workspaceId);
      return { ok: false, code: "DB_ERROR" };
    }

    const productOk = await deps.insertRiskAiEntitlement(
      buildRiskAiEntitlementInsert({ workspaceId, riskAiProductId: productId }),
    );
    if (!productOk) {
      await deps.rollbackCreatedWorkspace(workspaceId);
      return { ok: false, code: "PRODUCT_PROVISION_FAILED" };
    }

    return { ok: true, workspaceId };
  }

  return { ok: false, code: "DB_ERROR" };
}
