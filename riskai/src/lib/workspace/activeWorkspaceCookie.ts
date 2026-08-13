import "server-only";

import { cookies } from "next/headers";
import { getSupabaseAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";

/** Same cookie name as HQ — product apps persist workspace context with this key. */
export const VISUALIFY_ACTIVE_WORKSPACE_COOKIE = "visualify_active_workspace_id";

type ActiveWorkspaceCookieOptions = {
  path: string;
  sameSite: "lax";
  secure: boolean;
  httpOnly: true;
  domain?: string;
};

function activeWorkspaceCookieOptions(): ActiveWorkspaceCookieOptions {
  const base: ActiveWorkspaceCookieOptions = {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };

  const authOpts = getSupabaseAuthCookieOptions();
  if (authOpts?.domain) {
    return { ...base, domain: authOpts.domain };
  }

  return base;
}

export async function readVisualifyActiveWorkspaceIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(VISUALIFY_ACTIVE_WORKSPACE_COOKIE)?.value?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export async function writeVisualifyActiveWorkspaceIdCookie(workspaceId: string): Promise<void> {
  const id = workspaceId.trim();
  if (!id) return;
  const store = await cookies();
  store.set(VISUALIFY_ACTIVE_WORKSPACE_COOKIE, id, activeWorkspaceCookieOptions());
}

export async function clearVisualifyActiveWorkspaceIdCookieIfMatches(workspaceId: string): Promise<void> {
  const id = workspaceId.trim();
  if (!id) return;
  const store = await cookies();
  const current = store.get(VISUALIFY_ACTIVE_WORKSPACE_COOKIE)?.value?.trim();
  if (current === id) {
    store.delete(VISUALIFY_ACTIVE_WORKSPACE_COOKIE);
  }
}
