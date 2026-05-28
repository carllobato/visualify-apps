"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
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
