import "server-only";

import { cache } from "react";
import { fetchWorkspaceProductAccessForUser } from "@visualify/workspace-product-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import { productConfig } from "@/lib/product-config";
import { supabaseServerClient } from "@/lib/supabase/server";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

export type { EntitledWorkspace };

async function getReportEntitledWorkspacesImpl(
  supabase: SupabaseClient,
  userId: string,
): Promise<EntitledWorkspace[]> {
  const rows = await fetchWorkspaceProductAccessForUser(supabase, userId);
  const productKey = productConfig.PRODUCT_KEY;

  const bySlug = new Map<string, string>();
  for (const row of rows) {
    if (row.productKey !== productKey) continue;
    const slug = row.workspaceSlug?.trim();
    if (!slug || bySlug.has(slug)) continue;
    bySlug.set(slug, row.workspaceName?.trim() || slug);
  }

  if (bySlug.size === 0) {
    return [];
  }

  const slugs = [...bySlug.keys()];
  const { data, error } = await supabase
    .from("visualify_workspaces")
    .select("id, name, slug, website_url, logo_url")
    .in("slug", slugs);

  if (error) {
    console.error("[report] getReportEntitledWorkspaces:", error.message);
    return [];
  }

  const entitled: EntitledWorkspace[] = [];
  for (const row of data ?? []) {
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!slug || !id) continue;
    entitled.push({
      id,
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : bySlug.get(slug) ?? slug,
      slug,
      website_url: typeof row.website_url === "string" && row.website_url.trim() ? row.website_url.trim() : null,
      logo_url: typeof row.logo_url === "string" && row.logo_url.trim() ? row.logo_url.trim() : null,
    });
  }

  return entitled.sort((a, b) => a.name.localeCompare(b.name));
}

async function getReportEntitledWorkspacesForUser(userId: string): Promise<EntitledWorkspace[]> {
  const id = userId.trim();
  if (!id) {
    return [];
  }

  const supabase = await supabaseServerClient();
  return getReportEntitledWorkspacesImpl(supabase, id);
}

/**
 * Workspaces where the user has active Report product entitlement.
 * Resolves `visualify_workspaces.id` from entitled slugs (RLS applies).
 *
 * Wrapped in `cache()` keyed by `userId` so repeated lookups in the same request
 * (e.g. workspace resolution + project list membership check) share one query.
 */
const getReportEntitledWorkspacesCached = cache(getReportEntitledWorkspacesForUser);

export async function getReportEntitledWorkspaces(
  _supabase: SupabaseClient,
  userId: string,
): Promise<EntitledWorkspace[]> {
  return getReportEntitledWorkspacesCached(userId);
}
