import "server-only";

import { supabaseServerClient } from "@/lib/supabase/server";

/**
 * Workspace-scoped product rows for HQ admin. Billing and enablement attach to `visualify_workspace_products`
 * on a workspace, not to individual user accounts.
 */
export type AttachedWorkspaceProduct = {
  productKey: string;
  productName: string;
  subscriptionStatus: string;
  plan: string | null;
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function isBillableSubscriptionStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const v = value.toLowerCase();
  return v === "active" || v === "trial";
}

type ProductEmbed = { key: string; name: string | null };
type WpRow = {
  subscription_status: string | null;
  plan: string | null;
  visualify_products: ProductEmbed | ProductEmbed[] | null;
};

/**
 * All products attached to a workspace (any subscription status), for HQ Apps admin UI.
 */
export async function fetchAttachedWorkspaceProducts(workspaceId: string): Promise<AttachedWorkspaceProduct[]> {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_workspaces")
    .select(
      `
      visualify_workspace_products (
        subscription_status,
        plan,
        visualify_products ( key, name )
      )
    `
    )
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("fetchAttachedWorkspaceProducts:", error.message);
    return [];
  }

  const ws = data as { visualify_workspace_products: WpRow | WpRow[] | null } | null;
  if (!ws) return [];

  const out: AttachedWorkspaceProduct[] = [];

  for (const wp of asArray(ws.visualify_workspace_products)) {
    for (const prod of asArray(wp.visualify_products)) {
      if (!prod?.key) continue;
      out.push({
        productKey: prod.key,
        productName: prod.name?.trim() || prod.key,
        subscriptionStatus: wp.subscription_status ?? "",
        plan: wp.plan ?? null,
      });
    }
  }

  return out;
}

function dedupeByProductKey(rows: AttachedWorkspaceProduct[]): AttachedWorkspaceProduct[] {
  const seen = new Map<string, AttachedWorkspaceProduct>();
  for (const r of rows) {
    if (!seen.has(r.productKey)) seen.set(r.productKey, r);
  }
  return [...seen.values()];
}

export function partitionWorkspaceProductsForAppsPage(rows: AttachedWorkspaceProduct[]): {
  active: AttachedWorkspaceProduct[];
  activeProductKeys: Set<string>;
} {
  const unique = dedupeByProductKey(rows);
  const active: AttachedWorkspaceProduct[] = [];
  const activeProductKeys = new Set<string>();

  for (const row of unique) {
    if (isBillableSubscriptionStatus(row.subscriptionStatus)) {
      active.push(row);
      activeProductKeys.add(row.productKey);
    }
  }

  return { active, activeProductKeys };
}
