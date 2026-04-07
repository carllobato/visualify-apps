import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getProjectAccessForUser } from "@/lib/db/projectAccess";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CURRENCIES = new Set(["AUD", "USD", "GBP"]);
const FINANCIAL_UNITS = new Set(["THOUSANDS", "MILLIONS", "BILLIONS"]);
const RISK_APPETITES = new Set(["P10", "P20", "P30", "P40", "P50", "P60", "P70", "P80", "P90"]);
const MAX_MONTHS = 1200;
const MAX_WEEKS = 520;

function asNonNegativeNumber(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return v;
}

function asNonNegativeInteger(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || !Number.isInteger(v)) return null;
  return v;
}

function asIsoDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return t;
}

/**
 * PATCH /api/projects/[projectId]/settings
 * Upserts required project settings row for onboarding/settings flows.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const bundle = await getProjectAccessForUser(projectId, user.id);
  if (!bundle) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!bundle.permissions.canEditProjectMetadata) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectName = typeof body.project_name === "string" ? body.project_name.trim() : "";
  if (!projectName) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const location =
    typeof body.location === "string" ? body.location.trim() : body.location === null ? "" : null;
  if (location === null) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }

  const currency = typeof body.currency === "string" ? body.currency.trim() : "";
  if (!CURRENCIES.has(currency)) {
    return NextResponse.json({ error: "Currency is required" }, { status: 400 });
  }

  const financialUnit = typeof body.financial_unit === "string" ? body.financial_unit.trim() : "";
  if (!FINANCIAL_UNITS.has(financialUnit)) {
    return NextResponse.json({ error: "Unit is required" }, { status: 400 });
  }

  const projectValueInput = asNonNegativeNumber(body.project_value_input);
  if (projectValueInput == null || projectValueInput <= 0) {
    return NextResponse.json({ error: "Project value is required" }, { status: 400 });
  }

  const contingencyValueInput = asNonNegativeNumber(body.contingency_value_input);
  if (contingencyValueInput == null) {
    return NextResponse.json({ error: "Contingency value is required" }, { status: 400 });
  }

  const plannedDurationMonths = asNonNegativeInteger(body.planned_duration_months);
  if (plannedDurationMonths == null || plannedDurationMonths <= 0 || plannedDurationMonths > MAX_MONTHS) {
    return NextResponse.json(
      { error: `Planned duration must be between 1 and ${MAX_MONTHS} months` },
      { status: 400 }
    );
  }

  const targetCompletionDate = asIsoDate(body.target_completion_date);
  if (!targetCompletionDate) {
    return NextResponse.json({ error: "Target completion date is required" }, { status: 400 });
  }

  const scheduleContingencyWeeks = asNonNegativeInteger(body.schedule_contingency_weeks);
  if (
    scheduleContingencyWeeks == null ||
    scheduleContingencyWeeks > MAX_WEEKS
  ) {
    return NextResponse.json(
      { error: `Schedule contingency must be between 0 and ${MAX_WEEKS} weeks` },
      { status: 400 }
    );
  }

  const riskAppetite = typeof body.risk_appetite === "string" ? body.risk_appetite.trim() : "";
  if (!RISK_APPETITES.has(riskAppetite)) {
    return NextResponse.json({ error: "Risk appetite is required" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const { error } = await supabase.from("visualify_project_settings").upsert(
    {
      project_id: projectId,
      project_name: projectName,
      location: location || null,
      currency,
      financial_unit: financialUnit,
      project_value_input: projectValueInput,
      contingency_value_input: contingencyValueInput,
      planned_duration_months: plannedDurationMonths,
      target_completion_date: targetCompletionDate,
      schedule_contingency_weeks: scheduleContingencyWeeks,
      risk_appetite: riskAppetite,
    },
    { onConflict: "project_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
