import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getProjectAccessForUser } from "@/lib/db/projectAccess";
import { RISK_STATUS_ARCHIVED_LOOKUP } from "@/domain/risk/riskFieldSemantics";
import {
  RISK_DB_SELECT_COLUMNS,
  normalizeRiskRow,
  withCanonicalRiskStatus,
  type RiskInsertRow,
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
    console.error("[risks API] fetchActiveRiskStatusNames", error.message);
    return [];
  }
  return ((data ?? []) as { name: string }[]).map((r) => r.name).filter(Boolean);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const access = await getProjectAccessForUser(projectId, user.id);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("riskai_risks")
    .select(RISK_DB_SELECT_COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const statusNames = await fetchActiveRiskStatusNames(supabase);
  const rows = (data ?? []) as RiskRow[];
  const risks = rows.map((r) => withCanonicalRiskStatus(r, statusNames));

  return NextResponse.json({ risks }, { status: 200 });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const access = await getProjectAccessForUser(projectId, user.id);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!access.permissions.canEditContent) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  let body: { risks?: unknown };
  try {
    body = (await request.json()) as { risks?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.risks)) {
    return NextResponse.json({ error: "Invalid payload: risks must be an array" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const statusNames = await fetchActiveRiskStatusNames(supabase);

  const rows: RiskInsertRow[] = [];
  for (const item of body.risks) {
    const normalized = normalizeRiskRow(item, projectId);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid payload: malformed risk row" }, { status: 400 });
    }
    rows.push(withCanonicalRiskStatus(normalized, statusNames));
  }
  const { data: existingRows, error: listErr } = await supabase
    .from("riskai_risks")
    .select("id")
    .eq("project_id", projectId);

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const clientIds = new Set(rows.map((r) => r.id));
  const existingIds = ((existingRows ?? []) as { id: string }[]).map((r) => r.id);
  const orphanIds = existingIds.filter((id) => !clientIds.has(id));

  if (rows.length > 0) {
    const { data: upsertedRows, error: upsertError } = await supabase
      .from("riskai_risks")
      .upsert(rows, { onConflict: "id" })
      .select(RISK_DB_SELECT_COLUMNS);

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const upserted = (upsertedRows ?? []) as RiskRow[];
    if (upserted.length !== rows.length) {
      return NextResponse.json(
        {
          error: `Failed to save risks: expected ${rows.length} rows back, got ${upserted.length}.`,
        },
        { status: 500 }
      );
    }

    const byId = new Map(upserted.map((r) => [r.id, r]));
    const ordered: RiskRow[] = [];
    for (const row of rows) {
      const matched = byId.get(row.id);
      if (!matched) {
        return NextResponse.json(
          { error: `Failed to save risks: missing upserted row for id ${row.id}.` },
          { status: 500 }
        );
      }
      ordered.push(matched);
    }

    if (orphanIds.length > 0) {
      const now = new Date().toISOString();
      const { error: archErr } = await supabase
        .from("riskai_risks")
        .update({ status: RISK_STATUS_ARCHIVED_LOOKUP, updated_at: now })
        .in("id", orphanIds)
        .eq("project_id", projectId);
      if (archErr) {
        return NextResponse.json({ error: archErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ risks: ordered }, { status: 200 });
  }

  if (orphanIds.length > 0) {
    const now = new Date().toISOString();
    const { error: archErr } = await supabase
      .from("riskai_risks")
      .update({ status: RISK_STATUS_ARCHIVED_LOOKUP, updated_at: now })
      .in("id", orphanIds)
      .eq("project_id", projectId);
    if (archErr) {
      return NextResponse.json({ error: archErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ risks: [] }, { status: 200 });
}
