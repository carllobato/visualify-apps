"use server";

import { supabaseServerClient } from "@/lib/supabase/server";
import { writeVisualifyActiveWorkspaceIdCookie } from "@/lib/workspace/activeWorkspaceCookie";
import { getReportEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";

export type SetReportActiveWorkspaceResult =
  | { ok: true }
  | { ok: false; reason: "forbidden" | "invalid" };

/**
 * Persists the active workspace for Report after validating product entitlement.
 * Mirrors HQ `setVisualifyActiveWorkspaceIdAction` but uses entitled workspaces (not manageable-only).
 */
export async function setReportActiveWorkspaceIdAction(
  workspaceId: string,
): Promise<SetReportActiveWorkspaceResult> {
  const id = workspaceId.trim();
  if (!id) return { ok: false, reason: "invalid" };

  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "forbidden" };

  const entitled = await getReportEntitledWorkspaces(supabase, user.id);
  if (!entitled.some((w) => w.id === id)) {
    return { ok: false, reason: "forbidden" };
  }

  await writeVisualifyActiveWorkspaceIdCookie(id);

  return { ok: true };
}
