"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import { processSingleInboxItemWithAi } from "@/lib/os/inbox-processing";
import { OS_INBOX_PROCESSING_STATUS } from "@/lib/os/inbox-data";
import { OS_ROUTES } from "@/lib/os-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

const CONTENT_MAX = 8000;

export type InboxActionResult = { ok: true } | { ok: false; error: string };

function normalizeContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > CONTENT_MAX) {
    return trimmed.slice(0, CONTENT_MAX);
  }
  return trimmed;
}

function validateInboxItemId(id: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof id !== "string") {
    return { ok: false, error: "Inbox item id is required." };
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return { ok: false, error: "Inbox item id is required." };
  }
  return { ok: true, value: trimmed };
}

function revalidateInboxPath(): void {
  revalidatePath(OS_ROUTES.inbox);
}

export async function createInboxItemAction(rawContent: string): Promise<InboxActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const content = normalizeContent(rawContent);
  if (!content) {
    return { ok: false, error: "Capture cannot be empty." };
  }

  const supabase = await supabaseServerClient();
  const { error } = await supabase.from("os_inbox_items").insert({
    owner_user_id: userId,
    raw_content: content,
  });

  if (error) {
    console.error("createInboxItemAction os_inbox_items:", error.message);
    return { ok: false, error: "Unable to save capture." };
  }

  revalidateInboxPath();
  return { ok: true };
}

export async function archiveInboxItemAction(inboxItemId: string): Promise<InboxActionResult> {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }

  const idResult = validateInboxItemId(inboxItemId);
  if (!idResult.ok) return idResult;

  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("os_inbox_items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", idResult.value)
    .eq("owner_user_id", userId);

  if (error) {
    console.error("archiveInboxItemAction os_inbox_items:", error.message);
    return { ok: false, error: "Unable to archive item." };
  }

  revalidateInboxPath();
  return { ok: true };
}

export async function processInboxItemWithAiAction(inboxItemId: string): Promise<InboxActionResult> {
  console.log("[inbox/process] action start", { inboxItemId });
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    console.log("[inbox/process] unauthorized");
    return { ok: false, error: "Unauthorized" };
  }

  const idResult = validateInboxItemId(inboxItemId);
  if (!idResult.ok) return idResult;
  console.log("[inbox/process] validated id", { inboxItemId: idResult.value, userId });

  const supabase = await supabaseServerClient();
  const { data: existing, error: readError } = await supabase
    .from("os_inbox_items")
    .select("id, raw_content, processing_status")
    .eq("id", idResult.value)
    .eq("owner_user_id", userId)
    .is("archived_at", null)
    .maybeSingle();

  if (readError) {
    console.error("processInboxItemWithAiAction read os_inbox_items:", readError.message);
    return { ok: false, error: "Unable to load inbox item." };
  }

  if (!existing) {
    console.log("[inbox/process] inbox item not found", { inboxItemId: idResult.value, userId });
    return { ok: false, error: "Inbox item not found." };
  }
  console.log("[inbox/process] inbox item loaded", {
    inboxItemId: existing.id,
    processingStatus: existing.processing_status,
    rawContentLength: typeof existing.raw_content === "string" ? existing.raw_content.length : -1,
  });

  const currentStatus =
    typeof existing.processing_status === "string"
      ? existing.processing_status.trim().toLowerCase()
      : "";
  if (currentStatus === OS_INBOX_PROCESSING_STATUS.processing) {
    return { ok: false, error: "Inbox item is already processing." };
  }
  if (currentStatus === OS_INBOX_PROCESSING_STATUS.processed) {
    return { ok: false, error: "Inbox item has already been processed." };
  }

  const { data: processingRow, error: markProcessingError } = await supabase
    .from("os_inbox_items")
    .update({
      processing_status: OS_INBOX_PROCESSING_STATUS.processing,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idResult.value)
    .eq("owner_user_id", userId)
    .select("id, processing_status")
    .maybeSingle();

  if (markProcessingError) {
    console.error(
      "processInboxItemWithAiAction mark processing os_inbox_items:",
      markProcessingError.message,
    );
    return { ok: false, error: "Unable to start processing." };
  }
  if (!processingRow) {
    console.error("processInboxItemWithAiAction mark processing affected 0 rows", {
      inboxItemId: idResult.value,
      userId,
    });
    return { ok: false, error: "Unable to start processing." };
  }
  console.log("[inbox/process] marked processing", { inboxItemId: idResult.value });

  try {
    console.log("[inbox/process] invoking AI processor", { inboxItemId: idResult.value });
    const result = await processSingleInboxItemWithAi(userId, idResult.value, existing.raw_content);
    if (!result.ok) {
      console.log("[inbox/process] AI processor returned failure", {
        inboxItemId: idResult.value,
        error: result.error,
      });
      const { data: failedRow, error: failUpdateError } = await supabase
        .from("os_inbox_items")
        .update({
          processing_status: OS_INBOX_PROCESSING_STATUS.failed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idResult.value)
        .eq("owner_user_id", userId)
        .select("id, processing_status")
        .maybeSingle();

      if (failUpdateError) {
        console.error(
          "processInboxItemWithAiAction fail status os_inbox_items:",
          failUpdateError.message,
        );
      }
      if (!failedRow) {
        console.error("processInboxItemWithAiAction fail status affected 0 rows", {
          inboxItemId: idResult.value,
          userId,
        });
      }

      revalidateInboxPath();
      return { ok: false, error: result.error };
    }
    console.log("[inbox/process] AI processor succeeded", {
      inboxItemId: idResult.value,
      summaryLength: result.summary.length,
      createdTaskCount: result.createdTaskIds.length,
      createdProjectCount: result.createdProjectIds.length,
      createdWaitingOnCount: result.createdWaitingOnIds.length,
    });

    const { data: processedRow, error: markProcessedError } = await supabase
      .from("os_inbox_items")
      .update({
        processing_status: OS_INBOX_PROCESSING_STATUS.processed,
        ai_summary: result.summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idResult.value)
      .eq("owner_user_id", userId)
      .select("id, processing_status")
      .maybeSingle();

    if (markProcessedError) {
      console.error(
        "processInboxItemWithAiAction mark processed os_inbox_items:",
        markProcessedError.message,
      );
      return { ok: false, error: "Processing completed, but inbox update failed." };
    }
    if (!processedRow) {
      console.error("processInboxItemWithAiAction mark processed affected 0 rows", {
        inboxItemId: idResult.value,
        userId,
      });
      return { ok: false, error: "Unable to finalize inbox status." };
    }
    console.log("[inbox/process] marked processed", {
      inboxItemId: idResult.value,
    });

    revalidateInboxPath();
    return { ok: true };
  } catch (error) {
    const { data: failedRow, error: failUpdateError } = await supabase
      .from("os_inbox_items")
      .update({
        processing_status: OS_INBOX_PROCESSING_STATUS.failed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idResult.value)
      .eq("owner_user_id", userId)
      .select("id, processing_status")
      .maybeSingle();

    if (failUpdateError) {
      console.error(
        "processInboxItemWithAiAction fail catch os_inbox_items:",
        failUpdateError.message,
      );
    }
    if (!failedRow) {
      console.error("processInboxItemWithAiAction fail catch affected 0 rows", {
        inboxItemId: idResult.value,
        userId,
      });
    }

    const message = error instanceof Error ? error.message : "Unexpected processing error.";
    console.error("processInboxItemWithAiAction:", message);
    revalidateInboxPath();
    return { ok: false, error: "Unable to process inbox item with AI." };
  }
}

export type InboxCaptureFormState = {
  error: string | null;
};

export type InboxItemActionFormState = {
  error: string | null;
};

export async function createInboxItemFromFormAction(
  _prev: InboxCaptureFormState | null,
  formData: FormData,
): Promise<InboxCaptureFormState> {
  const rawContent = formData.get("rawContent");
  const result = await createInboxItemAction(typeof rawContent === "string" ? rawContent : "");

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null };
}

export async function archiveInboxItemFromFormAction(
  _prev: InboxItemActionFormState | null,
  formData: FormData,
): Promise<InboxItemActionFormState> {
  const id = formData.get("id");
  const result = await archiveInboxItemAction(typeof id === "string" ? id : "");

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null };
}

export async function processInboxItemWithAiFromFormAction(
  _prev: InboxItemActionFormState | null,
  formData: FormData,
): Promise<InboxItemActionFormState> {
  const id = formData.get("id");
  const result = await processInboxItemWithAiAction(typeof id === "string" ? id : "");

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null };
}
