import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";

export const OS_WAITING_ON_STATUS = {
  active: "active",
  resolved: "resolved",
  archived: "archived",
} as const;

export type OsWaitingOnStatus =
  (typeof OS_WAITING_ON_STATUS)[keyof typeof OS_WAITING_ON_STATUS];

export type OsWaitingOn = {
  id: string;
  workspaceId: string | null;
  streamId: string | null;
  projectId: string | null;
  sourceInboxItemId: string | null;
  title: string;
  description: string | null;
  priorityLevel: string | null;
  status: string;
  waitingOnName: string | null;
  waitingOnContact: string | null;
  expectedResponseAt: string | null;
  lastFollowedUpAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActiveProjectWaitingOnsLoadResult = {
  waitingOns: OsWaitingOn[];
  loadFailed: boolean;
};

const WAITING_ON_SELECT_COLUMNS =
  "id, workspace_id, stream_id, project_id, source_inbox_item_id, title, description, priority_level, status, waiting_on_name, waiting_on_contact, expected_response_at, last_followed_up_at, created_at, updated_at" as const;

type OsWaitingOnRow = {
  id: string;
  workspace_id: string | null;
  stream_id: string | null;
  project_id: string | null;
  source_inbox_item_id: string | null;
  title: string;
  description: string | null;
  priority_level: string | null;
  status: string;
  waiting_on_name: string | null;
  waiting_on_contact: string | null;
  expected_response_at: string | null;
  last_followed_up_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapWaitingOnRow(row: OsWaitingOnRow): OsWaitingOn {
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
    waitingOnName: row.waiting_on_name,
    waitingOnContact: row.waiting_on_contact,
    expectedResponseAt: row.expected_response_at,
    lastFollowedUpAt: row.last_followed_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function activeWaitingOnsQuery(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("os_waiting_ons")
    .select(WAITING_ON_SELECT_COLUMNS)
    .eq("owner_user_id", userId)
    .eq("status", OS_WAITING_ON_STATUS.active);
}

async function fetchActiveWaitingOnsForProjectResult(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<ActiveProjectWaitingOnsLoadResult> {
  const { data, error } = await activeWaitingOnsQuery(supabase, userId)
    .eq("project_id", projectId)
    .order("expected_response_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchActiveWaitingOnsForProject os_waiting_ons:", error.message);
    return { waitingOns: [], loadFailed: true };
  }

  return {
    waitingOns: ((data ?? []) as OsWaitingOnRow[]).map(mapWaitingOnRow),
    loadFailed: false,
  };
}

export async function fetchActiveWaitingOnsForProjectForUserId(
  userId: string,
  projectId: string,
): Promise<ActiveProjectWaitingOnsLoadResult> {
  const id = projectId.trim();
  if (!id) return { waitingOns: [], loadFailed: false };

  const supabase = await supabaseServerClient();
  return fetchActiveWaitingOnsForProjectResult(supabase, userId, id);
}
