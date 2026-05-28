"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import {
  OS_TASK_PRIORITY,
  OS_TASK_SELECT_COLUMNS,
  OS_TASK_STATUS,
  fetchTaskByIdForUserId,
  type OsTask,
} from "@/lib/os/tasks-data";
import { OS_ROUTES, osProjectDetailPath, osStreamDetailPath } from "@/lib/os-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

const TITLE_MIN = 1;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;
const FOREIGN_KEY_MAX = 64;

const TASK_PRIORITY_VALUES = new Set<string>(Object.values(OS_TASK_PRIORITY));

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

export type TaskActionResult = { ok: true; task: OsTask } | { ok: false; error: string };

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  priorityLevel?: string | null;
  dueAt?: string | null;
  projectId?: string | null;
  streamId?: string | null;
  workspaceId?: string | null;
  sourceInboxItemId?: string | null;
  suppressedUntil?: string | null;
};

export type UpdateTaskInput = {
  id: string;
  title?: string;
  description?: string | null;
  priorityLevel?: string | null;
  dueAt?: string | null;
  projectId?: string | null;
  streamId?: string | null;
  workspaceId?: string | null;
  sourceInboxItemId?: string | null;
  suppressedUntil?: string | null;
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

function normalizeOptionalText(
  value: string | null | undefined,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
}

function normalizeOptionalForeignId(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > FOREIGN_KEY_MAX) {
    return trimmed.slice(0, FOREIGN_KEY_MAX);
  }
  return trimmed;
}

function normalizeOptionalTimestamp(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return new Date(parsed).toISOString();
}

function validateTitle(
  title: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof title !== "string") {
    return { ok: false, error: "Title is required." };
  }
  const trimmed = title.trim();
  if (trimmed.length < TITLE_MIN) {
    return { ok: false, error: "Title is required." };
  }
  if (trimmed.length > TITLE_MAX) {
    return { ok: false, error: `Title must be at most ${TITLE_MAX} characters.` };
  }
  return { ok: true, value: trimmed };
}

function validateTaskId(id: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof id !== "string") {
    return { ok: false, error: "Task id is required." };
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return { ok: false, error: "Task id is required." };
  }
  return { ok: true, value: trimmed };
}

function validatePriorityLevel(
  value: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } | { ok: true; value: undefined } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (value === null) {
    return { ok: true, value: null };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  const normalized = trimmed.toLowerCase();
  if (!TASK_PRIORITY_VALUES.has(normalized)) {
    return { ok: false, error: "Invalid priority level." };
  }
  return { ok: true, value: normalized };
}

function revalidateTaskPaths(options?: {
  projectIds?: readonly (string | null | undefined)[];
  streamIds?: readonly (string | null | undefined)[];
}): void {
  revalidatePath(OS_ROUTES.today);
  revalidatePath(OS_ROUTES.allTasks);
  revalidatePath(OS_ROUTES.projects);

  const projectSeen = new Set<string>();
  for (const raw of options?.projectIds ?? []) {
    const projectId = raw?.trim();
    if (!projectId || projectSeen.has(projectId)) continue;
    projectSeen.add(projectId);
    revalidatePath(osProjectDetailPath(projectId));
  }

  const streamSeen = new Set<string>();
  for (const raw of options?.streamIds ?? []) {
    const streamId = raw?.trim();
    if (!streamId || streamSeen.has(streamId)) continue;
    streamSeen.add(streamId);
    revalidatePath(osStreamDetailPath(streamId));
  }
}

export async function createTaskAction(input: CreateTaskInput): Promise<TaskActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const titleResult = validateTitle(input.title);
  if (!titleResult.ok) return titleResult;

  const priorityResult = validatePriorityLevel(input.priorityLevel);
  if (!priorityResult.ok) return priorityResult;

  const dueAt = normalizeOptionalTimestamp(input.dueAt);
  if (dueAt === undefined && input.dueAt !== undefined && input.dueAt !== null) {
    const trimmed = typeof input.dueAt === "string" ? input.dueAt.trim() : "";
    if (trimmed) {
      return { ok: false, error: "Invalid due date." };
    }
  }

  const suppressedUntil = normalizeOptionalTimestamp(input.suppressedUntil);
  if (
    suppressedUntil === undefined &&
    input.suppressedUntil !== undefined &&
    input.suppressedUntil !== null
  ) {
    const trimmed = typeof input.suppressedUntil === "string" ? input.suppressedUntil.trim() : "";
    if (trimmed) {
      return { ok: false, error: "Invalid suppressed-until date." };
    }
  }

  const description = normalizeOptionalText(input.description, DESCRIPTION_MAX);
  const projectId = normalizeOptionalForeignId(input.projectId);
  const streamId = normalizeOptionalForeignId(input.streamId);
  const workspaceId = normalizeOptionalForeignId(input.workspaceId);
  const sourceInboxItemId = normalizeOptionalForeignId(input.sourceInboxItemId);

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_tasks")
    .insert({
      owner_user_id: userId,
      title: titleResult.value,
      description: description ?? null,
      priority_level: priorityResult.value ?? null,
      due_at: dueAt ?? null,
      project_id: projectId ?? null,
      stream_id: streamId ?? null,
      workspace_id: workspaceId ?? null,
      source_inbox_item_id: sourceInboxItemId ?? null,
      suppressed_until: suppressedUntil ?? null,
      status: OS_TASK_STATUS.active,
      completed_at: null,
      archived_at: null,
      ai_metadata: {},
    })
    .select(OS_TASK_SELECT_COLUMNS)
    .single();

  if (error) {
    console.error("createTaskAction os_tasks:", error.message);
    return { ok: false, error: "Unable to create task." };
  }

  const task = mapTaskRow(data as OsTaskRow);
  revalidateTaskPaths({
    projectIds: [task.projectId],
    streamIds: [task.streamId],
  });

  return { ok: true, task };
}

export async function updateTaskAction(input: UpdateTaskInput): Promise<TaskActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const idResult = validateTaskId(input.id);
  if (!idResult.ok) return idResult;

  const relationInPatch = input.projectId !== undefined || input.streamId !== undefined;
  const existing = relationInPatch
    ? await fetchTaskByIdForUserId(userId, idResult.value)
    : null;

  if (relationInPatch && !existing) {
    return { ok: false, error: "Task not found." };
  }

  const patch: Record<string, string | null> = {};

  if (input.title !== undefined) {
    const titleResult = validateTitle(input.title);
    if (!titleResult.ok) return titleResult;
    patch.title = titleResult.value;
  }

  if (input.description !== undefined) {
    patch.description = normalizeOptionalText(input.description, DESCRIPTION_MAX) ?? null;
  }

  if (input.priorityLevel !== undefined) {
    const priorityResult = validatePriorityLevel(input.priorityLevel);
    if (!priorityResult.ok) return priorityResult;
    patch.priority_level = priorityResult.value ?? null;
  }

  if (input.dueAt !== undefined) {
    const dueAt = normalizeOptionalTimestamp(input.dueAt);
    if (dueAt === undefined && input.dueAt !== null) {
      const trimmed = typeof input.dueAt === "string" ? input.dueAt.trim() : "";
      if (trimmed) {
        return { ok: false, error: "Invalid due date." };
      }
    }
    patch.due_at = dueAt ?? null;
  }

  if (input.suppressedUntil !== undefined) {
    const suppressedUntil = normalizeOptionalTimestamp(input.suppressedUntil);
    if (suppressedUntil === undefined && input.suppressedUntil !== null) {
      const trimmed =
        typeof input.suppressedUntil === "string" ? input.suppressedUntil.trim() : "";
      if (trimmed) {
        return { ok: false, error: "Invalid suppressed-until date." };
      }
    }
    patch.suppressed_until = suppressedUntil ?? null;
  }

  if (input.projectId !== undefined) {
    patch.project_id = normalizeOptionalForeignId(input.projectId) ?? null;
  }

  if (input.streamId !== undefined) {
    patch.stream_id = normalizeOptionalForeignId(input.streamId) ?? null;
  }

  if (input.workspaceId !== undefined) {
    patch.workspace_id = normalizeOptionalForeignId(input.workspaceId) ?? null;
  }

  if (input.sourceInboxItemId !== undefined) {
    patch.source_inbox_item_id = normalizeOptionalForeignId(input.sourceInboxItemId) ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "No fields to update." };
  }

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_tasks")
    .update(patch)
    .eq("id", idResult.value)
    .eq("owner_user_id", userId)
    .select(OS_TASK_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("updateTaskAction os_tasks:", error.message);
    return { ok: false, error: "Unable to update task." };
  }

  if (!data) {
    return { ok: false, error: "Task not found." };
  }

  const task = mapTaskRow(data as OsTaskRow);
  const projectIds: (string | null | undefined)[] = [task.projectId];
  const streamIds: (string | null | undefined)[] = [task.streamId];

  if (existing) {
    if (existing.projectId && existing.projectId !== task.projectId) {
      projectIds.push(existing.projectId);
    }
    if (existing.streamId && existing.streamId !== task.streamId) {
      streamIds.push(existing.streamId);
    }
  }

  revalidateTaskPaths({ projectIds, streamIds });

  return { ok: true, task };
}

export async function completeTaskAction(taskId: string): Promise<TaskActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const idResult = validateTaskId(taskId);
  if (!idResult.ok) return idResult;

  const existing = await fetchTaskByIdForUserId(userId, idResult.value);
  if (!existing) {
    return { ok: false, error: "Task not found." };
  }

  const completedAt = new Date().toISOString();
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_tasks")
    .update({
      status: OS_TASK_STATUS.completed,
      completed_at: completedAt,
    })
    .eq("id", idResult.value)
    .eq("owner_user_id", userId)
    .select(OS_TASK_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("completeTaskAction os_tasks:", error.message);
    return { ok: false, error: "Unable to complete task." };
  }

  if (!data) {
    return { ok: false, error: "Task not found." };
  }

  const task = mapTaskRow(data as OsTaskRow);
  revalidateTaskPaths({
    projectIds: [existing.projectId, task.projectId],
    streamIds: [existing.streamId, task.streamId],
  });

  return { ok: true, task };
}

export async function archiveTaskAction(taskId: string): Promise<TaskActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const idResult = validateTaskId(taskId);
  if (!idResult.ok) return idResult;

  const existing = await fetchTaskByIdForUserId(userId, idResult.value);
  if (!existing) {
    return { ok: false, error: "Task not found." };
  }

  const archivedAt = new Date().toISOString();
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_tasks")
    .update({
      status: OS_TASK_STATUS.archived,
      archived_at: archivedAt,
    })
    .eq("id", idResult.value)
    .eq("owner_user_id", userId)
    .select(OS_TASK_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("archiveTaskAction os_tasks:", error.message);
    return { ok: false, error: "Unable to archive task." };
  }

  if (!data) {
    return { ok: false, error: "Task not found." };
  }

  const task = mapTaskRow(data as OsTaskRow);
  revalidateTaskPaths({
    projectIds: [existing.projectId, task.projectId],
    streamIds: [existing.streamId, task.streamId],
  });

  return { ok: true, task };
}

/** `useActionState` result for the project task create form. */
export type CreateProjectTaskFormState = {
  error: string | null;
};

/** `useActionState` result for complete / archive task row actions. */
export type TaskRowActionFormState = {
  error: string | null;
};

/** `useActionState` result for the project task inline edit form. */
export type UpdateTaskFormState = {
  error: string | null;
  savedAt: string | null;
};

export async function createTaskFromFormAction(
  _prev: CreateProjectTaskFormState | null,
  formData: FormData,
): Promise<CreateProjectTaskFormState> {
  const title = formData.get("title");
  const description = formData.get("description");
  const priorityLevel = formData.get("priorityLevel");
  const dueAt = formData.get("dueAt");
  const projectId = formData.get("projectId");
  const streamId = formData.get("streamId");

  const rawPriority = typeof priorityLevel === "string" ? priorityLevel.trim() : "";
  const rawDueAt = typeof dueAt === "string" ? dueAt.trim() : "";
  const rawStreamId = typeof streamId === "string" ? streamId.trim() : "";

  const result = await createTaskAction({
    title: typeof title === "string" ? title : "",
    description: typeof description === "string" ? description : null,
    priorityLevel: rawPriority || OS_TASK_PRIORITY.medium,
    dueAt: rawDueAt ? rawDueAt : null,
    projectId: typeof projectId === "string" ? projectId : null,
    streamId: rawStreamId ? rawStreamId : null,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null };
}

export async function completeTaskFromFormAction(
  _prev: TaskRowActionFormState | null,
  formData: FormData,
): Promise<TaskRowActionFormState> {
  const id = formData.get("id");
  const result = await completeTaskAction(typeof id === "string" ? id : "");

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null };
}

export async function archiveTaskFromFormAction(
  _prev: TaskRowActionFormState | null,
  formData: FormData,
): Promise<TaskRowActionFormState> {
  const id = formData.get("id");
  const result = await archiveTaskAction(typeof id === "string" ? id : "");

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null };
}

export async function updateTaskFromFormAction(
  _prev: UpdateTaskFormState | null,
  formData: FormData,
): Promise<UpdateTaskFormState> {
  const id = formData.get("id");
  const title = formData.get("title");
  const description = formData.get("description");
  const priorityLevel = formData.get("priorityLevel");
  const dueAt = formData.get("dueAt");

  const rawPriority = typeof priorityLevel === "string" ? priorityLevel.trim() : "";
  const rawDueAt = typeof dueAt === "string" ? dueAt.trim() : "";

  const result = await updateTaskAction({
    id: typeof id === "string" ? id : "",
    title: typeof title === "string" ? title : "",
    description: typeof description === "string" ? description : null,
    priorityLevel: rawPriority || null,
    dueAt: rawDueAt ? rawDueAt : null,
  });

  if (!result.ok) {
    return { error: result.error, savedAt: null };
  }

  return { error: null, savedAt: result.task.updatedAt };
}
