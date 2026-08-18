import { riskaiPath } from "@/lib/routes";
import { resolveCreatableWorkspaceId } from "@/lib/workspace/resolveCreatableWorkspaceId";

export type WorkspaceProjectCreateParent = {
  workspaceId: string;
};

export type ProjectCreateRequestFields = {
  name: string;
  workspaceId?: string;
};

export type ProjectCreateFormParent = {
  selectedWorkspaceId: string;
  /** Authorised preferred Workspace from a Workspace customer surface. */
  workspaceBound: boolean;
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
 */
export function resolveWorkspaceProjectCreateParent(params: {
  workspaceId: string;
}): WorkspaceProjectCreateParent | { error: "workspace_required" } {
  const workspaceId = trimId(params.workspaceId);
  if (!workspaceId) return { error: "workspace_required" };
  return { workspaceId };
}

export function buildCreateProjectRequestBody(params: {
  name: string;
  workspaceId?: string | null;
}): ProjectCreateRequestFields {
  const name = params.name.trim();
  const workspaceId = trimId(params.workspaceId);
  return {
    name,
    ...(workspaceId ? { workspaceId } : {}),
  };
}

/**
 * Always send the resolved Workspace so `POST /api/projects` authorises against
 * Workspace Owner/Admin.
 */
export function createProjectRequestFromForm(params: {
  name: string;
  resolvedWorkspaceId: string;
}): ProjectCreateRequestFields {
  return buildCreateProjectRequestBody({
    name: params.name,
    workspaceId: params.resolvedWorkspaceId,
  });
}

export function projectOnboardingHref(params: {
  workspaceId?: string | null;
}): string {
  const qs = new URLSearchParams();
  const workspaceId = trimId(params.workspaceId);
  if (workspaceId) qs.set("workspaceId", workspaceId);
  const path = riskaiPath("/create-project");
  const search = qs.toString();
  return search ? `${path}?${search}` : path;
}

export function openProjectOnboardingDetail(params: {
  workspaceId?: string | null;
}): { workspaceId?: string } {
  const detail: { workspaceId?: string } = {};
  const workspaceId = trimId(params.workspaceId);
  if (workspaceId) detail.workspaceId = workspaceId;
  return detail;
}

export function resolveProjectCreateFormParent(params: {
  preferredWorkspaceId?: string | null;
  workspaces: readonly { id: string }[];
}): ProjectCreateFormParent {
  const preferredWorkspaceId = trimId(params.preferredWorkspaceId);
  const creatableIds = params.workspaces.map((row) => trimId(row.id)).filter((id) => id.length > 0);

  if (preferredWorkspaceId && creatableIds.includes(preferredWorkspaceId)) {
    return {
      selectedWorkspaceId: preferredWorkspaceId,
      workspaceBound: true,
      preferredWorkspaceDenied: false,
    };
  }

  if (preferredWorkspaceId) {
    return {
      selectedWorkspaceId: "",
      workspaceBound: false,
      preferredWorkspaceDenied: true,
    };
  }

  if (creatableIds.length === 1) {
    return {
      selectedWorkspaceId: creatableIds[0]!,
      workspaceBound: false,
      preferredWorkspaceDenied: false,
    };
  }

  return {
    selectedWorkspaceId: "",
    workspaceBound: false,
    preferredWorkspaceDenied: false,
  };
}

/**
 * Workspace-native launch (bound Workspace) must not introduce a selector unless
 * the user has more than one creatable Workspace and no preferred Workspace.
 */
export function projectCreateSelectorVisibility(params: {
  workspaceBound: boolean;
  preferredWorkspaceDenied: boolean;
  workspacesCount: number;
}): { showWorkspaceSelector: boolean } {
  if (params.preferredWorkspaceDenied || params.workspaceBound) {
    return { showWorkspaceSelector: false };
  }
  return {
    showWorkspaceSelector: params.workspacesCount > 1,
  };
}
