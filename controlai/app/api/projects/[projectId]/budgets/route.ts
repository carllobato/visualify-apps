import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { createCostaiBudget, parseOriginalBudget } from "@/lib/cost/cost-budget-server";
import { productConfig } from "@/lib/product-config";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

/**
 * POST /api/projects/[projectId]/budgets — Add a persisted budget line for a project WBS.
 */
export async function POST(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: CACHE_HEADERS });
  }

  const rawWbsId =
    typeof body === "object" && body !== null && "wbsId" in body
      ? (body as { wbsId: unknown }).wbsId
      : undefined;
  const wbsId = typeof rawWbsId === "string" ? rawWbsId.trim() : "";
  if (!wbsId) {
    return NextResponse.json(
      { error: "Select a WBS row by code or description." },
      { status: 400, headers: CACHE_HEADERS },
    );
  }

  const rawAmount =
    typeof body === "object" && body !== null && "originalBudget" in body
      ? (body as { originalBudget: unknown }).originalBudget
      : undefined;
  const originalBudget = parseOriginalBudget(rawAmount);
  if (originalBudget === null) {
    return NextResponse.json(
      { error: "Enter a valid budget amount." },
      { status: 400, headers: CACHE_HEADERS },
    );
  }

  const rawNotes =
    typeof body === "object" && body !== null && "notes" in body
      ? (body as { notes: unknown }).notes
      : undefined;
  const notes = typeof rawNotes === "string" ? rawNotes : "";

  const result = await createCostaiBudget(trimmedProjectId, {
    wbsId,
    originalBudget,
    notes,
  });

  if (!result.ok) {
    const status =
      result.duplicateWbs || result.hierarchyConflict
        ? 409
        : result.error === "You do not have access to this project."
          ? 403
          : 400;
    return NextResponse.json(
      {
        error: result.error,
        duplicateWbs: result.duplicateWbs ?? false,
        hierarchyConflict: result.hierarchyConflict ?? false,
      },
      { status, headers: CACHE_HEADERS },
    );
  }

  return NextResponse.json({ budget: result.row }, { status: 201, headers: CACHE_HEADERS });
}
