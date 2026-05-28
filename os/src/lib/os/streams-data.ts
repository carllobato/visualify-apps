import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import { supabaseServerClient } from "@/lib/supabase/server";

/** Stream status values used by `os_streams` (inferred from Today queries). */
export const OS_STREAM_STATUS = {
  active: "active",
  archived: "archived",
} as const;

export type OsStreamStatus = (typeof OS_STREAM_STATUS)[keyof typeof OS_STREAM_STATUS];

/** Lightweight Streams view model — not raw Supabase rows. */
export type OsStream = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
};

export const OS_STREAM_SELECT_COLUMNS =
  "id, name, description, status, color, icon, created_at, updated_at" as const;

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

export type ActiveStreamsLoadResult = {
  streams: OsStream[];
  /** True when the Supabase query failed (distinct from an empty list). */
  loadFailed: boolean;
};

async function fetchStreamsForUserResult(
  supabase: SupabaseClient,
  userId: string,
  options?: { activeOnly?: boolean },
): Promise<ActiveStreamsLoadResult> {
  let query = supabase
    .from("os_streams")
    .select(OS_STREAM_SELECT_COLUMNS)
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("status", OS_STREAM_STATUS.active);
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetchStreams os_streams:", error.message);
    return { streams: [], loadFailed: true };
  }

  return {
    streams: ((data ?? []) as OsStreamRow[]).map(mapStreamRow),
    loadFailed: false,
  };
}

async function fetchStreamsForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: { activeOnly?: boolean },
): Promise<OsStream[]> {
  const { streams } = await fetchStreamsForUserResult(supabase, userId, options);
  return streams;
}

async function fetchStreamByIdForUser(
  supabase: SupabaseClient,
  userId: string,
  streamId: string,
): Promise<OsStream | null> {
  const { data, error } = await supabase
    .from("os_streams")
    .select(OS_STREAM_SELECT_COLUMNS)
    .eq("owner_user_id", userId)
    .eq("id", streamId)
    .maybeSingle();

  if (error) {
    console.error("fetchStreamById os_streams:", error.message);
    return null;
  }

  if (!data) return null;
  return mapStreamRow(data as OsStreamRow);
}

/**
 * All streams for the signed-in user (any status).
 * Returns `[]` when unauthenticated or on query failure.
 */
export async function fetchStreams(): Promise<OsStream[]> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) return [];

  const supabase = await supabaseServerClient();
  return fetchStreamsForUser(supabase, userId);
}

/**
 * Active streams only for the signed-in user.
 * Returns `[]` when unauthenticated or on query failure.
 */
export async function fetchActiveStreams(): Promise<OsStream[]> {
  const { streams } = await fetchActiveStreamsWithStatus();
  return streams;
}

export async function fetchActiveStreamsWithStatus(): Promise<ActiveStreamsLoadResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { streams: [], loadFailed: false };
  }

  const supabase = await supabaseServerClient();
  return fetchStreamsForUserResult(supabase, userId, { activeOnly: true });
}

/**
 * Single stream by id for the signed-in user.
 * Returns `null` when missing, unauthenticated, or on query failure.
 */
export async function fetchStreamById(streamId: string): Promise<OsStream | null> {
  const id = streamId.trim();
  if (!id) return null;

  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) return null;

  const supabase = await supabaseServerClient();
  return fetchStreamByIdForUser(supabase, userId, id);
}

/** Owner-scoped reads when the caller already has `user.id` (e.g. composite server loaders). */
export async function fetchActiveStreamsForUser(userId: string): Promise<OsStream[]> {
  const supabase = await supabaseServerClient();
  return fetchStreamsForUser(supabase, userId, { activeOnly: true });
}

export async function fetchStreamByIdForUserId(
  userId: string,
  streamId: string,
): Promise<OsStream | null> {
  const id = streamId.trim();
  if (!id) return null;

  const supabase = await supabaseServerClient();
  return fetchStreamByIdForUser(supabase, userId, id);
}
