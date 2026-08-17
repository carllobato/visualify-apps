import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRiskAIProductId } from "@/lib/products";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import {
  createRiskAiWorkspaceForOwner,
  type CreateRiskAiWorkspaceDeps,
  type CreateWorkspaceResult,
  type RiskAiWorkspaceInsert,
  type RiskAiWorkspaceMemberInsert,
  type RiskAiWorkspaceProductInsert,
} from "@/lib/workspace/createWorkspace.logic";
import {
  allocateUniqueWorkspaceSlug,
  isPostgresUniqueViolation,
} from "@/lib/workspace/workspaceSlug";

async function rollbackCreatedWorkspace(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<void> {
  const { error: membersErr } = await admin
    .from("visualify_workspace_members")
    .delete()
    .eq("workspace_id", workspaceId);
  if (membersErr) {
    console.error("createRiskAiWorkspace rollback members:", membersErr.message, { workspaceId });
  }

  const { error: productsErr } = await admin
    .from("visualify_workspace_products")
    .delete()
    .eq("workspace_id", workspaceId);
  if (productsErr) {
    console.error("createRiskAiWorkspace rollback products:", productsErr.message, { workspaceId });
  }

  const { error: workspaceErr } = await admin
    .from("visualify_workspaces")
    .delete()
    .eq("id", workspaceId);
  if (workspaceErr) {
    console.error("createRiskAiWorkspace rollback workspace:", workspaceErr.message, { workspaceId });
  }
}

function createRiskAiWorkspaceDeps(admin: SupabaseClient): CreateRiskAiWorkspaceDeps {
  return {
    allocateUniqueWorkspaceSlug: (name) => allocateUniqueWorkspaceSlug(admin, name),
    resolveRiskAiProductId: () => getRiskAIProductId(admin),
    async insertWorkspace(row: RiskAiWorkspaceInsert) {
      const { data: workspace, error: wsErr } = await admin
        .from("visualify_workspaces")
        .insert(row)
        .select("id")
        .single();

      if (wsErr) {
        if (isPostgresUniqueViolation(wsErr)) {
          return { ok: false as const, uniqueViolation: true };
        }
        console.error("createRiskAiWorkspace workspace:", wsErr.message);
        return { ok: false as const, uniqueViolation: false };
      }

      const workspaceId = typeof workspace?.id === "string" ? workspace.id : "";
      if (!workspaceId) {
        return { ok: false as const, uniqueViolation: false };
      }
      return { ok: true as const, workspaceId };
    },
    async insertOwnerMembership(row: RiskAiWorkspaceMemberInsert) {
      const { error } = await admin.from("visualify_workspace_members").insert(row);
      if (error) {
        console.error("createRiskAiWorkspace member:", error.message, {
          workspaceId: row.workspace_id,
        });
        return false;
      }
      return true;
    },
    async insertRiskAiEntitlement(row: RiskAiWorkspaceProductInsert) {
      const { error } = await admin.from("visualify_workspace_products").insert(row);
      if (error) {
        if (isPostgresUniqueViolation(error)) {
          return true;
        }
        console.error("createRiskAiWorkspace product:", error.message, {
          workspaceId: row.workspace_id,
        });
        return false;
      }
      return true;
    },
    rollbackCreatedWorkspace: (workspaceId) => rollbackCreatedWorkspace(admin, workspaceId),
  };
}

/**
 * RiskAI-native Workspace create: workspace + active Owner membership + RiskAI-only entitlement.
 * Uses service role. Never creates a Portfolio. Never attaches other products.
 */
export async function createRiskAiWorkspace(params: {
  ownerUserId: string;
  name: string;
}): Promise<CreateWorkspaceResult> {
  let admin: SupabaseClient;
  try {
    admin = supabaseAdminClient();
  } catch {
    return { ok: false, code: "SERVICE_ROLE_UNAVAILABLE" };
  }

  return createRiskAiWorkspaceForOwner(createRiskAiWorkspaceDeps(admin), params);
}
