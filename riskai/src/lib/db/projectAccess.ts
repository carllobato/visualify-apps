import { isWorkspaceRoleAtLeast } from "@visualify/workspace-product-access";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";
import { resolvePortfolioMemberCapabilityFlags } from "@/lib/db/portfolioMemberAccess";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import type { ProjectMemberRole } from "@/types/projectMembers";
import type { ProjectPermissions } from "@/types/projectPermissions";
import { canReadProject } from "@/lib/db/canReadAccess";
import {
  resolveInheritedProjectReadPermissions,
  resolveProjectPermissions,
} from "@/lib/db/projectPermissions.logic";
import { resolveWorkspaceProjectCapabilities } from "@/lib/workspace/workspaceRoleCapabilities";

export type ProjectRow = { id: string; name: string; created_at: string | null };

export type ProjectAccessBundle = {
  project: ProjectRow;
  permissions: ProjectPermissions;
  ownerUserId: string;
  portfolioId: string | null;
};

/**
 * Returns the project if the current session can read it.
 * App access allows: table owner or direct project_members (any role).
 */
export async function getProjectIfAccessible(
  projectId: string
): Promise<ProjectRow | null> {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_projects")
    .select("id, name, created_at")
    .eq("id", projectId)
    .single();

  if (error || !data) return null;
  return data as ProjectRow;
}

/**
 * Project row + permission flags for the given user (must match session for RLS).
 * Direct owner/project_members roles first; workspace owner/admin may supplement inherited read.
 * Request-cached per (projectId, userId).
 */
type ProjectAccessRow = {
  id: string;
  name: string;
  created_at: string | null;
  owner_user_id: string;
  portfolio_id: string | null;
  workspace_id: string | null;
};

const PROJECT_ACCESS_ROW_SELECT =
  "id, name, created_at, owner_user_id, portfolio_id, workspace_id" as const;

/** Workspace on the project row, else the linked portfolio (for inherited-access capability checks). */
async function resolveWorkspaceIdForProject(
  supabase: SupabaseClient,
  project: Pick<ProjectAccessRow, "portfolio_id" | "workspace_id">,
): Promise<string | null> {
  if (typeof project.workspace_id === "string" && project.workspace_id.trim().length > 0) {
    return project.workspace_id.trim();
  }

  const portfolioId = project.portfolio_id?.trim();
  if (!portfolioId) {
    return null;
  }

  const { data: portfolio } = await supabase
    .from("visualify_portfolios")
    .select("workspace_id")
    .eq("id", portfolioId)
    .maybeSingle();

  const workspaceId = portfolio?.workspace_id;
  if (typeof workspaceId === "string" && workspaceId.trim().length > 0) {
    return workspaceId.trim();
  }

  return null;
}

type ProjectWorkspaceScope = Pick<ProjectAccessRow, "portfolio_id" | "workspace_id">;

function projectPermissionsFromWorkspaceProjectCapabilities(
  workspaceCaps: ReturnType<typeof resolveWorkspaceProjectCapabilities>,
): ProjectPermissions {
  return {
    canEditProjectMetadata: workspaceCaps.canEditProjectMetadata,
    canEditContent: workspaceCaps.canEditContent,
    canManageMembers: workspaceCaps.canChangeMemberRoles || workspaceCaps.canRemoveMembers,
    canDeleteProject: false,
    accessMode: workspaceCaps.accessMode,
  };
}

function isActiveWorkspaceMemberStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.trim().toLowerCase() === "active";
}

/**
 * When the full project row is RLS-hidden, resolve portfolio/workspace ids via workspace-scoped lookups.
 */
async function resolveProjectWorkspaceScopeWhenRowHidden(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<ProjectWorkspaceScope | null> {
  const { data: partial } = await supabase
    .from("visualify_projects")
    .select("portfolio_id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (partial) {
    return {
      portfolio_id: partial.portfolio_id ?? null,
      workspace_id: partial.workspace_id ?? null,
    };
  }

  const { data: workspaceMemberships } = await supabase
    .from("visualify_workspace_members")
    .select("workspace_id, status")
    .eq("user_id", userId);

  const workspaceIds = [
    ...new Set(
      (workspaceMemberships ?? [])
        .filter((m) => isActiveWorkspaceMemberStatus(m.status))
        .map((m) => m.workspace_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim()),
    ),
  ];

  if (workspaceIds.length === 0) {
    return null;
  }

  const { data: byWorkspace } = await supabase
    .from("visualify_projects")
    .select("portfolio_id, workspace_id")
    .eq("id", projectId)
    .in("workspace_id", workspaceIds)
    .maybeSingle();

  if (byWorkspace) {
    return {
      portfolio_id: byWorkspace.portfolio_id ?? null,
      workspace_id: byWorkspace.workspace_id ?? null,
    };
  }

  const { data: portfolios } = await supabase
    .from("visualify_portfolios")
    .select("id, workspace_id")
    .in("workspace_id", workspaceIds);

  const portfolioIds = (portfolios ?? [])
    .map((p) => p.id)
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0);

  if (portfolioIds.length === 0) {
    return null;
  }

  const { data: byPortfolio } = await supabase
    .from("visualify_projects")
    .select("portfolio_id, workspace_id")
    .eq("id", projectId)
    .in("portfolio_id", portfolioIds)
    .maybeSingle();

  if (!byPortfolio) {
    return null;
  }

  const linkedPortfolio = portfolios?.find((p) => p.id === byPortfolio.portfolio_id);
  const portfolioWorkspaceId =
    typeof linkedPortfolio?.workspace_id === "string" && linkedPortfolio.workspace_id.trim().length > 0
      ? linkedPortfolio.workspace_id.trim()
      : null;

  return {
    portfolio_id: byPortfolio.portfolio_id ?? null,
    workspace_id:
      typeof byPortfolio.workspace_id === "string" && byPortfolio.workspace_id.trim().length > 0
        ? byPortfolio.workspace_id.trim()
        : portfolioWorkspaceId,
  };
}

/** Resolve workspace id for inherited-access supplement (project scope, else admin membership). */
async function resolveWorkspaceIdForWorkspaceSupplement(
  supabase: SupabaseClient,
  userId: string,
  projectScope: ProjectWorkspaceScope | null,
): Promise<string | null> {
  if (projectScope) {
    const fromScope = await resolveWorkspaceIdForProject(supabase, projectScope);
    if (fromScope) {
      return fromScope;
    }
  }

  const { data: workspaceMemberships } = await supabase
    .from("visualify_workspace_members")
    .select("workspace_id, status")
    .eq("user_id", userId);

  for (const m of workspaceMemberships ?? []) {
    if (!isActiveWorkspaceMemberStatus(m.status)) continue;
    const workspaceId = typeof m.workspace_id === "string" ? m.workspace_id.trim() : "";
    if (!workspaceId) continue;

    const workspaceRole = await fetchWorkspaceMemberRole(supabase, workspaceId, userId);
    if (workspaceRole && isWorkspaceRoleAtLeast(workspaceRole, "admin")) {
      return workspaceId;
    }
  }

  return null;
}

/** Inherited read defaults to viewer; workspace owner/admin supplements when there is no direct row. */
async function resolveInheritedPermissionsWithWorkspaceSupplement(
  supabase: SupabaseClient,
  userId: string,
  projectScope: ProjectWorkspaceScope | null,
): Promise<ProjectPermissions> {
  let permissions = resolveInheritedProjectReadPermissions();

  const workspaceId = await resolveWorkspaceIdForWorkspaceSupplement(supabase, userId, projectScope);
  if (workspaceId) {
    const workspaceRole = await fetchWorkspaceMemberRole(supabase, workspaceId, userId);
    if (workspaceRole && isWorkspaceRoleAtLeast(workspaceRole, "admin")) {
      permissions = projectPermissionsFromWorkspaceProjectCapabilities(
        resolveWorkspaceProjectCapabilities(workspaceRole),
      );
    }
  }

  return permissions;
}

export const getProjectAccessForUser = cache(async function getProjectAccessForUser(
  projectId: string,
  userId: string
): Promise<ProjectAccessBundle | null> {
  const supabase = await supabaseServerClient();

  const loadProjectRow = () =>
    supabase
      .from("visualify_projects")
      .select(PROJECT_ACCESS_ROW_SELECT)
      .eq("id", projectId)
      .single();

  let data: ProjectAccessRow | null = null;

  const initial = await loadProjectRow();
  if (initial.data) {
    data = initial.data as ProjectAccessRow;
  } else {
    const readable = await canReadProject(supabase, projectId, userId);
    if (!readable) return null;

    const retry = await loadProjectRow();
    if (retry.data) {
      data = retry.data as ProjectAccessRow;
    } else {
      console.warn(
        "[projectAccess] getProjectAccessForUser: can_read_project without projects row; using inherited read bundle",
        { projectId, userId, message: retry.error?.message ?? initial.error?.message },
      );
      const workspaceScope = await resolveProjectWorkspaceScopeWhenRowHidden(
        supabase,
        projectId,
        userId,
      );
      const permissions = await resolveInheritedPermissionsWithWorkspaceSupplement(
        supabase,
        userId,
        workspaceScope,
      );
      return {
        project: { id: projectId, name: "", created_at: null },
        permissions,
        ownerUserId: "",
        portfolioId: workspaceScope?.portfolio_id ?? null,
      };
    }
  }

  const { data: memberRow } = await supabase
    .from("visualify_project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  const memberRole = (memberRow?.role as ProjectMemberRole | undefined) ?? null;
  let permissions =
    resolveProjectPermissions({
      tableOwnerUserId: data.owner_user_id as string,
      currentUserId: userId,
      memberRole,
    }) ?? null;

  if (!permissions) {
    const readable = await canReadProject(supabase, projectId, userId);
    if (!readable) return null;

    permissions = await resolveInheritedPermissionsWithWorkspaceSupplement(supabase, userId, data);
  }

  const isDirectProjectOwner =
    data.owner_user_id === userId || memberRole === "owner";

  let canEditPortfolioDetails = false;
  if (isDirectProjectOwner && data.portfolio_id) {
    const { data: portfolio } = await supabase
      .from("visualify_portfolios")
      .select("owner_user_id")
      .eq("id", data.portfolio_id)
      .maybeSingle();

    const { data: portfolioMemberRow } = await supabase
      .from("visualify_portfolio_members")
      .select("role")
      .eq("portfolio_id", data.portfolio_id)
      .eq("user_id", userId)
      .maybeSingle();

    canEditPortfolioDetails = resolvePortfolioMemberCapabilityFlags(
      portfolio?.owner_user_id === userId,
      portfolioMemberRow?.role as string | undefined
    ).canEditPortfolioDetails;
  }

  return {
    project: {
      id: data.id,
      name: data.name,
      created_at: data.created_at ?? null,
    },
    permissions: {
      ...permissions,
      canDeleteProject: isDirectProjectOwner && canEditPortfolioDetails,
    },
    ownerUserId: data.owner_user_id as string,
    portfolioId: data.portfolio_id ?? null,
  };
});

/**
 * Returns the project if it exists and `owner_user_id` matches (table owner only).
 * Use `getProjectAccessForUser` when admin/member roles matter.
 */
export async function getProjectIfOwned(
  projectId: string,
  userId: string
): Promise<ProjectRow | null> {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_projects")
    .select("id, name, created_at")
    .eq("id", projectId)
    .eq("owner_user_id", userId)
    .single();

  if (error || !data) return null;
  return data as ProjectRow;
}
