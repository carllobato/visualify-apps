import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Clears Supabase session cookies on the server so SSR matches the signed-out client.
 */
export async function POST() {
  const supabase = await supabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
