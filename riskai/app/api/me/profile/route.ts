import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { USER_PROFILE_TABLE } from "@/lib/profiles/profileDb";
import { OnboardingMetaKey } from "@/lib/onboarding/types";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RISKAI_MASTER_DEMO_TEMPLATE_KEY = "riskai_master_demo";

function logDemoWorkspaceCloneError(context: string, detail?: unknown): void {
  const extra =
    detail instanceof Error
      ? detail.message
      : typeof detail === "object" &&
          detail !== null &&
          "message" in detail &&
          typeof (detail as { message: unknown }).message === "string"
        ? (detail as { message: string }).message
        : detail !== undefined
          ? String(detail)
          : "";
  console.error(
    `[me/profile] Demo workspace clone failed: ${context}${extra ? ` — ${extra}` : ""}`,
  );
}

/**
 * Clones the system-owned master demo portfolio + template projects into `userId`'s account
 * using the service-role client. On partial failure after portfolio insert, deletes the new portfolio.
 */
async function cloneRiskAiDemoWorkspaceFromMaster(params: {
  admin: ReturnType<typeof supabaseAdminClient>;
  userId: string;
}): Promise<void> {
  const { admin, userId } = params;

  const { data: templatePortfolio, error: templatePortfolioErr } = await admin
    .from("visualify_portfolios")
    .select("id, name, product_id")
    .eq("template_key", RISKAI_MASTER_DEMO_TEMPLATE_KEY)
    .eq("is_demo_template", true)
    .limit(1)
    .maybeSingle();

  if (templatePortfolioErr) {
    logDemoWorkspaceCloneError("load template portfolio", templatePortfolioErr);
    return;
  }

  if (!templatePortfolio?.id) {
    logDemoWorkspaceCloneError("master template portfolio not found");
    return;
  }

  const template = templatePortfolio as {
    id: string;
    name: string;
    product_id: string | null;
  };

  const { data: templateProjects, error: templateProjectsErr } = await admin
    .from("visualify_projects")
    .select("name")
    .eq("portfolio_id", template.id)
    .eq("is_demo_template", true);

  if (templateProjectsErr) {
    logDemoWorkspaceCloneError("load template projects", templateProjectsErr);
    return;
  }

  const { data: newPortfolio, error: insertPortfolioErr } = await admin
    .from("visualify_portfolios")
    .insert({
      name: template.name,
      owner_user_id: userId,
      product_id: template.product_id,
      is_demo_template: false,
      template_key: null,
    })
    .select("id")
    .single();

  if (insertPortfolioErr || !newPortfolio?.id) {
    logDemoWorkspaceCloneError("insert cloned portfolio", insertPortfolioErr ?? "missing id");
    return;
  }

  const newPortfolioId = newPortfolio.id as string;
  const projectRows = (templateProjects ?? []) as { name: string }[];

  if (projectRows.length > 0) {
    const { error: insertProjectsErr } = await admin.from("visualify_projects").insert(
      projectRows.map((p) => ({
        name: p.name,
        owner_user_id: userId,
        portfolio_id: newPortfolioId,
        is_demo_template: false,
      })),
    );

    if (insertProjectsErr) {
      logDemoWorkspaceCloneError("insert cloned projects", insertProjectsErr);
      await admin.from("visualify_portfolios").delete().eq("id", newPortfolioId);
      return;
    }
  }

  const { error: markerErr } = await admin
    .from(USER_PROFILE_TABLE)
    .update({ demo_workspace_seeded_at: new Date().toISOString() })
    .eq("id", userId);

  if (markerErr) {
    logDemoWorkspaceCloneError("update demo_workspace_seeded_at", markerErr);
  }
}

/**
 * POST /api/me/profile — Upsert the signed-in user’s row in `public.visualify_profiles` (cookie session).
 * Uses the server Supabase client so RLS sees the same JWT as other API routes.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const first_name = typeof o.first_name === "string" ? o.first_name.trim() : "";
  const last_name = typeof o.last_name === "string" ? o.last_name.trim() : "";
  const company = typeof o.company === "string" ? o.company.trim() : "";
  const roleRaw = typeof o.role === "string" ? o.role.trim() : "";
  const role = roleRaw.length > 0 ? roleRaw : null;

  if (!first_name || !last_name || !company) {
    return NextResponse.json(
      { error: "First name, surname, and company are required." },
      { status: 400 },
    );
  }

  const supabase = await supabaseServerClient();
  const { error: upErr } = await supabase.from(USER_PROFILE_TABLE).upsert(
    {
      id: user.id,
      first_name,
      surname: last_name,
      email: user.email ?? null,
      company,
    },
    { onConflict: "id" },
  );

  if (upErr) {
    return NextResponse.json(
      { error: upErr.message, details: upErr.details, hint: upErr.hint, code: upErr.code },
      { status: 500 },
    );
  }

  // =========================================================================
  // Demo workspace (one-time seed) — clone master template portfolio + projects.
  // Requires DB column: public.visualify_profiles.demo_workspace_seeded_at
  // (if missing, the profile read errors and we skip seeding without failing the request).
  // =========================================================================
  let shouldSeedDemo = false;
  {
    type ProfileDemoMarkerRow = { demo_workspace_seeded_at: string | null };

    const { data: profileRow, error: profileReadErr } = await supabase
      .from(USER_PROFILE_TABLE)
      .select("demo_workspace_seeded_at")
      .eq("id", user.id)
      .maybeSingle();

    const { count: ownedPortfolioCount, error: ownedPortfolioCountErr } = await supabase
      .from("visualify_portfolios")
      .select("*", { count: "exact", head: true })
      .eq("owner_user_id", user.id);

    if (!profileReadErr && !ownedPortfolioCountErr && profileRow) {
      const marker = profileRow as ProfileDemoMarkerRow;
      const demoWorkspaceSeededAt = marker.demo_workspace_seeded_at;
      const ownedCount = ownedPortfolioCount ?? 0;
      shouldSeedDemo = demoWorkspaceSeededAt == null && ownedCount === 0;
    }

    if (shouldSeedDemo) {
      try {
        const admin = supabaseAdminClient();
        await cloneRiskAiDemoWorkspaceFromMaster({ admin, userId: user.id });
      } catch (e) {
        logDemoWorkspaceCloneError("admin client or unexpected error", e);
      }
    }
  }
  // =========================================================================

  const { error: metaErr } = await supabase.auth.updateUser({
    data: {
      [OnboardingMetaKey.profileComplete]: true,
      [OnboardingMetaKey.role]: role,
    },
  });

  if (metaErr) {
    return NextResponse.json({ error: metaErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
