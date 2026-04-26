import "server-only";

import { USER_PROFILE_TABLE } from "@/lib/profiles/profileDb";
import { supabaseAdminClient } from "@/lib/supabase/admin";

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
    `[riskai-demo-seed] Demo workspace clone failed: ${context}${extra ? ` — ${extra}` : ""}`,
  );
}

async function ensureMinimalProfileRow(params: {
  admin: ReturnType<typeof supabaseAdminClient>;
  userId: string;
  email?: string | null;
}): Promise<boolean> {
  const { admin, userId, email } = params;
  const normalizedEmail = email?.trim() || null;

  const { data: profileRow, error: profileReadErr } = await admin
    .from(USER_PROFILE_TABLE)
    .select("id,email")
    .eq("id", userId)
    .maybeSingle();

  if (profileReadErr) {
    logDemoWorkspaceCloneError("load profile row", profileReadErr);
    return false;
  }

  if (!profileRow) {
    const { error: insertErr } = await admin.from(USER_PROFILE_TABLE).insert({
      id: userId,
      email: normalizedEmail,
    });
    if (insertErr) {
      logDemoWorkspaceCloneError("insert minimal profile row", insertErr);
      return false;
    }
    return true;
  }

  const currentEmail =
    typeof (profileRow as { email?: unknown }).email === "string"
      ? (profileRow as { email: string }).email.trim()
      : "";
  if (!currentEmail && normalizedEmail) {
    const { error: updateErr } = await admin
      .from(USER_PROFILE_TABLE)
      .update({ email: normalizedEmail })
      .eq("id", userId);
    if (updateErr) {
      logDemoWorkspaceCloneError("update profile email", updateErr);
      return false;
    }
  }

  return true;
}

/**
 * Clones the system-owned master demo portfolio + template projects into `userId`'s account.
 * On partial failure after portfolio insert, deletes the new portfolio.
 */
async function cloneRiskAiDemoWorkspaceFromMaster(params: {
  admin: ReturnType<typeof supabaseAdminClient>;
  userId: string;
}): Promise<boolean> {
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
    return false;
  }

  if (!templatePortfolio?.id) {
    logDemoWorkspaceCloneError("master template portfolio not found");
    return false;
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
    return false;
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
    return false;
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
      return false;
    }
  }

  return true;
}

export async function ensureRiskAiDemoWorkspaceSeeded(
  userId: string,
  email?: string | null,
): Promise<void> {
  if (!userId.trim()) return;

  try {
    const admin = supabaseAdminClient();
    const profileReady = await ensureMinimalProfileRow({ admin, userId, email });
    if (!profileReady) return;

    type ProfileDemoMarkerRow = { demo_workspace_seeded_at: string | null };

    const { data: profileRow, error: profileReadErr } = await admin
      .from(USER_PROFILE_TABLE)
      .select("demo_workspace_seeded_at")
      .eq("id", userId)
      .maybeSingle();

    const { count: ownedPortfolioCount, error: ownedPortfolioCountErr } = await admin
      .from("visualify_portfolios")
      .select("*", { count: "exact", head: true })
      .eq("owner_user_id", userId);

    if (profileReadErr) {
      logDemoWorkspaceCloneError("load demo_workspace_seeded_at", profileReadErr);
      return;
    }

    if (ownedPortfolioCountErr) {
      logDemoWorkspaceCloneError("count owned portfolios", ownedPortfolioCountErr);
      return;
    }

    if (!profileRow) return;

    const marker = profileRow as ProfileDemoMarkerRow;
    const ownedCount = ownedPortfolioCount ?? 0;
    const shouldSeedDemo = marker.demo_workspace_seeded_at == null && ownedCount === 0;
    if (!shouldSeedDemo) return;

    const cloned = await cloneRiskAiDemoWorkspaceFromMaster({ admin, userId });
    if (!cloned) return;

    const { error: markerErr } = await admin
      .from(USER_PROFILE_TABLE)
      .update({ demo_workspace_seeded_at: new Date().toISOString() })
      .eq("id", userId);

    if (markerErr) {
      logDemoWorkspaceCloneError("update demo_workspace_seeded_at", markerErr);
    }
  } catch (e) {
    logDemoWorkspaceCloneError("admin client or unexpected error", e);
  }
}
