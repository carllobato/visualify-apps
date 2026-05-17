import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseSsrCookieProps } from "@/lib/supabase/auth-cookie-options";
import { awaitSupabaseCookieSync } from "@/lib/supabase/await-supabase-cookie-sync";

export const dynamic = "force-dynamic";

/**
 * Password login via Route Handler so Supabase can attach `Set-Cookie` to a concrete
 * `NextResponse` (same pattern as Proxy). Server Actions + `redirect()` can finalize
 * before `@supabase/ssr`'s async `onAuthStateChange` → `applyServerStorage` finishes.
 */
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const inviteToken = String(formData.get("invite_token") ?? "").trim();
  const invitedEmail = String(formData.get("invited_email") ?? "").trim();
  const inviteMode = String(formData.get("mode") ?? "").trim();

  if (!email || !password) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Enter your email and password.");
    if (inviteToken) loginUrl.searchParams.set("invite_token", inviteToken);
    if (invitedEmail) loginUrl.searchParams.set("invited_email", invitedEmail);
    if (inviteMode) loginUrl.searchParams.set("mode", inviteMode);
    return NextResponse.redirect(loginUrl, 303);
  }

  const successTarget = new URL(inviteToken ? "/invite" : "/dashboard", request.url);
  if (inviteToken) {
    successTarget.searchParams.set("invite_token", inviteToken);
    if (invitedEmail) successTarget.searchParams.set("invited_email", invitedEmail);
    if (inviteMode) successTarget.searchParams.set("mode", inviteMode);
  }
  const success = NextResponse.redirect(successTarget, 303);

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      ...supabaseSsrCookieProps(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            success.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", error.message);
    if (inviteToken) loginUrl.searchParams.set("invite_token", inviteToken);
    if (invitedEmail) loginUrl.searchParams.set("invited_email", invitedEmail);
    if (inviteMode) loginUrl.searchParams.set("mode", inviteMode);
    return NextResponse.redirect(loginUrl, 303);
  }

  await supabase.auth.getUser();
  await awaitSupabaseCookieSync();

  return success;
}
