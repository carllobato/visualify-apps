"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import {
  OS_PROJECT_SELECT_COLUMNS,
  OS_PROJECT_STATUS,
  fetchProjectByIdForUserId,
  type OsProject,
} from "@/lib/os/projects-data";
import { OS_ROUTES, osProjectDetailPath, osStreamDetailPath } from "@/lib/os-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

const NAME_MIN = 1;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 2000;
const FOREIGN_KEY_MAX = 64;

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

export type ProjectActionResult =
  | { ok: true; project: OsProject }
  | { ok: false; error: string };

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  streamId?: string | null;
  workspaceId?: string | null;
};

export type UpdateProjectInput = {
  id: string;
  name?: string;
  description?: string | null;
  streamId?: string | null;
  workspaceId?: string | null;
};

/** `useActionState` result for the create-project form. */
export type CreateProjectFormState = {
  error: string | null;
};

/** `useActionState` result for the update-project form. */
export type UpdateProjectFormState = {
  error: string | null;
  savedAt: string | null;
};

/** `useActionState` result for the archive-project form. */
export type ArchiveProjectFormState = {
  error: string | null;
  /** Client navigates to the projects list when true. */
  archived?: boolean;
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

/**
 * Optional foreign-key style ids (`stream_id`, `workspace_id`).
 * `undefined` = omit from patch; `null` = clear; non-empty string = set.
 */
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

function validateName(name: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof name !== "string") {
    return { ok: false, error: "Name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN) {
    return { ok: false, error: "Name is required." };
  }
  if (trimmed.length > NAME_MAX) {
    return { ok: false, error: `Name must be at most ${NAME_MAX} characters.` };
  }
  return { ok: true, value: trimmed };
}

function validateProjectId(id: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof id !== "string") {
    return { ok: false, error: "Project id is required." };
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return { ok: false, error: "Project id is required." };
  }
  return { ok: true, value: trimmed };
}

function revalidateProjectPaths(options?: {
  projectId?: string;
  streamIds?: readonly (string | null | undefined)[];
}): void {
  revalidatePath(OS_ROUTES.projects);
  revalidatePath(OS_ROUTES.today);

  if (options?.projectId) {
    revalidatePath(osProjectDetailPath(options.projectId));
  }

  const seen = new Set<string>();
  for (const raw of options?.streamIds ?? []) {
    const streamId = raw?.trim();
    if (!streamId || seen.has(streamId)) continue;
    seen.add(streamId);
    revalidatePath(osStreamDetailPath(streamId));
  }
}

export async function createProjectFromFormAction(
  _prev: CreateProjectFormState | null,
  formData: FormData,
): Promise<CreateProjectFormState> {
  const name = formData.get("name");
  const description = formData.get("description");
  const streamId = formData.get("streamId");

  const rawStreamId = typeof streamId === "string" ? streamId.trim() : "";
  const result = await createProjectAction({
    name: typeof name === "string" ? name : "",
    description: typeof description === "string" ? description : null,
    streamId: rawStreamId ? rawStreamId : null,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null };
}

export async function createProjectAction(input: CreateProjectInput): Promise<ProjectActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const nameResult = validateName(input.name);
  if (!nameResult.ok) return nameResult;

  const description = normalizeOptionalText(input.description, DESCRIPTION_MAX);
  const streamId = normalizeOptionalForeignId(input.streamId);
  const workspaceId = normalizeOptionalForeignId(input.workspaceId);

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_projects")
    .insert({
      owner_user_id: userId,
      name: nameResult.value,
      description: description ?? null,
      stream_id: streamId ?? null,
      workspace_id: workspaceId ?? null,
      status: OS_PROJECT_STATUS.active,
      ai_generated: false,
      archived_at: null,
    })
    .select(OS_PROJECT_SELECT_COLUMNS)
    .single();

  if (error) {
    console.error("createProjectAction os_projects:", error.message);
    return { ok: false, error: "Unable to create project." };
  }

  const project = mapProjectRow(data as OsProjectRow);
  revalidateProjectPaths({
    projectId: project.id,
    streamIds: [project.streamId],
  });

  return { ok: true, project };
}

export async function updateProjectAction(input: UpdateProjectInput): Promise<ProjectActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const idResult = validateProjectId(input.id);
  if (!idResult.ok) return idResult;

  const streamIdInPatch = input.streamId !== undefined;
  const existing =
    streamIdInPatch ? await fetchProjectByIdForUserId(userId, idResult.value) : null;

  if (streamIdInPatch && !existing) {
    return { ok: false, error: "Project not found." };
  }

  const patch: Record<string, string | null> = {};

  if (input.name !== undefined) {
    const nameResult = validateName(input.name);
    if (!nameResult.ok) return nameResult;
    patch.name = nameResult.value;
  }

  if (input.description !== undefined) {
    patch.description = normalizeOptionalText(input.description, DESCRIPTION_MAX) ?? null;
  }

  if (input.streamId !== undefined) {
    patch.stream_id = normalizeOptionalForeignId(input.streamId) ?? null;
  }

  if (input.workspaceId !== undefined) {
    patch.workspace_id = normalizeOptionalForeignId(input.workspaceId) ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "No fields to update." };
  }

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_projects")
    .update(patch)
    .eq("id", idResult.value)
    .eq("owner_user_id", userId)
    .select(OS_PROJECT_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("updateProjectAction os_projects:", error.message);
    return { ok: false, error: "Unable to update project." };
  }

  if (!data) {
    return { ok: false, error: "Project not found." };
  }

  const project = mapProjectRow(data as OsProjectRow);
  const streamIds: (string | null | undefined)[] = [project.streamId];
  if (existing?.streamId && existing.streamId !== project.streamId) {
    streamIds.push(existing.streamId);
  }

  revalidateProjectPaths({
    projectId: project.id,
    streamIds,
  });

  return { ok: true, project };
}

export async function updateProjectFromFormAction(
  _prev: UpdateProjectFormState | null,
  formData: FormData,
): Promise<UpdateProjectFormState> {
  const id = formData.get("id");
  const name = formData.get("name");
  const description = formData.get("description");

  const patch: UpdateProjectInput = {
    id: typeof id === "string" ? id : "",
    name: typeof name === "string" ? name : "",
    description: typeof description === "string" ? description : null,
  };

  if (formData.has("streamId")) {
    const streamId = formData.get("streamId");
    const rawStreamId = typeof streamId === "string" ? streamId.trim() : "";
    patch.streamId = rawStreamId ? rawStreamId : null;
  }

  const result = await updateProjectAction(patch);

  if (!result.ok) {
    return { error: result.error, savedAt: null };
  }

  return { error: null, savedAt: result.project.updatedAt };
}

export async function archiveProjectFromFormAction(
  _prev: ArchiveProjectFormState | null,
  formData: FormData,
): Promise<ArchiveProjectFormState> {
  const id = formData.get("id");
  const result = await archiveProjectAction(typeof id === "string" ? id : "");

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null, archived: true };
}

export async function archiveProjectAction(projectId: string): Promise<ProjectActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const idResult = validateProjectId(projectId);
  if (!idResult.ok) return idResult;

  const existing = await fetchProjectByIdForUserId(userId, idResult.value);
  if (!existing) {
    return { ok: false, error: "Project not found." };
  }

  const archivedAt = new Date().toISOString();
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_projects")
    .update({
      status: OS_PROJECT_STATUS.archived,
      archived_at: archivedAt,
    })
    .eq("id", idResult.value)
    .eq("owner_user_id", userId)
    .select(OS_PROJECT_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("archiveProjectAction os_projects:", error.message);
    return { ok: false, error: "Unable to archive project." };
  }

  if (!data) {
    return { ok: false, error: "Project not found." };
  }

  const project = mapProjectRow(data as OsProjectRow);
  revalidateProjectPaths({
    projectId: project.id,
    streamIds: [existing.streamId, project.streamId],
  });

  return { ok: true, project };
}
