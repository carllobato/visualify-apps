import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getLoginPathForHost } from "@/lib/host";
import { env } from "@/lib/env";
import { DASHBOARD_PATH } from "@/lib/routes";

function authErrorRedirect(request: NextRequest, message: string): NextResponse {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const base = getLoginPathForHost(host);
  const url = new URL(request.url);
  url.pathname = base;
  url.search = `?error=${encodeURIComponent(message)}`;
  url.hash = "";
  return NextResponse.redirect(url);
}

function destinationBase(request: NextRequest): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  return !isLocal && forwardedHost ? `https://${forwardedHost}` : url.origin;
}

function safeNextPath(raw: string | null, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  return raw;
}

function resolveDestination(request: NextRequest, inviteToken: string | null, fallbackPath = "/login?mode=signin"): URL {
  const base = destinationBase(request);
  const t = inviteToken?.trim();
  if (t) {
    const u = new URL("/invite", base);
    u.searchParams.set("invite_token", t);
    return u;
  }
  return new URL(fallbackPath, base);
}

const CONFIRM_TYPES = new Set(["signup", "email", "invite", "magiclink", "recovery", "email_change"]);

/**
 * Your-domain first: the signup email links here; we call Supabase `verifyOtp` so confirmation still runs on Auth.
 *
 * Email href (see `supabase/email-templates/confirm_signup.html`):
 * `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup` plus optional `invite_token` from metadata.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const inviteToken = url.searchParams.get("invite_token");

  const cookieStore = await cookies();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  if (code?.trim()) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return authErrorRedirect(request, error.message);
    }

    const next = safeNextPath(url.searchParams.get("next"), DASHBOARD_PATH);
    return NextResponse.redirect(resolveDestination(request, inviteToken, next));
  }

  if (!tokenHash?.trim() || !type?.trim()) {
    return authErrorRedirect(request, "missing_confirmation_token");
  }

  if (!CONFIRM_TYPES.has(type)) {
    return authErrorRedirect(request, "invalid_confirmation_type");
  }

  const { error } = await supabase.auth.verifyOtp({
    type: type as "signup" | "email" | "invite" | "magiclink" | "recovery" | "email_change",
    token_hash: tokenHash,
  });

  if (error) {
    return authErrorRedirect(request, error.message);
  }

  return NextResponse.redirect(resolveDestination(request, inviteToken));
}
