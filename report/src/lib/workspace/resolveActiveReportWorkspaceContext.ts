import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readVisualifyActiveWorkspaceIdFromCookie } from "@/lib/workspace/activeWorkspaceCookie";
import { getReportEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

export type ActiveReportWorkspaceContext = {
  workspaces: EntitledWorkspace[];
  selectedWorkspaceId: string | null;
  /** True when the user has multiple entitled workspaces and no valid cookie selection. */
  needsSelection: boolean;
};

/**
 * Resolves Report active workspace from entitled workspaces and `visualify_active_workspace_id`.
 * Cookie writes belong in server actions (e.g. workspace switcher), not during layout render.
 */
export async function resolveActiveReportWorkspaceContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveReportWorkspaceContext> {
  const workspaces = await getReportEntitledWorkspaces(supabase, userId);

  if (workspaces.length === 0) {
    return { workspaces, selectedWorkspaceId: null, needsSelection: false };
  }

  const cookieId = await readVisualifyActiveWorkspaceIdFromCookie();
  if (cookieId) {
    const match = workspaces.find((w) => w.id === cookieId);
    if (match) {
      return {
        workspaces,
        selectedWorkspaceId: match.id,
        needsSelection: false,
      };
    }
  }

  if (workspaces.length === 1) {
    return {
      workspaces,
      selectedWorkspaceId: workspaces[0]!.id,
      needsSelection: false,
    };
  }

  return {
    workspaces,
    selectedWorkspaceId: null,
    needsSelection: true,
  };
}
