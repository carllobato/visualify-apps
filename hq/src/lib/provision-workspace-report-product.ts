import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isPostgresUniqueViolation } from "@/lib/workspace-slug";
import { getReportProductId, REPORT_PRODUCT_KEY } from "@/lib/products";

export const REPORT_WORKSPACE_PRODUCT_PLAN = "standard";

export type ProvisionReportProductResult =
  | { ok: true }
  | { ok: false; step: "product_lookup" | "existing_check" | "insert"; message: string };

/**
 * Attaches Report (`visualify_workspace_products`) to a new workspace.
 * Idempotent when a row already exists for the workspace/product pair.
 */
export async function provisionReportProductForWorkspace(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<ProvisionReportProductResult> {
  let productId: string;
  try {
    productId = await getReportProductId(admin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[provisionReportProductForWorkspace] product_lookup failed", {
      workspaceId,
      productKey: REPORT_PRODUCT_KEY,
      message,
    });
    return { ok: false, step: "product_lookup", message };
  }

  const { data: existing, error: existingErr } = await admin
    .from("visualify_workspace_products")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingErr) {
    console.error("[provisionReportProductForWorkspace] existing_check failed", {
      workspaceId,
      productKey: REPORT_PRODUCT_KEY,
      productId,
      message: existingErr.message,
    });
    return { ok: false, step: "existing_check", message: existingErr.message };
  }

  if (existing?.id) {
    return { ok: true };
  }

  const { error: insertErr } = await admin.from("visualify_workspace_products").insert({
    workspace_id: workspaceId,
    product_id: productId,
    subscription_status: "active",
    plan: REPORT_WORKSPACE_PRODUCT_PLAN,
  });

  if (!insertErr) {
    return { ok: true };
  }

  if (isPostgresUniqueViolation(insertErr)) {
    return { ok: true };
  }

  console.error("[provisionReportProductForWorkspace] insert failed", {
    workspaceId,
    productKey: REPORT_PRODUCT_KEY,
    productId,
    message: insertErr.message,
  });
  return { ok: false, step: "insert", message: insertErr.message };
}
