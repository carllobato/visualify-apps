import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getProjectAccessForUser } from "@/lib/db/projectAccess";
import {
  RISK_DB_SELECT_COLUMNS,
  normalizeRiskRow,
  withCanonicalRiskStatus,
} from "@/lib/db/risks";
import type { RiskRow } from "@/types/risk";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ServerSupabase = Awaited<ReturnType<typeof supabaseServerClient>>;

async function fetchActiveRiskStatusNames(supabase: ServerSupabase): Promise<string[]> {
  const { data, error } = await supabase
    .from("riskai_risk_statuses")
    .select("name")
    .eq("is_active", true);
  if (error) {
    console.error("[risk API] fetchActiveRiskStatusNames", error.message);
    return [];
  }
  return ((data ?? []) as { name: string }[]).map((r) => r.name).filter(Boolean);
}

export async function PUT(
  request: Request,
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

  let body: { risk?: unknown };
  try {
    body = (await request.json()) as { risk?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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

  const normalized = normalizeRiskRow(body.risk, projectId);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid payload: malformed risk row" }, { status: 400 });
  }
  if (normalized.id !== riskId) {
    return NextResponse.json({ error: "Invalid payload: risk id mismatch" }, { status: 400 });
  }

  const statusNames = await fetchActiveRiskStatusNames(supabase);
  const row = withCanonicalRiskStatus(normalized, statusNames);
  const { data: savedRow, error: upsertError } = await supabase
    .from("riskai_risks")
    .upsert(row, { onConflict: "id" })
    .select(RISK_DB_SELECT_COLUMNS)
    .eq("project_id", projectId)
    .eq("id", riskId)
    .maybeSingle();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }
  if (!savedRow) {
    return NextResponse.json({ error: "Failed to save risk" }, { status: 500 });
  }

  return NextResponse.json({ risk: savedRow as RiskRow }, { status: 200 });
}
