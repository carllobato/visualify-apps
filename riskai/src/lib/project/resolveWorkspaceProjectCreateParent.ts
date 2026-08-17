import { riskaiPath } from "@/lib/routes";
import { resolveCreatableWorkspaceId } from "@/lib/workspace/resolveCreatableWorkspaceId";

export type WorkspaceProjectCreateParent = {
  workspaceId: string;
  portfolioId: string | null;
};

export type ProjectCreateRequestFields = {
  name: string;
  workspaceId?: string;
  portfolioId?: string;
};

export type ProjectCreateFormParent = {
  selectedWorkspaceId: string;
  selectedPortfolioId: string;
  /** Authorised preferred Workspace from a Workspace customer surface. */
  workspaceBound: boolean;
  /** Explicit preferred Portfolio (legacy Portfolio launch or unique Workspace Portfolio). */
  portfolioBound: boolean;
  preferredWorkspaceDenied: boolean;
};

function trimId(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * UI may show Create Project when this is true; `POST /api/projects` remains authoritative.
 */
export function canCreateProjectInCreatableWorkspace(
  creatableIds: readonly string[],
  workspaceId: string,
): boolean {
  const resolved = resolveCreatableWorkspaceId({
    creatableIds,
    requestedWorkspaceId: workspaceId,
  });
  return !("error" in resolved);
}

/**
 * Workspace customer-surface parent: Workspace is required.
 * Unique Portfolio is an optional compatibility association — never chosen among 2+.
 */
export function resolveWorkspaceProjectCreateParent(params: {
  workspaceId: string;
  uniquePortfolioId?: string | null;
}): WorkspaceProjectCreateParent | { error: "workspace_required" } {
  const workspaceId = trimId(params.workspaceId);
  if (!workspaceId) return { error: "workspace_required" };
  const uniquePortfolioId = trimId(params.uniquePortfolioId);
  return {
    workspaceId,
    portfolioId: uniquePortfolioId || null,
  };
}

export function buildCreateProjectRequestBody(params: {
  name: string;
  workspaceId?: string | null;
  portfolioId?: string | null;
}): ProjectCreateRequestFields {
  const name = params.name.trim();
  const workspaceId = trimId(params.workspaceId);
  const portfolioId = trimId(params.portfolioId);
  return {
    name,
    ...(workspaceId ? { workspaceId } : {}),
    ...(portfolioId ? { portfolioId } : {}),
  };
}

/**
 * Legacy Portfolio-launched create omits workspaceId so `POST /api/projects`
 * keeps using portfolio `canInviteMembers`. Workspace-native and dashboard
 * unscoped create always send workspaceId.
 */
export function createProjectRequestFromForm(params: {
  name: string;
  resolvedWorkspaceId: string;
  resolvedPortfolioId: string;
  launchedWithWorkspaceId: boolean;
  portfolioBound: boolean;
}): ProjectCreateRequestFields {
  if (params.portfolioBound && !params.launchedWithWorkspaceId) {
    return buildCreateProjectRequestBody({
      name: params.name,
      portfolioId: params.resolvedPortfolioId,
    });
  }
  return buildCreateProjectRequestBody({
    name: params.name,
    workspaceId: params.resolvedWorkspaceId,
    portfolioId: params.resolvedPortfolioId,
  });
}

export function projectOnboardingHref(params: {
  workspaceId?: string | null;
  portfolioId?: string | null;
}): string {
  const qs = new URLSearchParams();
  const workspaceId = trimId(params.workspaceId);
  const portfolioId = trimId(params.portfolioId);
  if (workspaceId) qs.set("workspaceId", workspaceId);
  if (portfolioId) qs.set("portfolioId", portfolioId);
  const path = riskaiPath("/create-project");
  const search = qs.toString();
  return search ? `${path}?${search}` : path;
}

export function openProjectOnboardingDetail(params: {
  workspaceId?: string | null;
  portfolioId?: string | null;
}): { workspaceId?: string; portfolioId?: string } {
  const detail: { workspaceId?: string; portfolioId?: string } = {};
  const workspaceId = trimId(params.workspaceId);
  const portfolioId = trimId(params.portfolioId);
  if (workspaceId) detail.workspaceId = workspaceId;
  if (portfolioId) detail.portfolioId = portfolioId;
  return detail;
}

export function resolveProjectCreateFormParent(params: {
  preferredWorkspaceId?: string | null;
  preferredPortfolioId?: string | null;
  workspaces: readonly { id: string }[];
  portfolios: readonly { id: string; workspace_id?: string | null }[];
}): ProjectCreateFormParent {
  const preferredWorkspaceId = trimId(params.preferredWorkspaceId);
  const preferredPortfolioId = trimId(params.preferredPortfolioId);
  const creatableIds = params.workspaces.map((row) => trimId(row.id)).filter((id) => id.length > 0);

  const scopedPortfolio = preferredPortfolioId
    ? params.portfolios.find((row) => trimId(row.id) === preferredPortfolioId)
    : undefined;
  if (scopedPortfolio) {
    return {
      selectedWorkspaceId: trimId(scopedPortfolio.workspace_id),
      selectedPortfolioId: trimId(scopedPortfolio.id),
      workspaceBound: true,
      portfolioBound: true,
      preferredWorkspaceDenied: false,
    };
  }

  if (preferredWorkspaceId && creatableIds.includes(preferredWorkspaceId)) {
    return {
      selectedWorkspaceId: preferredWorkspaceId,
      selectedPortfolioId: "",
      workspaceBound: true,
      portfolioBound: false,
      preferredWorkspaceDenied: false,
    };
  }

  if (preferredWorkspaceId) {
    return {
      selectedWorkspaceId: "",
      selectedPortfolioId: "",
      workspaceBound: false,
      portfolioBound: false,
      preferredWorkspaceDenied: true,
    };
  }

  if (creatableIds.length === 1) {
    return {
      selectedWorkspaceId: creatableIds[0]!,
      selectedPortfolioId: "",
      workspaceBound: false,
      portfolioBound: false,
      preferredWorkspaceDenied: false,
    };
  }

  return {
    selectedWorkspaceId: "",
    selectedPortfolioId: "",
    workspaceBound: false,
    portfolioBound: false,
    preferredWorkspaceDenied: false,
  };
}

/**
 * Workspace-native launch (bound Workspace, no explicit Portfolio) must not
 * introduce a Portfolio selector. Dashboard unscoped launch may still offer one.
 */
export function projectCreateSelectorVisibility(params: {
  portfolioBound: boolean;
  workspaceBound: boolean;
  preferredWorkspaceDenied: boolean;
  workspacesCount: number;
  selectedWorkspaceId: string;
  portfoliosInSelectedWorkspaceCount: number;
}): { showWorkspaceSelector: boolean; showPortfolioSelector: boolean } {
  if (params.portfolioBound || params.preferredWorkspaceDenied || params.workspaceBound) {
    return { showWorkspaceSelector: false, showPortfolioSelector: false };
  }
  return {
    showWorkspaceSelector: params.workspacesCount > 1,
    showPortfolioSelector:
      Boolean(trimId(params.selectedWorkspaceId)) && params.portfoliosInSelectedWorkspaceCount > 0,
  };
}
