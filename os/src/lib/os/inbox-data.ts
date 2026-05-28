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
