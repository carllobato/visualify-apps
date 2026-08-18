import type { SupabaseClient } from "@supabase/supabase-js";

function isNonEmptyId(value: string): boolean {
  return value.trim().length > 0;
}

function parseRpcBoolean(data: unknown): boolean {
  return data === true;
}

async function callCanReadRpc(
  supabase: SupabaseClient,
  rpcName: "can_read_project",
  args: { p_project_id: string; p_user_id: string },
  logLabel: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc(rpcName, args);

  if (error) {
    console.error(`[canReadAccess] ${logLabel}:`, error.message);
    return false;
  }

  return parseRpcBoolean(data);
}

/**
 * Whether `userId` may read the project (workspace, owner, or project_members).
 * Delegates to `public.can_read_project`. Fails closed on RPC error.
 */
export async function canReadProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<boolean> {
  if (!isNonEmptyId(projectId) || !isNonEmptyId(userId)) {
    return false;
  }

  return callCanReadRpc(
    supabase,
    "can_read_project",
    { p_project_id: projectId.trim(), p_user_id: userId.trim() },
    "canReadProject",
  );
}
