"use server";

import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  fetchManageableWorkspacesForRail,
  writeVisualifyActiveWorkspaceIdCookie,
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

  await writeVisualifyActiveWorkspaceIdCookie(id);

  return { ok: true };
}
