import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";

/** Task status values used by `os_tasks` (aligned with Today / stream-related reads). */
export const OS_TASK_STATUS = {
  active: "active",
  completed: "completed",
  archived: "archived",
} as const;

export type OsTaskStatus = (typeof OS_TASK_STATUS)[keyof typeof OS_TASK_STATUS];

/** Task priority values used by `os_tasks`. */
export const OS_TASK_PRIORITY = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
} as const;

export type OsTaskPriority = (typeof OS_TASK_PRIORITY)[keyof typeof OS_TASK_PRIORITY];

/** Canonical Tasks view model — not raw Supabase rows. */
export type OsTask = {
  id: string;
  workspaceId: string | null;
  streamId: string | null;
  projectId: string | null;
  sourceInboxItemId: string | null;
  title: string;
  description: string | null;
  priorityLevel: string | null;
  status: string;
  dueAt: string | null;
  completedAt: string | null;
  suppressedUntil: string | null;
  aiMetadata: unknown | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export const OS_TASK_SELECT_COLUMNS =
  "id, workspace_id, stream_id, project_id, source_inbox_item_id, title, description, priority_level, status, due_at, completed_at, suppressed_until, ai_metadata, created_at, updated_at, archived_at" as const;

type OsTaskRow = {
  id: string;
  workspace_id: string | null;
  stream_id: string | null;
  project_id: string | null;
  source_inbox_item_id: string | null;
  title: string;
  description: string | null;
  priority_level: string | null;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  suppressed_until: string | null;
  ai_metadata: unknown | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function mapTaskRow(row: OsTaskRow): OsTask {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    streamId: row.stream_id,
    projectId: row.project_id,
    sourceInboxItemId: row.source_inbox_item_id,
    title: row.title,
    description: row.description,
    priorityLevel: row.priority_level,
    status: row.status,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    suppressedUntil: row.suppressed_until,
    aiMetadata: row.ai_metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export type ActiveProjectTasksLoadResult = {
  tasks: OsTask[];
  /** True when the Supabase query failed (distinct from an empty list). */
  loadFailed: boolean;
};

function activeTasksQuery(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("os_tasks")
    .select(OS_TASK_SELECT_COLUMNS)
    .eq("owner_user_id", userId)
    .eq("status", OS_TASK_STATUS.active)
    .is("archived_at", null);
}

async function fetchActiveTasksForProjectResult(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<ActiveProjectTasksLoadResult> {
  const { data, error } = await activeTasksQuery(supabase, userId)
    .eq("project_id", projectId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchActiveTasksForProject os_tasks:", error.message);
    return { tasks: [], loadFailed: true };
  }

  return {
    tasks: ((data ?? []) as OsTaskRow[]).map(mapTaskRow),
    loadFailed: false,
  };
}

async function fetchActiveTasksForUserResult(
  supabase: SupabaseClient,
  userId: string,
): Promise<OsTask[]> {
  const { data, error } = await activeTasksQuery(supabase, userId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchActiveTasks os_tasks:", error.message);
    return [];
  }

  return ((data ?? []) as OsTaskRow[]).map(mapTaskRow);
}

async function fetchTaskByIdForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<OsTask | null> {
  const { data, error } = await supabase
    .from("os_tasks")
    .select(OS_TASK_SELECT_COLUMNS)
    .eq("owner_user_id", userId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    console.error("fetchTaskById os_tasks:", error.message);
    return null;
  }

  if (!data) return null;
  return mapTaskRow(data as OsTaskRow);
}

/**
 * Active, non-archived tasks for a project.
 * Returns `{ tasks: [], loadFailed: true }` on query failure.
 */
export async function fetchActiveTasksForProjectForUserId(
  userId: string,
  projectId: string,
): Promise<ActiveProjectTasksLoadResult> {
  const id = projectId.trim();
  if (!id) {
    return { tasks: [], loadFailed: false };
  }

  const supabase = await supabaseServerClient();
  return fetchActiveTasksForProjectResult(supabase, userId, id);
}

/**
 * Active, non-archived tasks for a user (all projects / streams).
 * Returns `[]` on query failure.
 */
export async function fetchActiveTasksForUserId(userId: string): Promise<OsTask[]> {
  const supabase = await supabaseServerClient();
  return fetchActiveTasksForUserResult(supabase, userId);
}

/**
 * Single task by id for the given user (any status / archive state).
 * Returns `null` when missing or on query failure.
 */
export async function fetchTaskByIdForUserId(
  userId: string,
  taskId: string,
): Promise<OsTask | null> {
  const id = taskId.trim();
  if (!id) return null;

  const supabase = await supabaseServerClient();
  return fetchTaskByIdForUser(supabase, userId, id);
}
