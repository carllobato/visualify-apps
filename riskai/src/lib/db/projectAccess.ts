import { cache } from "react";
import { supabaseServerClient } from "@/lib/supabase/server";
import { resolvePortfolioMemberCapabilityFlags } from "@/lib/db/portfolioMemberAccess";
import type { ProjectMemberRole } from "@/types/projectMembers";
import type { ProjectPermissions } from "@/types/projectPermissions";
import { canReadProject } from "@/lib/db/canReadAccess";
import {
  resolveInheritedProjectReadPermissions,
  resolveProjectPermissions,
} from "@/lib/db/projectPermissions.logic";

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
 * Direct owner/project_members roles first; inherited workspace/portfolio read via `can_read_project`
 * resolves as viewer-only. Request-cached per (projectId, userId).
 */
type ProjectAccessRow = {
  id: string;
  name: string;
  created_at: string | null;
  owner_user_id: string;
  portfolio_id: string | null;
};

const PROJECT_ACCESS_ROW_SELECT =
  "id, name, created_at, owner_user_id, portfolio_id" as const;

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
      return {
        project: { id: projectId, name: "", created_at: null },
        permissions: resolveInheritedProjectReadPermissions(),
        ownerUserId: "",
        portfolioId: null,
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
    permissions = resolveInheritedProjectReadPermissions();
  }

  let canEditPortfolioDetails = false;
  if (permissions.accessMode === "owner" && data.portfolio_id) {
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
      canDeleteProject: permissions.accessMode === "owner" && canEditPortfolioDetails,
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
