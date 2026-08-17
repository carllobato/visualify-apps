import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { productConfig } from "@/lib/product-config";
import { writeVisualifyActiveWorkspaceIdCookie } from "@/lib/workspace/activeWorkspaceCookie";
import { createRiskAiWorkspace } from "@/lib/workspace/createWorkspace";
import {
  canCreateRiskAiWorkspace,
  parseCreateWorkspaceRequestBody,
} from "@/lib/workspace/createWorkspace.logic";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

/**
 * POST /api/workspaces — Create a Workspace owned by the signed-in RiskAI user.
 * `owner_user_id`, membership role, and RiskAI entitlement are server-controlled.
 * Does not inspect the caller's role in any existing Workspace.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const hasRiskAiProductAccess = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (
    !canCreateRiskAiWorkspace({
      authenticated: true,
      hasRiskAiProductAccess,
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CACHE_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CACHE_HEADERS });
  }

  const parsed = parseCreateWorkspaceRequestBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: CACHE_HEADERS });
  }

  const result = await createRiskAiWorkspace({
    ownerUserId: user.id,
    name: parsed.name,
  });

  if (!result.ok) {
    if (result.code === "SERVICE_ROLE_UNAVAILABLE") {
      return NextResponse.json(
        {
          error: "Workspace creation is not configured: add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
          code: "SERVICE_ROLE_MISSING",
        },
        { status: 503, headers: CACHE_HEADERS },
      );
    }
    if (result.code === "INVALID_INPUT") {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400, headers: CACHE_HEADERS },
      );
    }
    if (result.code === "PRODUCT_PROVISION_FAILED") {
      return NextResponse.json(
        {
          error: "Could not attach RiskAI to the new workspace.",
          code: "WORKSPACE_PRODUCT_PROVISION_FAILED",
        },
        { status: 500, headers: CACHE_HEADERS },
      );
    }
    return NextResponse.json(
      { error: "Could not create workspace" },
      { status: 500, headers: CACHE_HEADERS },
    );
  }

  await writeVisualifyActiveWorkspaceIdCookie(result.workspaceId);

  return NextResponse.json(
    { ok: true, workspace_id: result.workspaceId },
    { status: 201, headers: CACHE_HEADERS },
  );
}
