"use server";

import { cookies } from "next/headers";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  VISUALIFY_ACTIVE_WORKSPACE_COOKIE,
  fetchManageableWorkspacesForRail,
} from "@/lib/workspace-settings-data";

export type SetWorkspaceCookieResult = { ok: true } | { ok: false; reason: "forbidden" | "invalid" };

export async function setVisualifyActiveWorkspaceIdAction(
  workspaceId: string
): Promise<SetWorkspaceCookieResult> {
  const id = workspaceId.trim();
  if (!id) return { ok: false, reason: "invalid" };

  const user = await resolveAuthenticatedUser();
  if (!user) return { ok: false, reason: "forbidden" };

  const manageable = await fetchManageableWorkspacesForRail(user.id);
  if (!manageable.some((w) => w.id === id)) return { ok: false, reason: "forbidden" };

  const store = await cookies();
  store.set(VISUALIFY_ACTIVE_WORKSPACE_COOKIE, id, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  return { ok: true };
}
