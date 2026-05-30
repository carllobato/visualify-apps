import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { CONTROLAI_DEFAULT_ROUTE } from "@/lib/controlai-routes";
import { supabaseSsrCookieProps } from "@/lib/supabase/auth-cookie-options";

function authErrorRedirect(request: NextRequest, message: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

const CONFIRM_TYPES = new Set(["signup", "email", "invite", "magiclink", "recovery", "email_change"]);

/** Email confirmation landing for ControlAI sign-up (Supabase `verifyOtp`). */
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

  return NextResponse.redirect(new URL(CONTROLAI_DEFAULT_ROUTE, request.url));
}
