import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

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

type UserProductGrantRow = {
  status: string | null;
  visualify_workspaces: Pick<WorkspaceEmbed, "name" | "slug" | "status"> | Pick<WorkspaceEmbed, "name" | "slug" | "status">[] | null;
  visualify_products: ProductEmbed | ProductEmbed[] | null;
};

type WorkspaceMemberSlugRow = {
  role: string;
  status: string | null;
  visualify_workspaces: { slug: string } | { slug: string }[] | null;
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

function normalizeProductKey(key: string | null | undefined): string | null {
  const normalized = key?.trim();
  return normalized || null;
}

type WorkspaceProductAccessCacheSlot = {
  promise: Promise<WorkspaceProductAccessRow[]> | null;
};

/** Per-request slot keyed by user id (survives distinct Supabase client instances in one render). */
const getWorkspaceProductAccessCacheSlot = cache(
  (userId: string): WorkspaceProductAccessCacheSlot => ({ promise: null }),
);

async function fetchWorkspaceProductAccessImpl(
  supabase: SupabaseClient,
  userId: string,
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
    `,
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

async function fetchMemberRoleByWorkspaceSlug(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("visualify_workspace_members")
    .select(
      `
      role,
      status,
      visualify_workspaces!inner ( slug )
    `,
    )
    .eq("user_id", userId);

  if (error) {
    console.error("fetchMemberRoleByWorkspaceSlug:", error.message);
    return new Map();
  }

  const roleBySlug = new Map<string, string>();
  for (const m of (data ?? []) as WorkspaceMemberSlugRow[]) {
    if (!isActiveStatus(m.status)) continue;
    for (const ws of asArray(m.visualify_workspaces)) {
      const slug = ws.slug?.trim();
      if (!slug || roleBySlug.has(slug)) continue;
      roleBySlug.set(slug, m.role);
    }
  }

  return roleBySlug;
}

/**
 * User-level product overrides (`visualify_user_product_grants`, status = active).
 * Workspace subscription checks are unchanged; grant rows are merged separately.
 */
async function fetchUserProductGrantAccessImpl(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkspaceProductAccessRow[]> {
  const [grantsResult, roleBySlug] = await Promise.all([
    supabase
      .from("visualify_user_product_grants")
      .select(
        `
        status,
        visualify_workspaces!inner (
          name,
          slug,
          status
        ),
        visualify_products!inner (
          key,
          name
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "active"),
    fetchMemberRoleByWorkspaceSlug(supabase, userId),
  ]);

  if (grantsResult.error) {
    console.error("fetchUserProductGrantAccessImpl:", grantsResult.error.message);
    return [];
  }

  const rows: WorkspaceProductAccessRow[] = [];

  for (const grant of (grantsResult.data ?? []) as UserProductGrantRow[]) {
    if (!isActiveStatus(grant.status)) continue;

    for (const ws of asArray(grant.visualify_workspaces)) {
      if (!isActiveStatus(ws.status)) continue;

      const workspaceSlug = ws.slug?.trim();
      if (!workspaceSlug) continue;

      for (const prod of asArray(grant.visualify_products)) {
        const productKey = normalizeProductKey(prod?.key);
        if (!productKey) continue;

        rows.push({
          productKey,
          productName: prod.name?.trim() || productKey,
          workspaceName: ws.name,
          workspaceSlug,
          memberRole: roleBySlug.get(workspaceSlug) ?? "",
          subscriptionStatus: "grant",
          plan: null,
        });
      }
    }
  }

  return rows;
}

function mergeWorkspaceAndGrantProductAccessRows(
  workspaceRows: WorkspaceProductAccessRow[],
  grantRows: WorkspaceProductAccessRow[],
): WorkspaceProductAccessRow[] {
  const seen = new Set<string>();
  const merged: WorkspaceProductAccessRow[] = [];

  for (const row of workspaceRows) {
    const slug = row.workspaceSlug?.trim();
    const productKey = normalizeProductKey(row.productKey);
    if (!slug || !productKey) continue;
    const key = `${slug}\0${productKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  for (const row of grantRows) {
    const slug = row.workspaceSlug?.trim();
    const productKey = normalizeProductKey(row.productKey);
    if (!slug || !productKey) continue;
    const key = `${slug}\0${productKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  return merged;
}

async function fetchCombinedProductAccessForUserImpl(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkspaceProductAccessRow[]> {
  const [workspaceRows, grantRows] = await Promise.all([
    fetchWorkspaceProductAccessImpl(supabase, userId),
    fetchUserProductGrantAccessImpl(supabase, userId),
  ]);
  return mergeWorkspaceAndGrantProductAccessRows(workspaceRows, grantRows);
}

/**
 * Loads product access for a Supabase auth user (RLS applies to `supabase`).
 *
 * Includes workspace subscription entitlements and active rows in
 * `visualify_user_product_grants` (merged without altering workspace subscription checks).
 *
 * Memoized per React request via {@link getWorkspaceProductAccessCacheSlot} so layout, product
 * gates, and app-catalog loaders share one entitlement query for the same user.
 */
export async function fetchWorkspaceProductAccessForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkspaceProductAccessRow[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  const slot = getWorkspaceProductAccessCacheSlot(normalizedUserId);
  slot.promise ??= fetchCombinedProductAccessForUserImpl(supabase, normalizedUserId);
  return slot.promise;
}

export async function hasProductAccess(
  supabase: SupabaseClient,
  userId: string,
  productKey: string,
): Promise<boolean> {
  const normalizedProductKey = normalizeProductKey(productKey);
  if (!normalizedProductKey) return false;

  const rows = await fetchWorkspaceProductAccessForUser(supabase, userId);
  return rows.some((r) => normalizeProductKey(r.productKey) === normalizedProductKey);
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
    const k = normalizeProductKey(r.productKey);
    if (k) keys.add(k);
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}
