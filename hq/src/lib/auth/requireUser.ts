import { NextResponse } from "next/server";
import {
  AUTH_DISABLED_DEV_EMAIL,
  AUTH_DISABLED_DEV_USER_ID,
  isAuthDisabled,
} from "@/lib/auth/auth-disabled";
import { supabaseServerClient } from "@/lib/supabase/server";

/**
 * Require an authenticated Supabase user for API routes.
 * Returns the user if authenticated, or a 401 NextResponse if not.
 */
export async function requireUser(): Promise<
  { id: string; email?: string } | NextResponse
> {
  if (isAuthDisabled()) {
    return { id: AUTH_DISABLED_DEV_USER_ID, email: AUTH_DISABLED_DEV_EMAIL };
  }

  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return user;
}
