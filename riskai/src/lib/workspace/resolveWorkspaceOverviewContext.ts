import "server-only";

import { cache } from "react";
import { supabaseServerClient } from "@/lib/supabase/server";
import { getRiskAiEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import {
  resolveWorkspaceOverviewScope,
  type ResolveWorkspaceOverviewScopeResult,
} from "@/lib/workspace/resolveWorkspaceOverviewScope";

async function resolveWorkspaceOverviewContextImpl(
  workspaceId: string,
  userId: string,
): Promise<ResolveWorkspaceOverviewScopeResult> {
  const supabase = await supabaseServerClient();
  const entitledWorkspaces = await getRiskAiEntitledWorkspaces(supabase, userId);
  return resolveWorkspaceOverviewScope({
    supabase,
    workspaceId,
    entitledWorkspaces,
  });
}

/**
 * Request-scoped Workspace Overview access + Project load.
 * Layout and page share one entitlement + Project query per request.
 */
export const resolveWorkspaceOverviewContext = cache(resolveWorkspaceOverviewContextImpl);
