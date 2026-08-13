import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getCreatableRiskAiWorkspaces } from "@/lib/workspace/creatableWorkspaces";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

/**
 * GET /api/workspaces/creatable — Workspaces where the user may create a RiskAI portfolio
 * or unscoped project (active membership, owner/admin, RiskAI entitlement).
 */
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const supabase = await supabaseServerClient();
  const workspaces = await getCreatableRiskAiWorkspaces(supabase, user.id);

  return NextResponse.json({ workspaces }, { headers: CACHE_HEADERS });
}
