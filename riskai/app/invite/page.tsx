import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Appends `invite_accepted=1`, preserving any existing query on `path`. */
function withInviteAcceptedQuery(path: string): string {
  const u = new URL(path, "http://localhost");
  u.searchParams.set("invite_accepted", "1");
  return `${u.pathname}${u.search}`;
}

type AcceptJson = {
  ok?: boolean;
  error?: string;
  resource_type?: string;
  portfolio_id?: string;
  project_id?: string;
};

async function acceptInvitationUrl(inviteToken: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const forwardedProto = h.get("x-forwarded-proto");
  const proto =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const base =
    host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ?? "http://localhost:3000");
  const u = new URL("/api/invitations/accept", base.endsWith("/") ? base.slice(0, -1) : base);
  u.searchParams.set("invite_token", inviteToken);
  return u.toString();
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const inviteToken = getParam(params, "invite_token").trim();
  const invitedEmail = getParam(params, "invited_email").trim();
  const mode = getParam(params, "mode");

  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!inviteToken) {
      redirect("/login?mode=signup");
    }
    const sp = new URLSearchParams();
    sp.set("mode", mode || "signup");
    sp.set("invite_token", inviteToken);
    if (invitedEmail) {
      sp.set("invited_email", invitedEmail);
    }
    redirect(`/login?${sp.toString()}`);
  }

  if (!inviteToken) {
    redirect(DASHBOARD_PATH);
  }

  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const res = await fetch(await acceptInvitationUrl(inviteToken), {
    method: "GET",
    ...(cookie ? { headers: { cookie } } : {}),
    cache: "no-store",
  });

  let data: AcceptJson = {};
  try {
    data = (await res.json()) as AcceptJson;
  } catch {
    redirect(DASHBOARD_PATH);
  }

  if (res.ok && data.ok) {
    if (data.resource_type === "portfolio" && data.portfolio_id) {
      redirect(withInviteAcceptedQuery(riskaiPath(`/portfolios/${data.portfolio_id}`)));
    }
    if (data.resource_type === "project" && data.project_id) {
      redirect(withInviteAcceptedQuery(riskaiPath(`/projects/${data.project_id}`)));
    }
    redirect(DASHBOARD_PATH);
  }

  if (
    (res.status === 403 && data.error === "EMAIL_MISMATCH") ||
    (res.status === 409 && data.error === "CONFLICT")
  ) {
    redirect(
      `/login?mode=signup&invite_token=${encodeURIComponent(inviteToken)}&invite_conflict=1`
    );
  }

  redirect(DASHBOARD_PATH);
}
