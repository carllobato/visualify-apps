import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { assertPortfolioAdminAccess } from "@/lib/portfolios-server";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REPORTING_CURRENCIES = new Set(["AUD", "USD", "GBP"]);
const REPORTING_UNITS = new Set(["THOUSANDS", "MILLIONS", "BILLIONS"]);

/**
 * GET /api/portfolios/[portfolioId] — Portfolio row if the user may access settings (member or table owner).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ portfolioId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { portfolioId } = await context.params;
  if (!portfolioId) {
    return NextResponse.json({ error: "Portfolio ID required" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const result = await assertPortfolioAdminAccess(portfolioId, supabase, user.id);

  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ...result.portfolio,
    canEditPortfolioDetails: result.canEditPortfolioDetails,
  });
}

/**
 * PATCH /api/portfolios/[portfolioId] — Update name/description. Owner-level only (not editors/viewers).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ portfolioId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { portfolioId } = await context.params;
  if (!portfolioId) {
    return NextResponse.json({ error: "Portfolio ID required" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const result = await assertPortfolioAdminAccess(portfolioId, supabase, user.id);

  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!result.canEditPortfolioDetails) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const description =
    body?.description === null || typeof body?.description === "string"
      ? (body.description === null ? null : String(body.description).trim() || null)
      : undefined;

  let reporting_currency: string | null | undefined;
  if ("reporting_currency" in body) {
    const v = body.reporting_currency;
    if (v === null) {
      reporting_currency = null;
    } else if (typeof v === "string") {
      const t = v.trim();
      if (!REPORTING_CURRENCIES.has(t)) {
        return NextResponse.json({ error: "Invalid reporting_currency" }, { status: 400 });
      }
      reporting_currency = t;
    } else {
      return NextResponse.json({ error: "Invalid reporting_currency" }, { status: 400 });
    }
  }

  let reporting_unit: string | null | undefined;
  if ("reporting_unit" in body) {
    const v = body.reporting_unit;
    if (v === null) {
      reporting_unit = null;
    } else if (typeof v === "string") {
      const t = v.trim();
      if (!REPORTING_UNITS.has(t)) {
        return NextResponse.json({ error: "Invalid reporting_unit" }, { status: 400 });
      }
      reporting_unit = t;
    } else {
      return NextResponse.json({ error: "Invalid reporting_unit" }, { status: 400 });
    }
  }

  if (
    name === undefined &&
    description === undefined &&
    reporting_currency === undefined &&
    reporting_unit === undefined
  ) {
    return NextResponse.json(
      { error: "Provide at least one of name, description, reporting_currency, or reporting_unit" },
      { status: 400 }
    );
  }

  const updates: {
    name?: string;
    description?: string | null;
    reporting_currency?: string | null;
    reporting_unit?: string | null;
  } = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (reporting_currency !== undefined) updates.reporting_currency = reporting_currency;
  if (reporting_unit !== undefined) updates.reporting_unit = reporting_unit;

  const { error } = await supabase
    .from("visualify_portfolios")
    .update(updates)
    .eq("id", portfolioId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: portfolioId,
    name: name ?? result.portfolio.name,
    description: description !== undefined ? description : result.portfolio.description,
    reporting_currency:
      reporting_currency !== undefined ? reporting_currency : result.portfolio.reporting_currency,
    reporting_unit: reporting_unit !== undefined ? reporting_unit : result.portfolio.reporting_unit,
  });
}
