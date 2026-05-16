import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { fetchManageableWorkspaceById } from "@/lib/workspace-settings-data";

export type ArchiveWorkspaceResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "SERVICE_ROLE_UNAVAILABLE" | "DB_ERROR" };

/**
 * Soft-delete (archive) a workspace for HQ MVP.
 *
 * DB constraint allows only `active` | `suspended` | `cancelled`; we use `cancelled` as the
 * recoverable soft-delete state (UI: "Archive workspace"). Do not hard-delete workspace rows.
 * Memberships, entitlements, and history remain intact for Visualify support recovery.
 */
export async function archiveWorkspaceForAdmin(params: {
  actingUserId: string;
  workspaceId: string;
  supabaseClient?: SupabaseClient;
}): Promise<ArchiveWorkspaceResult> {
  const workspaceId = params.workspaceId.trim();
  const actingUserId = params.actingUserId.trim();
  if (!workspaceId || !actingUserId) {
    return { ok: false, code: "FORBIDDEN" };
  }

  const manageable = await fetchManageableWorkspaceById(
    actingUserId,
    workspaceId,
    params.supabaseClient,
  );
  if (!manageable) {
    return { ok: false, code: "FORBIDDEN" };
  }

  let admin;
  try {
    admin = supabaseAdminClient();
  } catch {
    return { ok: false, code: "SERVICE_ROLE_UNAVAILABLE" };
  }

  const { error } = await admin
    .from("visualify_workspaces")
    .update({ status: "cancelled" })
    .eq("id", workspaceId);

  if (error) {
    console.error("archiveWorkspaceForAdmin:", error.message);
    return { ok: false, code: "DB_ERROR" };
  }

  return { ok: true };
}
