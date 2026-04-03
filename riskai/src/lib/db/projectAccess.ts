import { cache } from "react";
import { supabaseServerClient } from "@/lib/supabase/server";
import type { ProjectMemberRole } from "@/types/projectMembers";
import type { ProjectPermissions } from "@/types/projectPermissions";
import { resolveProjectPermissions } from "@/lib/db/projectPermissions.logic";

export type ProjectRow = { id: string; name: string; created_at: string | null };

export type ProjectAccessBundle = {
  project: ProjectRow;
  permissions: ProjectPermissions;
  ownerUserId: string;
  portfolioId: string | null;
};

/**
 * Returns the project if the current session can read it.
 * RLS allows: table owner, project_members (any role), or portfolio access.
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
 * Used by API routes and assertProjectAccess; keeps checks aligned with project_members + RLS.
 * Request-cached per (projectId, userId) so nested routes can reuse the layout’s fetch without another round trip.
 */
export const getProjectAccessForUser = cache(async function getProjectAccessForUser(
  projectId: string,
  userId: string
): Promise<ProjectAccessBundle | null> {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_projects")
    .select("id, name, created_at, owner_user_id, portfolio_id")
    .eq("id", projectId)
    .single();

  if (error || !data) return null;

  const { data: memberRow } = await supabase
    .from("visualify_project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  const memberRole = (memberRow?.role as ProjectMemberRole | undefined) ?? null;
  const permissions = resolveProjectPermissions({
    tableOwnerUserId: data.owner_user_id as string,
    currentUserId: userId,
    memberRole,
  });

  return {
    project: {
      id: data.id,
      name: data.name,
      created_at: data.created_at ?? null,
    },
    permissions,
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
