"use server";

import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  fetchVisibleWorkspacesForRail,
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

  const visible = await fetchVisibleWorkspacesForRail(user.id);
  if (!visible.some((w) => w.id === id)) return { ok: false, reason: "forbidden" };

  await writeVisualifyActiveWorkspaceIdCookie(id);

  return { ok: true };
}
