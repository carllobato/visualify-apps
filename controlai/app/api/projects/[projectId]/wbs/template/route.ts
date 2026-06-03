import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { seedCostaiWbsTemplate } from "@/lib/cost/cost-budget-server";
import { productConfig } from "@/lib/product-config";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

/**
 * POST /api/projects/[projectId]/wbs/template — Seed approved WBS rows missing for this project.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CACHE_HEADERS });
  }

  const { projectId } = await context.params;
  const trimmedProjectId = projectId.trim();
  if (!trimmedProjectId) {
    return NextResponse.json({ error: "Invalid project." }, { status: 400, headers: CACHE_HEADERS });
  }

  const result = await seedCostaiWbsTemplate(trimmedProjectId);

  if (!result.ok) {
    const status =
      result.error === "You do not have access to this project." ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status, headers: CACHE_HEADERS });
  }

  return NextResponse.json(
    { inserted: result.inserted, skipped: result.skipped },
    { status: 200, headers: CACHE_HEADERS },
  );
}
