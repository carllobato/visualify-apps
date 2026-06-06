import { NextResponse } from "next/server";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { createReportWorkspaceProject } from "@/lib/projects/report-projects-server";
import { productConfig } from "@/lib/product-config";
import { REPORT_ROUTES } from "@/lib/report-routes";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

/**
 * POST /api/projects — Create a Report project in the active workspace.
 * Workspace comes from the server cookie resolver only (never from the client body).
 */
export async function POST(request: Request) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CACHE_HEADERS });
  }

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CACHE_HEADERS });
  }

  const workspaceContext = await resolveActiveReportWorkspaceContext(supabase, user.id);
  const activeWorkspaceId = workspaceContext.selectedWorkspaceId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: CACHE_HEADERS });
  }

  const rawName =
    typeof body === "object" && body !== null && "name" in body
      ? (body as { name: unknown }).name
      : undefined;
  const rawCode =
    typeof body === "object" && body !== null && "code" in body
      ? (body as { code: unknown }).code
      : undefined;
  const rawLocation =
    typeof body === "object" && body !== null && "location" in body
      ? (body as { location: unknown }).location
      : undefined;
  const rawStage =
    typeof body === "object" && body !== null && "stage" in body
      ? (body as { stage: unknown }).stage
      : undefined;

  const result = await createReportWorkspaceProject(supabase, user.id, activeWorkspaceId, {
    name: typeof rawName === "string" ? rawName : "",
    stage: typeof rawStage === "string" ? rawStage : "",
    code: typeof rawCode === "string" ? rawCode : null,
    location: typeof rawLocation === "string" ? rawLocation : null,
  });

  if (!result.ok) {
    if (result.reason === "no_workspace") {
      return NextResponse.json(
        {
          error: result.message,
          redirectTo: REPORT_ROUTES.selectWorkspace,
        },
        { status: 400, headers: CACHE_HEADERS },
      );
    }

    const status = result.reason === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: result.message }, { status, headers: CACHE_HEADERS });
  }

  return NextResponse.json(
    { project: result.project },
    { status: 201, headers: CACHE_HEADERS },
  );
}
