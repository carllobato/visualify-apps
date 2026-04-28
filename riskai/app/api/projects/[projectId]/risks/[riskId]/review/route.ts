import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getProjectAccessForUser } from "@/lib/db/projectAccess";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ projectId: string; riskId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { projectId, riskId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }
  if (!riskId) {
    return NextResponse.json({ error: "Risk ID required" }, { status: 400 });
  }

  const access = await getProjectAccessForUser(projectId, user.id);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!access.permissions.canEditContent) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const supabase = await supabaseServerClient();
  const { data: existingRisk, error: existingRiskError } = await supabase
    .from("riskai_risks")
    .select("id")
    .eq("project_id", projectId)
    .eq("id", riskId)
    .maybeSingle();

  if (existingRiskError) {
    return NextResponse.json({ error: existingRiskError.message }, { status: 500 });
  }
  if (!existingRisk) {
    return NextResponse.json({ error: "Risk not found" }, { status: 404 });
  }

  const { error: reviewError } = await supabase.rpc("riskai_mark_risk_reviewed", {
    p_project_id: projectId,
    p_risk_id: riskId,
  });

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
