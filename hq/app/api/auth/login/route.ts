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

  if (!email || !password) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Enter your email and password.");
    return NextResponse.redirect(loginUrl, 303);
  }

  const success = NextResponse.redirect(new URL("/dashboard", request.url), 303);

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
    return NextResponse.redirect(loginUrl, 303);
  }

  await supabase.auth.getUser();
  await awaitSupabaseCookieSync();

  return success;
}
