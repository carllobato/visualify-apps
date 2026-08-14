import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabase/server";
import { clearVisualifyActiveWorkspaceIdCookie } from "@/lib/workspace/activeWorkspaceCookie";

export const dynamic = "force-dynamic";

/**
 * Clears Supabase session cookies on the server so SSR matches the signed-out client,
 * and clears `visualify_active_workspace_id` so the next login does not inherit workspace context.
 */
export async function POST() {
  const supabase = await supabaseServerClient();
  await supabase.auth.signOut();
  await clearVisualifyActiveWorkspaceIdCookie();
  return NextResponse.json({ ok: true });
}
