import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/account/sign-out-everywhere — Delete the authenticated user's
 * row(s) from `public.visualify_user_sessions`, effectively invalidating
 * all active single-session guards across devices.
 */
export async function POST() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const supabase = await supabaseServerClient();

  const { error } = await supabase
    .from("visualify_user_sessions")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to sign out everywhere." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
