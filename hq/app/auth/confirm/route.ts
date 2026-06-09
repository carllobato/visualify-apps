import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { supabaseSsrCookieProps } from "@/lib/supabase/auth-cookie-options";

function authErrorRedirect(request: NextRequest, message: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

const CONFIRM_TYPES = new Set(["signup", "email", "invite", "magiclink", "recovery", "email_change"]);

/** Email confirmation landing for HQ sign-up (Supabase `verifyOtp`). */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  if (!tokenHash?.trim() || !type?.trim()) {
    return authErrorRedirect(request, "missing_confirmation_token");
  }

  if (!CONFIRM_TYPES.has(type)) {
    return authErrorRedirect(request, "invalid_confirmation_type");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    ...supabaseSsrCookieProps(),
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

  const { error } = await supabase.auth.verifyOtp({
    type: type as "signup" | "email" | "invite" | "magiclink" | "recovery" | "email_change",
    token_hash: tokenHash,
  });

  if (error) {
    return authErrorRedirect(request, error.message);
  }

  const confirmType = type.trim();
  const invitedEmailParam = url.searchParams.get("invited_email")?.trim() ?? "";
  let inviteToken = url.searchParams.get("invite_token")?.trim() ?? "";

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  if (!inviteToken || confirmType === "signup") {
    const {
      data: { user: verifiedUser },
    } = await supabase.auth.getUser();
    user = verifiedUser;
  }

  if (!inviteToken && user) {
    const metaToken = user.user_metadata?.hq_invite_token;
    if (typeof metaToken === "string" && metaToken.trim()) {
      inviteToken = metaToken.trim();
    }
  }

  if (inviteToken) {
    const inviteUrl = new URL("/invite", request.url);
    inviteUrl.searchParams.set("invite_token", inviteToken);
    if (invitedEmailParam) {
      inviteUrl.searchParams.set("invited_email", invitedEmailParam);
    }
    return NextResponse.redirect(inviteUrl);
  }

  if (confirmType === "signup") {
    const metaInviteKeyPresent =
      user?.user_metadata != null &&
      typeof user.user_metadata === "object" &&
      "hq_invite_token" in user.user_metadata;
    const inviteRelated =
      url.searchParams.has("invite_token") ||
      Boolean(invitedEmailParam) ||
      metaInviteKeyPresent;

    if (inviteRelated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("mode", "signup");
      loginUrl.searchParams.set("invite_error", "invite_token_required");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
