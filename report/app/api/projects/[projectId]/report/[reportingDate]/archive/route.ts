import { NextResponse } from "next/server";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { getReportWorkspaceProjectById } from "@/lib/projects/report-projects-server";
import { archiveReportSnapshot } from "@/lib/projects/report-snapshots-server";
import { productConfig } from "@/lib/product-config";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

/**
 * POST /api/projects/[projectId]/report/[reportingDate]/archive — Soft-delete a report snapshot.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; reportingDate: string }> },
) {
  const { projectId, reportingDate } = await context.params;
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

  const workspaceContext = await resolveActiveReportWorkspaceContext(user.id);
  const activeWorkspaceId = workspaceContext.selectedWorkspaceId;

  const project = await getReportWorkspaceProjectById(
    supabase,
    user.id,
    activeWorkspaceId,
    projectId,
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404, headers: CACHE_HEADERS });
  }

  const result = await archiveReportSnapshot(
    supabase,
    projectId,
    decodeURIComponent(reportingDate),
    user.id,
  );

  if (!result.ok) {
    const status = result.message === "Report not found." ? 404 : 500;
    return NextResponse.json({ error: result.message }, { status, headers: CACHE_HEADERS });
  }

  return NextResponse.json(
    { ok: true, latestRemainingReportingDate: result.latestRemainingReportingDate },
    { status: 200, headers: CACHE_HEADERS },
  );
}
