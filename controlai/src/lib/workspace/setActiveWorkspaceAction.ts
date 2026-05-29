"use server";

import { supabaseServerClient } from "@/lib/supabase/server";
import { writeVisualifyActiveWorkspaceIdCookie } from "@/lib/workspace/activeWorkspaceCookie";
import { getControlAIEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";

export type SetControlAiActiveWorkspaceResult =
  | { ok: true }
  | { ok: false; reason: "forbidden" | "invalid" };

/**
 * Persists the active workspace for ControlAI after validating product entitlement.
 * Mirrors HQ `setVisualifyActiveWorkspaceIdAction` but uses entitled workspaces (not manageable-only).
 */
export async function setControlAiActiveWorkspaceIdAction(
  workspaceId: string,
): Promise<SetControlAiActiveWorkspaceResult> {
  const id = workspaceId.trim();
  if (!id) return { ok: false, reason: "invalid" };

  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "forbidden" };

  const entitled = await getControlAIEntitledWorkspaces(supabase, user.id);
  if (!entitled.some((w) => w.id === id)) {
    return { ok: false, reason: "forbidden" };
  }

  await writeVisualifyActiveWorkspaceIdCookie(id);

  return { ok: true };
}
