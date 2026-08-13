import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";
import { readVisualifyActiveWorkspaceIdFromCookie } from "@/lib/workspace/activeWorkspaceCookie";
import { getRiskAiEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import { resolveActiveWorkspaceSelection } from "@/lib/workspace/resolveActiveWorkspaceSelection";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

export type ActiveRiskAiWorkspaceContext = {
  workspaces: EntitledWorkspace[];
  selectedWorkspaceId: string | null;
  /** True when the user has multiple entitled workspaces and no valid cookie selection. */
  needsSelection: boolean;
};

async function resolveActiveRiskAiWorkspaceContextImpl(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveRiskAiWorkspaceContext> {
  const workspaces = await getRiskAiEntitledWorkspaces(supabase, userId);
  const cookieId = await readVisualifyActiveWorkspaceIdFromCookie();
  const selection = resolveActiveWorkspaceSelection({
    workspaceIds: workspaces.map((w) => w.id),
    cookieWorkspaceId: cookieId,
  });

  return {
    workspaces,
    selectedWorkspaceId: selection.selectedWorkspaceId,
    needsSelection: selection.needsSelection,
  };
}

async function resolveActiveRiskAiWorkspaceContextForUser(
  userId: string,
): Promise<ActiveRiskAiWorkspaceContext> {
  const supabase = await supabaseServerClient();
  return resolveActiveRiskAiWorkspaceContextImpl(supabase, userId);
}

/**
 * Resolves RiskAI active workspace from entitled workspaces and `visualify_active_workspace_id`.
 * Cookie writes belong in server actions (e.g. workspace switcher), not during layout render.
 *
 * Wrapped in `cache()` so layout + page loaders in the same request share one workspace resolution.
 */
export const resolveActiveRiskAiWorkspaceContext = cache(resolveActiveRiskAiWorkspaceContextForUser);
