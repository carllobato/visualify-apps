import type { SupabaseClient } from "@supabase/supabase-js";

export {
  WORKSPACE_ROLES,
  WORKSPACE_ROLE_RANK,
  WORKSPACE_ROLES_BY_DESCENDING_PRIVILEGE,
  type WorkspaceRole,
  isWorkspaceRole,
  normalizeWorkspaceRole,
  workspaceRoleRank,
  isWorkspaceRoleAtLeast,
  canAssignWorkspaceRole,
} from "./workspaceRoles";

/**
 * One workspace entitlement to a product (flattened from the members → workspaces →
 * workspace_products → products chain).
 */
export type WorkspaceProductAccessRow = {
  productKey: string;
  productName: string;
  workspaceName: string;
  workspaceSlug: string;
  memberRole: string;
  subscriptionStatus: string;
  plan: string | null;
};

type ProductEmbed = {
  key: string;
  name: string | null;
};

type WorkspaceProductEmbed = {
  subscription_status: string;
  plan: string | null;
  visualify_products: ProductEmbed | ProductEmbed[] | null;
};

type WorkspaceEmbed = {
  name: string;
  slug: string;
  status: string | null;
  visualify_workspace_products: WorkspaceProductEmbed | WorkspaceProductEmbed[] | null;
};

type MemberRow = {
  role: string;
  status: string | null;
  visualify_workspaces: WorkspaceEmbed | WorkspaceEmbed[] | null;
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function isActiveStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.toLowerCase() === "active";
}

function isBillableSubscription(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const v = value.toLowerCase();
  return v === "active" || v === "trial";
}

/**
 * Loads workspace-linked product access for a Supabase auth user (RLS applies to `supabase`).
 */
export async function fetchWorkspaceProductAccessForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkspaceProductAccessRow[]> {
  const { data, error } = await supabase
    .from("visualify_workspace_members")
    .select(
      `
      role,
      status,
      visualify_workspaces!inner (
        name,
        slug,
        status,
        visualify_workspace_products!inner (
          subscription_status,
          plan,
          visualify_products!inner (
            key,
            name
          )
        )
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("fetchWorkspaceProductAccessForUser:", error.message);
    return [];
  }

  const rows: WorkspaceProductAccessRow[] = [];

  for (const m of (data ?? []) as MemberRow[]) {
    if (!isActiveStatus(m.status)) continue;

    for (const ws of asArray(m.visualify_workspaces)) {
      if (!isActiveStatus(ws.status)) continue;

      for (const wp of asArray(ws.visualify_workspace_products)) {
        if (!isBillableSubscription(wp.subscription_status)) continue;

        for (const prod of asArray(wp.visualify_products)) {
          if (!prod?.key) continue;

          rows.push({
            productKey: prod.key,
            productName: prod.name?.trim() || prod.key,
            workspaceName: ws.name,
            workspaceSlug: ws.slug,
            memberRole: m.role,
            subscriptionStatus: wp.subscription_status,
            plan: wp.plan,
          });
        }
      }
    }
  }

  return rows;
}

export async function hasProductAccess(
  supabase: SupabaseClient,
  userId: string,
  productKey: string
): Promise<boolean> {
  const rows = await fetchWorkspaceProductAccessForUser(supabase, userId);
  return rows.some((r) => r.productKey === productKey);
}

/**
 * Flattens {@link fetchWorkspaceProductAccessForUser} into catalog `id` keys (aligned with
 * `visualify_products.key` and Account → Apps catalog entries).
 */
export async function fetchWorkspaceEntitledProductKeysForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<readonly string[]> {
  const rows = await fetchWorkspaceProductAccessForUser(supabase, userId);
  const keys = new Set<string>();
  for (const r of rows) {
    const k = r.productKey?.trim();
    if (k) keys.add(k);
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}
