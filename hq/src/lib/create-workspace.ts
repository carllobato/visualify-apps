import "server-only";

import { supabaseAdminClient } from "@/lib/supabase/admin";
import {
  allocateUniqueWorkspaceSlug,
  isPostgresUniqueViolation,
} from "@/lib/workspace-slug";
import { resolveWorkspaceLogoUrl } from "@/lib/workspace-logo";
import { parseOptionalWorkspaceWebsiteUrl } from "@/lib/workspace-website-url";
import type { WorkspaceCreateType } from "@/types/workspace-create";

export type CreateWorkspaceResult =
  | { ok: true; workspaceId: string }
  | { ok: false; code: "INVALID_INPUT" | "SERVICE_ROLE_UNAVAILABLE" | "DB_ERROR" };

const WORKSPACE_NAME_MAX = 120;

/**
 * Manual workspace onboarding for HQ.
 *
 * A **workspace** is the billing and ownership boundary in Visualify (subscriptions and product
 * enablement attach here). **Memberships** (`visualify_workspace_members`) are the permission
 * source of truth: HQ admin access and app entitlements are evaluated from active member rows,
 * not from the workspace record alone.
 *
 * Creates workspace + owner membership atomically via service role: insert workspace, insert
 * member, and compensate (delete workspace) if the member row cannot be created.
 */
export async function createWorkspaceForOwner(params: {
  ownerUserId: string;
  name: string;
  workspaceType: WorkspaceCreateType;
  websiteUrl?: string | null;
}): Promise<CreateWorkspaceResult> {
  const ownerUserId = params.ownerUserId.trim();
  const name = params.name.trim();

  if (!ownerUserId || !name || name.length > WORKSPACE_NAME_MAX) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const websiteParsed = parseOptionalWorkspaceWebsiteUrl(params.websiteUrl ?? "");
  if (!websiteParsed.ok) {
    return { ok: false, code: "INVALID_INPUT" };
  }
  const websiteUrl = websiteParsed.url;

  let admin;
  try {
    admin = supabaseAdminClient();
  } catch {
    return { ok: false, code: "SERVICE_ROLE_UNAVAILABLE" };
  }

  for (let slugAttempt = 0; slugAttempt < 5; slugAttempt++) {
    let slug: string;
    try {
      slug = await allocateUniqueWorkspaceSlug(admin, name);
    } catch (e) {
      console.error("createWorkspaceForOwner slug:", e);
      return { ok: false, code: "DB_ERROR" };
    }

    const { data: workspace, error: wsErr } = await admin
      .from("visualify_workspaces")
      .insert({
        name,
        slug,
        workspace_type: params.workspaceType,
        owner_user_id: ownerUserId,
        status: "active",
        website_url: websiteUrl,
        logo_url: resolveWorkspaceLogoUrl(websiteUrl),
      })
      .select("id")
      .single();

    if (wsErr) {
      if (isPostgresUniqueViolation(wsErr)) {
        continue;
      }
      console.error("createWorkspaceForOwner workspace:", wsErr.message);
      return { ok: false, code: "DB_ERROR" };
    }

    const workspaceId = workspace?.id;
    if (!workspaceId) {
      return { ok: false, code: "DB_ERROR" };
    }

    const { error: memberErr } = await admin.from("visualify_workspace_members").insert({
      workspace_id: workspaceId,
      user_id: ownerUserId,
      role: "owner",
      status: "active",
    });

    if (memberErr) {
      console.error("createWorkspaceForOwner member:", memberErr.message);
      const { error: rollbackErr } = await admin
        .from("visualify_workspaces")
        .delete()
        .eq("id", workspaceId);
      if (rollbackErr) {
        console.error("createWorkspaceForOwner rollback:", rollbackErr.message);
      }
      return { ok: false, code: "DB_ERROR" };
    }

    return { ok: true, workspaceId };
  }

  return { ok: false, code: "DB_ERROR" };
}
