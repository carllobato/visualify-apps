"use server";

import { redirect } from "next/navigation";
import { awaitSupabaseCookieSync } from "@/lib/supabase/await-supabase-cookie-sync";
import { supabaseServerClient } from "@/lib/supabase/server";

export type LoginFormState = { error: string } | null;

/**
 * Password sign-in on the server so Supabase session cookies are written via
 * Next.js `cookies()` (same path as RSC auth reads). Avoids client-side cookie
 * timing and scoped-domain quirks with `document.cookie`.
 */
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await supabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  await supabase.auth.getSession();
  await awaitSupabaseCookieSync();

  redirect("/dashboard");
}
