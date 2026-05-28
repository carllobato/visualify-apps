import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import { mergeById } from "@/lib/os/stream-related-merge";
import { supabaseServerClient } from "@/lib/supabase/server";

const TASK_SELECT =
  "id, title, description, status, priority_level, due_at, project_id, stream_id, created_at, updated_at" as const;

const WAITING_ON_SELECT =
  "id, title, description, status, priority_level, waiting_on_name, waiting_on_contact, expected_response_at, last_followed_up_at, project_id, stream_id, created_at, updated_at" as const;

/** Max items per related section on stream detail. */
export const STREAM_RELATED_LIST_LIMIT = 8;

const OS_ITEM_STATUS_ACTIVE = "active";

export type StreamRelatedProject = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
};

export type StreamRelatedTask = {
  id: string;
  title: string;
  dueAt: string | null;
  priorityLevel: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StreamRelatedWaitingOn = {
  id: string;
  title: string;
  waitingOnName: string | null;
  expectedResponseAt: string | null;
  updatedAt: string;
};

export type StreamRelatedWork = {
  projects: StreamRelatedProject[];
  tasks: StreamRelatedTask[];
  waitingOns: StreamRelatedWaitingOn[];
};

const EMPTY_RELATED_WORK: StreamRelatedWork = {
  projects: [],
  tasks: [],
  waitingOns: [],
};

type OsProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stream_id: string | null;
  created_at: string;
  updated_at: string;
};

type OsTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority_level: string | null;
  due_at: string | null;
  project_id: string | null;
  stream_id: string | null;
  created_at: string;
  updated_at: string;
};

type OsWaitingOnRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority_level: string | null;
  waiting_on_name: string | null;
  waiting_on_contact: string | null;
  expected_response_at: string | null;
  last_followed_up_at: string | null;
  project_id: string | null;
  stream_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapProject(row: OsProjectRow): StreamRelatedProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    updatedAt: row.updated_at,
  };
}

function mapTask(row: OsTaskRow): StreamRelatedTask {
  return {
    id: row.id,
    title: row.title,
    dueAt: row.due_at,
    priorityLevel: row.priority_level,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWaitingOn(row: OsWaitingOnRow): StreamRelatedWaitingOn {
  return {
    id: row.id,
    title: row.title,
    waitingOnName: row.waiting_on_name,
    expectedResponseAt: row.expected_response_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProjectsForStream(
  supabase: SupabaseClient,
  userId: string,
  streamId: string,
  limit: number | null = STREAM_RELATED_LIST_LIMIT,
): Promise<StreamRelatedProject[]> {
  let query = supabase
    .from("os_projects")
    .select("id, name, description, status, stream_id, created_at, updated_at")
    .eq("owner_user_id", userId)
    .eq("stream_id", streamId)
    .eq("status", OS_ITEM_STATUS_ACTIVE)
    .order("updated_at", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetchProjectsForStream os_projects:", error.message);
    return [];
  }

  return ((data ?? []) as OsProjectRow[]).map(mapProject);
}

export async function fetchTasksForStream(
  supabase: SupabaseClient,
  userId: string,
  streamId: string,
  projectIdsInStream: readonly string[] = [],
  limit: number | null = STREAM_RELATED_LIST_LIMIT,
): Promise<StreamRelatedTask[]> {
  const base = () =>
    supabase
      .from("os_tasks")
      .select(TASK_SELECT)
      .eq("owner_user_id", userId)
      .eq("status", OS_ITEM_STATUS_ACTIVE);

  let directQuery = base()
    .eq("stream_id", streamId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (typeof limit === "number") {
    directQuery = directQuery.limit(limit);
  }

  const { data: directRows, error: directError } = await directQuery;

  if (directError) {
    console.error("fetchTasksForStream os_tasks (stream_id):", directError.message);
    return [];
  }

  const direct = ((directRows ?? []) as OsTaskRow[]).map(mapTask);

  if (projectIdsInStream.length === 0) {
    return direct;
  }

  let projectQuery = base()
    .in("project_id", [...projectIdsInStream])
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (typeof limit === "number") {
    projectQuery = projectQuery.limit(limit);
  }

  const { data: projectRows, error: projectError } = await projectQuery;

  if (projectError) {
    console.error("fetchTasksForStream os_tasks (project_id):", projectError.message);
    return direct;
  }

  const viaProject = ((projectRows ?? []) as OsTaskRow[]).map(mapTask);
  return typeof limit === "number"
    ? mergeById(direct, viaProject, limit)
    : mergeById(direct, viaProject, Number.MAX_SAFE_INTEGER);
}

export async function fetchWaitingOnsForStream(
  supabase: SupabaseClient,
  userId: string,
  streamId: string,
  projectIdsInStream: readonly string[] = [],
  limit = STREAM_RELATED_LIST_LIMIT,
): Promise<StreamRelatedWaitingOn[]> {
  const base = () =>
    supabase
      .from("os_waiting_ons")
      .select(WAITING_ON_SELECT)
      .eq("owner_user_id", userId)
      .eq("status", OS_ITEM_STATUS_ACTIVE);

  const { data: directRows, error: directError } = await base()
    .eq("stream_id", streamId)
    .order("expected_response_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (directError) {
    console.error("fetchWaitingOnsForStream os_waiting_ons (stream_id):", directError.message);
    return [];
  }

  const direct = ((directRows ?? []) as OsWaitingOnRow[]).map(mapWaitingOn);

  if (projectIdsInStream.length === 0) {
    return direct;
  }

  const { data: projectRows, error: projectError } = await base()
    .in("project_id", [...projectIdsInStream])
    .order("expected_response_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (projectError) {
    console.error("fetchWaitingOnsForStream os_waiting_ons (project_id):", projectError.message);
    return direct;
  }

  const viaProject = ((projectRows ?? []) as OsWaitingOnRow[]).map(mapWaitingOn);
  return mergeById(direct, viaProject, limit);
}

/** All active projects linked to a stream. */
export async function fetchAllProjectsForStreamForUser(
  userId: string,
  streamId: string,
): Promise<StreamRelatedProject[]> {
  const id = streamId.trim();
  if (!id) return [];

  const supabase = await supabaseServerClient();
  return fetchProjectsForStream(supabase, userId, id, null);
}

/** All active tasks linked to a stream directly or through its active projects. */
export async function fetchAllTasksForStreamForUser(
  userId: string,
  streamId: string,
): Promise<StreamRelatedTask[]> {
  const id = streamId.trim();
  if (!id) return [];

  const supabase = await supabaseServerClient();
  const projects = await fetchProjectsForStream(supabase, userId, id, null);
  const projectIds = projects.map((project) => project.id);
  return fetchTasksForStream(supabase, userId, id, projectIds, null);
}

/**
 * Active projects, tasks, and waiting-ons linked to a stream.
 * Returns empty slices when unauthenticated, invalid id, or on query failure.
 */
export async function fetchStreamRelatedWorkForUser(
  userId: string,
  streamId: string,
): Promise<StreamRelatedWork> {
  const id = streamId.trim();
  if (!id) return EMPTY_RELATED_WORK;

  const supabase = await supabaseServerClient();
  const projects = await fetchProjectsForStream(supabase, userId, id);
  const projectIds = projects.map((p) => p.id);

  const [tasks, waitingOns] = await Promise.all([
    fetchTasksForStream(supabase, userId, id, projectIds),
    fetchWaitingOnsForStream(supabase, userId, id, projectIds),
  ]);

  return { projects, tasks, waitingOns };
}

/** Resolves the signed-in user, then loads related work for `streamId`. */
export async function fetchStreamRelatedWork(streamId: string): Promise<StreamRelatedWork> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) return EMPTY_RELATED_WORK;

  return fetchStreamRelatedWorkForUser(userId, streamId);
}

export function streamRelatedWorkIsEmpty(work: StreamRelatedWork): boolean {
  return (
    work.projects.length === 0 && work.tasks.length === 0 && work.waitingOns.length === 0
  );
}
