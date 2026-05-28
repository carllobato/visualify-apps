import "server-only";

import { revalidatePath } from "next/cache";
import { OS_DEFAULT_STREAM_TEMPLATES } from "@/lib/os/default-stream-templates";
import { OS_STREAM_STATUS } from "@/lib/os/streams-data";
import { OS_ROUTES } from "@/lib/os-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

export type EnsureDefaultStreamsResult = {
  /** True when this call inserted the default set. */
  seeded: boolean;
  /** True when a guard query or insert failed (no seed attempted or incomplete). */
  failed: boolean;
};

type ActiveStreamNameRow = {
  name: string;
};

/**
 * Ensures the signed-in user has starting streams when they have none active.
 *
 * - Skips when any active stream exists (including after partial/manual setup).
 * - Does not restore archived streams; archived + zero active still seeds.
 * - Skips template names that already exist as active streams (rerun / race guard).
 */
export async function ensureDefaultStreamsForUser(userId: string): Promise<EnsureDefaultStreamsResult> {
  const ownerId = userId.trim();
  if (!ownerId) {
    return { seeded: false, failed: true };
  }

  const supabase = await supabaseServerClient();

  const { data: activeRows, error: activeError } = await supabase
    .from("os_streams")
    .select("name")
    .eq("owner_user_id", ownerId)
    .eq("status", OS_STREAM_STATUS.active);

  if (activeError) {
    console.error("ensureDefaultStreamsForUser os_streams (select):", activeError.message);
    return { seeded: false, failed: true };
  }

  const activeNames = new Set(
    ((activeRows ?? []) as ActiveStreamNameRow[]).map((row) => row.name.trim().toLowerCase()),
  );

  if (activeNames.size > 0) {
    return { seeded: false, failed: false };
  }

  const toInsert = OS_DEFAULT_STREAM_TEMPLATES.filter(
    (template) => !activeNames.has(template.name.toLowerCase()),
  );

  if (toInsert.length === 0) {
    return { seeded: false, failed: false };
  }

  const { error: insertError } = await supabase.from("os_streams").insert(
    toInsert.map((template) => ({
      owner_user_id: ownerId,
      name: template.name,
      icon: template.icon,
      color: template.color,
      description: null,
      status: OS_STREAM_STATUS.active,
    })),
  );

  if (insertError) {
    console.error("ensureDefaultStreamsForUser os_streams (insert):", insertError.message);
    return { seeded: false, failed: true };
  }

  revalidatePath(OS_ROUTES.streams);
  revalidatePath(OS_ROUTES.today);

  return { seeded: true, failed: false };
}
