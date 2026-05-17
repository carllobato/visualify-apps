import "server-only";

import { fetchWorkspaceProductAccessForUser } from "@visualify/workspace-product-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import { productConfig } from "@/lib/product-config";
import {
  getAccessiblePortfolios,
  getAccessibleProjects,
  type AccessiblePortfolio,
  type AccessibleProject,
} from "@/lib/portfolios-server";

export type DashboardWorkspaceContext = {
  name: string;
  slug: string;
  memberRole: string;
};

export type DashboardAccessContext = {
  hasAppAccess: boolean;
  workspaces: DashboardWorkspaceContext[];
  isWorkspaceAdmin: boolean;
  portfolios: AccessiblePortfolio[];
  projects: AccessibleProject[];
};

function isWorkspaceAdminRole(role: string): boolean {
  const r = role.trim().toLowerCase();
  return r === "owner" || r === "admin";
}

function dedupeWorkspaces(
  rows: Awaited<ReturnType<typeof fetchWorkspaceProductAccessForUser>>,
): DashboardWorkspaceContext[] {
  const seen = new Map<string, DashboardWorkspaceContext>();
  const productKey = productConfig.PRODUCT_KEY;
  for (const row of rows) {
    if (row.productKey !== productKey) continue;
    const key = row.workspaceSlug || row.workspaceName;
    if (!key || seen.has(key)) continue;
    seen.set(key, {
      name: row.workspaceName,
      slug: row.workspaceSlug,
      memberRole: row.memberRole,
    });
  }
  return [...seen.values()];
}

export async function getDashboardAccessContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardAccessContext> {
  const [workspaceRows, portfoliosResult] = await Promise.all([
    fetchWorkspaceProductAccessForUser(supabase, userId),
    getAccessiblePortfolios(supabase, userId),
  ]);

  const workspaces = dedupeWorkspaces(workspaceRows);
  const portfolios = portfoliosResult.ok ? portfoliosResult.portfolios : [];
  const portfolioIds = portfolios.map((p) => p.id);
  const projectsResult = await getAccessibleProjects(supabase, userId, portfolioIds);
  const projects = projectsResult.ok ? projectsResult.projects : [];

  return {
    hasAppAccess: workspaces.length > 0,
    workspaces,
    isWorkspaceAdmin: workspaces.some((w) => isWorkspaceAdminRole(w.memberRole)),
    portfolios,
    projects,
  };
}

/** Prefilled mailto for members who need portfolio/project assignment. */
export function buildPortfolioAccessRequestMailto(workspaceNames: readonly string[]): string {
  const label =
    workspaceNames.length === 0
      ? "my Visualify workspace"
      : workspaceNames.length === 1
        ? workspaceNames[0]!
        : workspaceNames.join(", ");
  const subject = encodeURIComponent("RiskAI portfolio or project access");
  const body = encodeURIComponent(
    `Hi,\n\nI've joined ${label} and can open RiskAI, but I don't have any portfolios or projects assigned yet.\n\nCould you add me to the relevant portfolio or project in RiskAI?\n\nThanks`,
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

export function formatWorkspaceList(workspaces: readonly DashboardWorkspaceContext[]): string {
  if (workspaces.length === 0) return "your workspace";
  if (workspaces.length === 1) return workspaces[0]!.name;
  if (workspaces.length === 2) return `${workspaces[0]!.name} and ${workspaces[1]!.name}`;
  return `${workspaces.slice(0, -1).map((w) => w.name).join(", ")}, and ${workspaces[workspaces.length - 1]!.name}`;
}
