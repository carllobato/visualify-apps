import "server-only";

import { cache } from "react";
import { getProductDashboardUrl } from "@visualify/urls";
import { supabaseServerClient } from "@/lib/supabase/server";
import {
  fetchVisibleWorkspacesForDashboard,
  fetchVisibleWorkspacesForRail,
  type WorkspaceDashboardEntry,
} from "@/lib/workspace-settings-data";
import {
  isBillableSubscriptionStatus,
  type AttachedWorkspaceProduct,
} from "@/lib/workspace-apps-data";
import { VISUALIFY_APP_CATALOG } from "@/lib/visualify-apps";

export type WorkspaceAppNavLine = {
  label: string;
  href: string;
};

export type WorkspaceAppNav = {
  productKey: string;
  productName: string;
  launchHref: string | null;
  lines: WorkspaceAppNavLine[];
};

export type DashboardWorkspaceLauncherEntry = WorkspaceDashboardEntry & {
  apps: WorkspaceAppNav[];
};

type ProductEmbed = { key: string; name: string | null };
type WpRow = {
  subscription_status: string | null;
  visualify_products: ProductEmbed | ProductEmbed[] | null;
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

async function fetchActiveProductsByWorkspaceIds(
  workspaceIds: string[],
): Promise<Map<string, AttachedWorkspaceProduct[]>> {
  const out = new Map<string, AttachedWorkspaceProduct[]>();
  if (workspaceIds.length === 0) return out;

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_workspaces")
    .select(
      `
      id,
      visualify_workspace_products (
        subscription_status,
        plan,
        visualify_products ( key, name )
      )
    `,
    )
    .in("id", workspaceIds);

  if (error) {
    console.error("fetchActiveProductsByWorkspaceIds:", error.message);
    return out;
  }

  for (const row of (data ?? []) as { id: string; visualify_workspace_products: WpRow | WpRow[] | null }[]) {
    const products: AttachedWorkspaceProduct[] = [];
    const seen = new Set<string>();

    for (const wp of asArray(row.visualify_workspace_products)) {
      if (!isBillableSubscriptionStatus(wp.subscription_status)) continue;
      for (const prod of asArray(wp.visualify_products)) {
        if (!prod?.key || seen.has(prod.key)) continue;
        seen.add(prod.key);
        products.push({
          productKey: prod.key,
          productName: prod.name?.trim() || prod.key,
          subscriptionStatus: wp.subscription_status ?? "",
          plan: null,
        });
      }
    }

    products.sort((a, b) => a.productName.localeCompare(b.productName));
    out.set(row.id, products);
  }

  return out;
}

async function fetchRiskAiNavStatsByWorkspaceIds(
  workspaceIds: string[],
): Promise<Map<string, { portfolioCount: number; projectCount: number }>> {
  const stats = new Map(workspaceIds.map((id) => [id, { portfolioCount: 0, projectCount: 0 }]));
  if (workspaceIds.length === 0) return stats;

  const supabase = await supabaseServerClient();

  const [
    { data: portfolios, error: portfolioErr },
    { data: projectsInWorkspace, error: wsProjErr },
  ] = await Promise.all([
    supabase.from("visualify_portfolios").select("id, workspace_id").in("workspace_id", workspaceIds),
    supabase
      .from("visualify_projects")
      .select("id, workspace_id, portfolio_id")
      .in("workspace_id", workspaceIds),
  ]);

  if (portfolioErr) {
    console.error("fetchRiskAiNavStatsByWorkspaceIds portfolios:", portfolioErr.message);
    return stats;
  }

  const portfolioIds: string[] = [];
  const portfolioWorkspace = new Map<string, string>();

  for (const row of (portfolios ?? []) as { id: string; workspace_id: string | null }[]) {
    const wsId = typeof row.workspace_id === "string" ? row.workspace_id.trim() : "";
    if (!wsId || !stats.has(wsId)) continue;
    stats.get(wsId)!.portfolioCount += 1;
    portfolioIds.push(row.id);
    portfolioWorkspace.set(row.id, wsId);
  }

  const projectIdsSeen = new Set<string>();

  if (wsProjErr) {
    console.error("fetchRiskAiNavStatsByWorkspaceIds workspace projects:", wsProjErr.message);
  } else {
    for (const row of (projectsInWorkspace ?? []) as {
      id: string;
      workspace_id: string | null;
      portfolio_id: string | null;
    }[]) {
      if (projectIdsSeen.has(row.id)) continue;
      projectIdsSeen.add(row.id);
      const wsId =
        (typeof row.workspace_id === "string" && row.workspace_id.trim()) ||
        (row.portfolio_id ? portfolioWorkspace.get(row.portfolio_id) : undefined);
      if (wsId && stats.has(wsId)) stats.get(wsId)!.projectCount += 1;
    }
  }

  if (portfolioIds.length > 0) {
    const { data: projectsInPortfolio, error: pfProjErr } = await supabase
      .from("visualify_projects")
      .select("id, portfolio_id")
      .in("portfolio_id", portfolioIds);

    if (pfProjErr) {
      console.error("fetchRiskAiNavStatsByWorkspaceIds portfolio projects:", pfProjErr.message);
    } else {
      for (const row of (projectsInPortfolio ?? []) as { id: string; portfolio_id: string | null }[]) {
        if (projectIdsSeen.has(row.id)) continue;
        projectIdsSeen.add(row.id);
        const wsId = row.portfolio_id ? portfolioWorkspace.get(row.portfolio_id) : undefined;
        if (wsId && stats.has(wsId)) stats.get(wsId)!.projectCount += 1;
      }
    }
  }

  return stats;
}

function catalogLaunchHref(productKey: string): string | null {
  const entry = VISUALIFY_APP_CATALOG.find((a) => a.id === productKey);
  return entry?.href?.trim() || null;
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function buildWorkspaceAppNav(
  workspaceId: string,
  products: AttachedWorkspaceProduct[],
  riskAiStats: Map<string, { portfolioCount: number; projectCount: number }>,
): WorkspaceAppNav[] {
  const riskaiBase = getProductDashboardUrl("riskai");
  const stats = riskAiStats.get(workspaceId);

  return products.map((product) => {
    const catalog = VISUALIFY_APP_CATALOG.find((a) => a.id === product.productKey);
    const productName = catalog?.name ?? product.productName;
    const launchHref = catalogLaunchHref(product.productKey);
    const lines: WorkspaceAppNavLine[] = [];

    if (product.productKey === "riskai" && stats) {
      if (stats.portfolioCount > 0) {
        lines.push({
          label: formatCountLabel(stats.portfolioCount, "portfolio", "portfolios"),
          href: riskaiBase,
        });
      }
      if (stats.projectCount > 0) {
        lines.push({
          label: formatCountLabel(stats.projectCount, "project", "projects"),
          href: riskaiBase,
        });
      }
    }

    return {
      productKey: product.productKey,
      productName,
      launchHref,
      lines,
    };
  });
}

/** First-paint dashboard workspaces (header, tile body, meta line). */
export async function fetchDashboardLauncherCriticalData(
  userId: string,
): Promise<WorkspaceDashboardEntry[]> {
  return fetchVisibleWorkspacesForDashboard(userId);
}

/**
 * Billable product shortcuts + RiskAI counts — deferred via Suspense on the dashboard.
 * Per-request dedup when multiple tiles resolve enrichment in the same render.
 */
export const fetchDashboardWorkspaceAppsEnrichment = cache(
  async (userId: string): Promise<Map<string, WorkspaceAppNav[]>> => {
    try {
      const workspaces = await fetchVisibleWorkspacesForRail(userId);
      const workspaceIds = workspaces.map((w) => w.id);
      if (workspaceIds.length === 0) return new Map();

      const productsByWorkspace = await fetchActiveProductsByWorkspaceIds(workspaceIds);

      const riskAiWorkspaceIds = workspaceIds.filter((id) =>
        (productsByWorkspace.get(id) ?? []).some((p) => p.productKey === "riskai"),
      );

      const riskAiStats =
        riskAiWorkspaceIds.length > 0
          ? await fetchRiskAiNavStatsByWorkspaceIds(riskAiWorkspaceIds)
          : new Map<string, { portfolioCount: number; projectCount: number }>();

      const out = new Map<string, WorkspaceAppNav[]>();
      for (const id of workspaceIds) {
        out.set(
          id,
          buildWorkspaceAppNav(id, productsByWorkspace.get(id) ?? [], riskAiStats),
        );
      }
      return out;
    } catch (error) {
      console.error("fetchDashboardWorkspaceAppsEnrichment:", error);
      return new Map();
    }
  },
);

/** @deprecated Prefer {@link fetchDashboardLauncherCriticalData} + deferred enrichment. */
export async function fetchDashboardLauncherPageData(
  userId: string,
): Promise<{
  workspaces: DashboardWorkspaceLauncherEntry[];
}> {
  const workspaces = await fetchDashboardLauncherCriticalData(userId);
  const appsByWorkspace = await fetchDashboardWorkspaceAppsEnrichment(userId);

  const enriched: DashboardWorkspaceLauncherEntry[] = workspaces.map((w) => ({
    ...w,
    apps: appsByWorkspace.get(w.id) ?? [],
  }));

  return { workspaces: enriched };
}
