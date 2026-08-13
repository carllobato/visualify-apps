"use server";

import { supabaseServerClient } from "@/lib/supabase/server";
import { writeVisualifyActiveWorkspaceIdCookie } from "@/lib/workspace/activeWorkspaceCookie";
import { getRiskAiEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";

export type SetRiskAiActiveWorkspaceResult =
  | { ok: true }
  | { ok: false; reason: "forbidden" | "invalid" };

/**
 * Persists the active workspace for RiskAI after validating product entitlement.
 * Uses entitled workspaces (any RiskAI member), not the owner/admin creatable list.
 */
export async function setRiskAiActiveWorkspaceIdAction(
  workspaceId: string,
): Promise<SetRiskAiActiveWorkspaceResult> {
  const id = workspaceId.trim();
  if (!id) return { ok: false, reason: "invalid" };

  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "forbidden" };

  const entitled = await getRiskAiEntitledWorkspaces(supabase, user.id);
  if (!entitled.some((w) => w.id === id)) {
    return { ok: false, reason: "forbidden" };
  }

  await writeVisualifyActiveWorkspaceIdCookie(id);

  return { ok: true };
}
