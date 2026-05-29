import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readVisualifyActiveWorkspaceIdFromCookie,
  writeVisualifyActiveWorkspaceIdCookie,
} from "@/lib/workspace/activeWorkspaceCookie";
import { getControlAIEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

export type ActiveWorkspaceContext = {
  workspaces: EntitledWorkspace[];
  selectedWorkspaceId: string | null;
  /** True when the user has multiple entitled workspaces and no valid cookie selection. */
  needsSelection: boolean;
};

/**
 * Resolves ControlAI active workspace from entitled workspaces and `visualify_active_workspace_id`.
 * Auto-persists the cookie when exactly one workspace is entitled.
 */
export async function resolveActiveWorkspaceContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveWorkspaceContext> {
  const workspaces = await getControlAIEntitledWorkspaces(supabase, userId);

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
    const id = workspaces[0]!.id;
    await writeVisualifyActiveWorkspaceIdCookie(id);
    return {
      workspaces,
      selectedWorkspaceId: id,
      needsSelection: false,
    };
  }

  return {
    workspaces,
    selectedWorkspaceId: null,
    needsSelection: true,
  };
}
