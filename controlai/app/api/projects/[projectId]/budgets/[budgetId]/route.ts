import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { parseOriginalBudget, updateCostaiBudget } from "@/lib/cost/cost-budget-server";
import { productConfig } from "@/lib/product-config";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

/**
 * PATCH /api/projects/[projectId]/budgets/[budgetId] — Update budget amount and notes.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; budgetId: string }> },
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CACHE_HEADERS });
  }

  const { projectId, budgetId } = await context.params;
  const trimmedProjectId = projectId.trim();
  const trimmedBudgetId = budgetId.trim();

  if (!trimmedProjectId) {
    return NextResponse.json({ error: "Invalid project." }, { status: 400, headers: CACHE_HEADERS });
  }

  if (!trimmedBudgetId) {
    return NextResponse.json({ error: "Invalid budget row." }, { status: 400, headers: CACHE_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: CACHE_HEADERS });
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

  const result = await updateCostaiBudget(trimmedProjectId, trimmedBudgetId, {
    originalBudget,
    notes,
  });

  if (!result.ok) {
    const status = result.notFound
      ? 404
      : result.error === "You do not have access to this project."
        ? 403
        : 400;
    return NextResponse.json({ error: result.error }, { status, headers: CACHE_HEADERS });
  }

  return NextResponse.json({ budget: result.row }, { status: 200, headers: CACHE_HEADERS });
}
