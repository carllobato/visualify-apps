"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import {
  OS_STREAM_SELECT_COLUMNS,
  OS_STREAM_STATUS,
  type OsStream,
} from "@/lib/os/streams-data";
import { OS_ROUTES, osStreamDetailPath } from "@/lib/os-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

const NAME_MIN = 1;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 2000;
const COLOR_MAX = 32;
const ICON_MAX = 64;

type OsStreamRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export type StreamActionResult =
  | { ok: true; stream: OsStream }
  | { ok: false; error: string };

export type CreateStreamInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
};

/** `useActionState` result for the create-stream form. */
export type CreateStreamFormState = {
  error: string | null;
};

/** `useActionState` result for the update-stream form. */
export type UpdateStreamFormState = {
  error: string | null;
  savedAt: string | null;
};

/** `useActionState` result for the archive-stream form. */
export type ArchiveStreamFormState = {
  error: string | null;
  /** Client navigates to the streams list when true. */
  archived?: boolean;
};

export type UpdateStreamInput = {
  id: string;
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
};

function mapStreamRow(row: OsStreamRow): OsStream {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

function validateStreamId(id: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof id !== "string") {
    return { ok: false, error: "Stream id is required." };
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return { ok: false, error: "Stream id is required." };
  }
  return { ok: true, value: trimmed };
}

function revalidateStreamPaths(streamId?: string): void {
  revalidatePath(OS_ROUTES.streams);
  revalidatePath(OS_ROUTES.today);
  if (streamId) {
    revalidatePath(osStreamDetailPath(streamId));
  }
}

export async function createStreamFromFormAction(
  _prev: CreateStreamFormState | null,
  formData: FormData,
): Promise<CreateStreamFormState> {
  const name = formData.get("name");
  const description = formData.get("description");
  const icon = formData.get("icon");
  const color = formData.get("color");

  const result = await createStreamAction({
    name: typeof name === "string" ? name : "",
    description: typeof description === "string" ? description : null,
    icon: typeof icon === "string" ? icon : null,
    color: typeof color === "string" ? color : null,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null };
}

export async function createStreamAction(input: CreateStreamInput): Promise<StreamActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const nameResult = validateName(input.name);
  if (!nameResult.ok) return nameResult;

  const description = normalizeOptionalText(input.description, DESCRIPTION_MAX);
  const icon = normalizeOptionalText(input.icon, ICON_MAX);
  const color = normalizeOptionalText(input.color, COLOR_MAX);

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_streams")
    .insert({
      owner_user_id: userId,
      name: nameResult.value,
      description: description ?? null,
      icon: icon ?? null,
      color: color ?? null,
      status: OS_STREAM_STATUS.active,
    })
    .select(OS_STREAM_SELECT_COLUMNS)
    .single();

  if (error) {
    console.error("createStreamAction os_streams:", error.message);
    return { ok: false, error: "Unable to create stream." };
  }

  revalidateStreamPaths();
  return { ok: true, stream: mapStreamRow(data as OsStreamRow) };
}

export async function updateStreamFromFormAction(
  _prev: UpdateStreamFormState | null,
  formData: FormData,
): Promise<UpdateStreamFormState> {
  const id = formData.get("id");
  const name = formData.get("name");
  const description = formData.get("description");
  const icon = formData.get("icon");
  const color = formData.get("color");

  const result = await updateStreamAction({
    id: typeof id === "string" ? id : "",
    name: typeof name === "string" ? name : "",
    description: typeof description === "string" ? description : null,
    icon: typeof icon === "string" ? icon : null,
    color: typeof color === "string" ? color : null,
  });

  if (!result.ok) {
    return { error: result.error, savedAt: null };
  }

  return { error: null, savedAt: result.stream.updatedAt };
}

export async function updateStreamAction(input: UpdateStreamInput): Promise<StreamActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const idResult = validateStreamId(input.id);
  if (!idResult.ok) return idResult;

  const patch: Record<string, string | null> = {};

  if (input.name !== undefined) {
    const nameResult = validateName(input.name);
    if (!nameResult.ok) return nameResult;
    patch.name = nameResult.value;
  }

  if (input.description !== undefined) {
    patch.description = normalizeOptionalText(input.description, DESCRIPTION_MAX) ?? null;
  }

  if (input.icon !== undefined) {
    patch.icon = normalizeOptionalText(input.icon, ICON_MAX) ?? null;
  }

  if (input.color !== undefined) {
    patch.color = normalizeOptionalText(input.color, COLOR_MAX) ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "No fields to update." };
  }

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_streams")
    .update(patch)
    .eq("id", idResult.value)
    .eq("owner_user_id", userId)
    .select(OS_STREAM_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("updateStreamAction os_streams:", error.message);
    return { ok: false, error: "Unable to update stream." };
  }

  if (!data) {
    return { ok: false, error: "Stream not found." };
  }

  revalidateStreamPaths(idResult.value);
  return { ok: true, stream: mapStreamRow(data as OsStreamRow) };
}

export async function archiveStreamFromFormAction(
  _prev: ArchiveStreamFormState | null,
  formData: FormData,
): Promise<ArchiveStreamFormState> {
  const id = formData.get("id");
  const result = await archiveStreamAction(typeof id === "string" ? id : "");

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null, archived: true };
}

export async function archiveStreamAction(streamId: string): Promise<StreamActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const idResult = validateStreamId(streamId);
  if (!idResult.ok) return idResult;

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_streams")
    .update({ status: OS_STREAM_STATUS.archived })
    .eq("id", idResult.value)
    .eq("owner_user_id", userId)
    .select(OS_STREAM_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("archiveStreamAction os_streams:", error.message);
    return { ok: false, error: "Unable to archive stream." };
  }

  if (!data) {
    return { ok: false, error: "Stream not found." };
  }

  revalidateStreamPaths(idResult.value);
  return { ok: true, stream: mapStreamRow(data as OsStreamRow) };
}
