import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { fetchManageableWorkspaceById } from "@/lib/workspace-settings-data";
import { resolveWorkspaceLogoUrl } from "@/lib/workspace-logo";
import { parseOptionalWorkspaceWebsiteUrl } from "@/lib/workspace-website-url";
import { isWorkspaceCreateType, type WorkspaceCreateType } from "@/types/workspace-create";

export type UpdateWorkspaceDetailsResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "INVALID_INPUT" | "SERVICE_ROLE_UNAVAILABLE" | "DB_ERROR" };

const WORKSPACE_NAME_MAX = 120;

/**
 * Update workspace setup fields for HQ admin. Slug is intentionally unchanged when name changes (MVP).
 * Recalculates `logo_url` from normalised `website_url` via {@link resolveWorkspaceLogoUrl}.
 */
export async function updateWorkspaceDetailsForAdmin(params: {
  actingUserId: string;
  workspaceId: string;
  name: string;
  workspaceType: WorkspaceCreateType;
  websiteUrl: string | null;
  supabaseClient?: SupabaseClient;
}): Promise<UpdateWorkspaceDetailsResult> {
  const workspaceId = params.workspaceId.trim();
  const actingUserId = params.actingUserId.trim();
  const name = params.name.trim();

  if (!workspaceId || !actingUserId) {
    return { ok: false, code: "FORBIDDEN" };
  }

  if (!name || name.length > WORKSPACE_NAME_MAX) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  if (!isWorkspaceCreateType(params.workspaceType)) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const websiteParsed = parseOptionalWorkspaceWebsiteUrl(params.websiteUrl ?? "");
  if (!websiteParsed.ok) {
    return { ok: false, code: "INVALID_INPUT" };
  }
  const websiteUrl = websiteParsed.url;

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
    .update({
      name,
      workspace_type: params.workspaceType,
      website_url: websiteUrl,
      logo_url: resolveWorkspaceLogoUrl(websiteUrl),
    })
    .eq("id", workspaceId);

  if (error) {
    console.error("updateWorkspaceDetailsForAdmin:", error.message);
    return { ok: false, code: "DB_ERROR" };
  }

  return { ok: true };
}
