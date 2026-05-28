import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";

/** Project status values used by `os_projects`. */
export const OS_PROJECT_STATUS = {
  active: "active",
  archived: "archived",
} as const;

export type OsProjectStatus = (typeof OS_PROJECT_STATUS)[keyof typeof OS_PROJECT_STATUS];

/** Canonical Projects view model — not raw Supabase rows. */
export type OsProject = {
  id: string;
  workspaceId: string | null;
  streamId: string | null;
  name: string;
  description: string | null;
  status: string;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export const OS_PROJECT_SELECT_COLUMNS =
  "id, workspace_id, stream_id, name, description, status, ai_generated, created_at, updated_at, archived_at" as const;

type OsProjectRow = {
  id: string;
  workspace_id: string | null;
  stream_id: string | null;
  name: string;
  description: string | null;
  status: string;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function mapProjectRow(row: OsProjectRow): OsProject {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    streamId: row.stream_id,
    name: row.name,
    description: row.description,
    status: row.status,
    aiGenerated: row.ai_generated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export type ActiveProjectsLoadResult = {
  projects: OsProject[];
  /** True when the Supabase query failed (distinct from an empty list). */
  loadFailed: boolean;
};

async function fetchActiveProjectsForUserResult(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveProjectsLoadResult> {
  const { data, error } = await supabase
    .from("os_projects")
    .select(OS_PROJECT_SELECT_COLUMNS)
    .eq("owner_user_id", userId)
    .eq("status", OS_PROJECT_STATUS.active)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchActiveProjects os_projects:", error.message);
    return { projects: [], loadFailed: true };
  }

  return {
    projects: ((data ?? []) as OsProjectRow[]).map(mapProjectRow),
    loadFailed: false,
  };
}

async function fetchProjectByIdForUser(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<OsProject | null> {
  const { data, error } = await supabase
    .from("os_projects")
    .select(OS_PROJECT_SELECT_COLUMNS)
    .eq("owner_user_id", userId)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("fetchProjectById os_projects:", error.message);
    return null;
  }

  if (!data) return null;
  return mapProjectRow(data as OsProjectRow);
}

/**
 * Active, non-archived projects for a user.
 * Returns `[]` on query failure.
 */
export async function fetchActiveProjectsForUserId(userId: string): Promise<OsProject[]> {
  const supabase = await supabaseServerClient();
  const { projects } = await fetchActiveProjectsForUserResult(supabase, userId);
  return projects;
}

/**
 * Active, non-archived projects with explicit load failure signal.
 */
export async function fetchActiveProjectsWithStatusForUserId(
  userId: string,
): Promise<ActiveProjectsLoadResult> {
  const supabase = await supabaseServerClient();
  return fetchActiveProjectsForUserResult(supabase, userId);
}

/**
 * Single project by id for the given user (any status / archive state).
 * Returns `null` when missing or on query failure.
 */
export async function fetchProjectByIdForUserId(
  userId: string,
  projectId: string,
): Promise<OsProject | null> {
  const id = projectId.trim();
  if (!id) return null;

  const supabase = await supabaseServerClient();
  return fetchProjectByIdForUser(supabase, userId, id);
}
