import "server-only";

import { supabaseServerClient } from "@/lib/supabase/server";

export const OS_INBOX_PROCESSING_STATUS = {
  queued: "queued",
  processing: "processing",
  processed: "processed",
  failed: "failed",
} as const;

export type OsInboxProcessingStatus =
  (typeof OS_INBOX_PROCESSING_STATUS)[keyof typeof OS_INBOX_PROCESSING_STATUS];

export type OsInboxItem = {
  id: string;
  rawContent: string;
  processingStatus: OsInboxProcessingStatus | string;
  aiSummary: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type OsInboxLinkedTask = {
  id: string;
  title: string;
  sourceInboxItemId: string;
};

export type OsInboxLinkedWaitingOn = {
  id: string;
  title: string;
  sourceInboxItemId: string;
};

export type OsInboxLinkedOperationalItems = {
  tasks: OsInboxLinkedTask[];
  waitingOns: OsInboxLinkedWaitingOn[];
};

export const OS_INBOX_SELECT_COLUMNS =
  "id, raw_content, processing_status, ai_summary, created_at, updated_at, archived_at" as const;

type OsInboxItemRow = {
  id: string;
  raw_content: string;
  processing_status: string;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type OsLinkedTaskRow = {
  id: string;
  title: string;
  source_inbox_item_id: string;
};

type OsLinkedWaitingOnRow = {
  id: string;
  title: string;
  source_inbox_item_id: string;
};

function mapInboxItemRow(row: OsInboxItemRow): OsInboxItem {
  return {
    id: row.id,
    rawContent: row.raw_content,
    processingStatus: row.processing_status,
    aiSummary: row.ai_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

/** Non-archived inbox items for the current authenticated user, newest first. */
export async function fetchInboxItemsForCurrentUser(): Promise<OsInboxItem[]> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("os_inbox_items")
    .select(OS_INBOX_SELECT_COLUMNS)
    .eq("owner_user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchInboxItemsForCurrentUser os_inbox_items:", error.message);
    return [];
  }

  return ((data ?? []) as OsInboxItemRow[]).map(mapInboxItemRow);
}

/**
 * Linked operational objects created from inbox processing, keyed by `source_inbox_item_id`.
 * Owner-scoped and active/non-archived only.
 */
export async function fetchLinkedOperationalItemsByInboxId(
  ownerUserId: string,
  inboxItemIds: readonly string[],
): Promise<Record<string, OsInboxLinkedOperationalItems>> {
  const ids = Array.from(
    new Set(
      inboxItemIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  );
  if (ids.length === 0) return {};

  const supabase = await supabaseServerClient();
  const [taskResult, waitingOnResult] = await Promise.all([
    supabase
      .from("os_tasks")
      .select("id, title, source_inbox_item_id")
      .eq("owner_user_id", ownerUserId)
      .in("source_inbox_item_id", ids)
      .is("archived_at", null)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("os_waiting_ons")
      .select("id, title, source_inbox_item_id")
      .eq("owner_user_id", ownerUserId)
      .in("source_inbox_item_id", ids)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const result: Record<string, OsInboxLinkedOperationalItems> = {};
  for (const id of ids) {
    result[id] = { tasks: [], waitingOns: [] };
  }

  if (taskResult.error) {
    console.error("fetchLinkedOperationalItemsByInboxId os_tasks:", taskResult.error.message);
  } else {
    for (const row of (taskResult.data ?? []) as OsLinkedTaskRow[]) {
      const sourceId = row.source_inbox_item_id?.trim();
      if (!sourceId || !result[sourceId]) continue;
      result[sourceId].tasks.push({
        id: row.id,
        title: row.title,
        sourceInboxItemId: sourceId,
      });
    }
  }

  if (waitingOnResult.error) {
    console.error(
      "fetchLinkedOperationalItemsByInboxId os_waiting_ons:",
      waitingOnResult.error.message,
    );
  } else {
    for (const row of (waitingOnResult.data ?? []) as OsLinkedWaitingOnRow[]) {
      const sourceId = row.source_inbox_item_id?.trim();
      if (!sourceId || !result[sourceId]) continue;
      result[sourceId].waitingOns.push({
        id: row.id,
        title: row.title,
        sourceInboxItemId: sourceId,
      });
    }
  }

  return result;
}
