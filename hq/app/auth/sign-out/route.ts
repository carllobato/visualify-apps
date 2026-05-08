import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Clears the Supabase session cookies on the server so server-rendered routes
 * see a logged-out user after sign-out from the dashboard.
 */
export async function POST() {
  const supabase = await supabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
