import "server-only";

import {
  fetchWorkspaceProductAccessForUser as fetchWorkspaceProductAccessWithClient,
  type WorkspaceProductAccessRow,
} from "@visualify/workspace-product-access";
import { supabaseServerClient } from "@/lib/supabase/server";

export type { WorkspaceProductAccessRow };

export async function fetchWorkspaceProductAccessForUser(
  userId: string
): Promise<WorkspaceProductAccessRow[]> {
  const supabase = await supabaseServerClient();
  return fetchWorkspaceProductAccessWithClient(supabase, userId);
}
