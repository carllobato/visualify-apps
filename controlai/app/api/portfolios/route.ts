import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { getControlAIProductId } from "@/lib/products";
import { productConfig } from "@/lib/product-config";
import { getControlAIEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

type ControlAIPortfolioInsertPayload = {
  name: string;
  product_id: string;
  owner_user_id: string;
  description?: string | null;
  workspace_id?: string | null;
};

function resolveWorkspaceIdForCreate(
  rawWorkspaceId: unknown,
  entitledWorkspaces: EntitledWorkspace[],
): { workspaceId: string | null } | { error: string } {
  if (entitledWorkspaces.length === 0) {
    return { workspaceId: null };
  }

  if (entitledWorkspaces.length === 1) {
    return { workspaceId: entitledWorkspaces[0]!.id };
  }

  const workspaceId = typeof rawWorkspaceId === "string" ? rawWorkspaceId.trim() : "";
  if (!workspaceId) {
    return { error: "Select a workspace." };
  }

  const match = entitledWorkspaces.find((w) => w.id === workspaceId);
  if (!match) {
    return { error: "Invalid workspace." };
  }

  return { workspaceId: match.id };
}

/**
 * POST /api/portfolios — Create a ControlAI portfolio owned by the current user.
 * Uses the service-role client after auth checks (same pattern as RiskAI portfolio create).
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await supabaseServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawName =
    typeof body === "object" && body !== null && "name" in body
      ? (body as { name: unknown }).name
      : undefined;
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Portfolio name is required." }, { status: 400 });
  }

  const rawDescription =
    typeof body === "object" && body !== null && "description" in body
      ? (body as { description: unknown }).description
      : undefined;
  const description =
    typeof rawDescription === "string" ? rawDescription.trim() || null : null;

  const rawWorkspaceId =
    typeof body === "object" && body !== null && "workspaceId" in body
      ? (body as { workspaceId: unknown }).workspaceId
      : undefined;

  const entitledWorkspaces = await getControlAIEntitledWorkspaces(supabase, user.id);
  const workspaceTarget = resolveWorkspaceIdForCreate(rawWorkspaceId, entitledWorkspaces);
  if ("error" in workspaceTarget) {
    return NextResponse.json({ error: workspaceTarget.error }, { status: 400 });
  }

  let admin;
  try {
    admin = supabaseAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const serviceRoleMissing = message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      {
        error: serviceRoleMissing
          ? "Portfolio creation is not configured: add SUPABASE_SERVICE_ROLE_KEY to the server environment."
          : "Portfolio creation is not configured.",
      },
      { status: 503 },
    );
  }

  let productId: string;
  try {
    productId = await getControlAIProductId(admin);
  } catch {
    return NextResponse.json(
      { error: "ControlAI product not found in visualify_products table" },
      { status: 500 },
    );
  }

  const insertPayload: ControlAIPortfolioInsertPayload = {
    name,
    product_id: productId,
    owner_user_id: user.id,
    ...(description !== null ? { description } : {}),
    ...(workspaceTarget.workspaceId ? { workspace_id: workspaceTarget.workspaceId } : {}),
  };

  const { data, error } = await admin
    .from("visualify_portfolios")
    .insert(insertPayload)
    .select("id, name, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ portfolio: data }, { status: 201, headers: CACHE_HEADERS });
}
