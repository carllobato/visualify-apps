import {
  normalizeWorkspaceRole,
  workspaceRoleRank,
  type WorkspaceRole,
} from "@visualify/workspace-product-access";
import type { SupabaseClient } from "@supabase/supabase-js";

function isActiveWorkspaceMemberStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.trim().toLowerCase() === "active";
}

export type WorkspaceMemberListItem = {
  userId: string;
  name: string;
  email: string | null;
  role: WorkspaceRole;
  roleLabel: string;
};

export type WorkspaceMemberRawRow = {
  user_id?: unknown;
  workspace_id?: unknown;
  role?: unknown;
  status?: unknown;
};

export type WorkspaceMemberProfileRow = {
  id?: unknown;
  first_name?: unknown;
  surname?: unknown;
  email?: unknown;
};

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function workspaceMemberRoleLabel(role: WorkspaceRole): string {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

function displayNameFromProfile(
  firstName: string,
  surname: string,
  email: string | null,
): string {
  const full = `${firstName} ${surname}`.trim();
  if (full) return full;
  if (email) return email;
  return "Member";
}

function profileMapFromRows(
  rows: readonly WorkspaceMemberProfileRow[] | null | undefined,
): Map<string, { firstName: string; surname: string; email: string | null }> {
  const map = new Map<string, { firstName: string; surname: string; email: string | null }>();
  for (const row of rows ?? []) {
    const id = trimString(row.id);
    if (!id) continue;
    const emailRaw = trimString(row.email);
    map.set(id, {
      firstName: trimString(row.first_name),
      surname: trimString(row.surname),
      email: emailRaw || null,
    });
  }
  return map;
}

/**
 * Shapes active members of one Workspace for the Settings Members list.
 * Drops inactive rows, unknown roles, and rows that are not in `workspaceId`.
 */
export function shapeActiveWorkspaceMemberList(args: {
  workspaceId: string;
  memberRows: readonly WorkspaceMemberRawRow[] | null | undefined;
  profiles: readonly WorkspaceMemberProfileRow[] | null | undefined;
}): WorkspaceMemberListItem[] {
  const workspaceId = args.workspaceId.trim();
  if (!workspaceId) return [];

  const profiles = profileMapFromRows(args.profiles);
  const items: WorkspaceMemberListItem[] = [];

  for (const row of args.memberRows ?? []) {
    const rowWorkspaceId = trimString(row.workspace_id);
    if (rowWorkspaceId && rowWorkspaceId !== workspaceId) continue;

    const userId = trimString(row.user_id);
    if (!userId) continue;
    if (!isActiveWorkspaceMemberStatus(trimString(row.status) || null)) continue;

    const role = normalizeWorkspaceRole(trimString(row.role) || null);
    if (!role) continue;

    const profile = profiles.get(userId);
    const email = profile?.email ?? null;
    items.push({
      userId,
      name: displayNameFromProfile(profile?.firstName ?? "", profile?.surname ?? "", email),
      email,
      role,
      roleLabel: workspaceMemberRoleLabel(role),
    });
  }

  items.sort((a, b) => {
    const rankDiff = workspaceRoleRank(a.role) - workspaceRoleRank(b.role);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return items;
}

export type ListActiveWorkspaceMembersResult =
  | { ok: true; members: WorkspaceMemberListItem[] }
  | { ok: false; error: string };

/**
 * Active members of `workspaceId` (name, email, Workspace role).
 * Uses the session client so RLS limits rows to the caller's Workspace.
 */
export async function listActiveWorkspaceMembers(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<ListActiveWorkspaceMembersResult> {
  const wid = workspaceId.trim();
  if (!wid) {
    return { ok: false, error: "Workspace ID required" };
  }

  const { data: memberRows, error: memberErr } = await supabase
    .from("visualify_workspace_members")
    .select("user_id, workspace_id, role, status")
    .eq("workspace_id", wid);

  if (memberErr) {
    console.error("[listActiveWorkspaceMembers] members:", memberErr.message);
    return { ok: false, error: "Could not load members." };
  }

  const userIds = [
    ...new Set(
      (memberRows ?? [])
        .map((row) => trimString((row as WorkspaceMemberRawRow).user_id))
        .filter(Boolean),
    ),
  ];

  let profiles: WorkspaceMemberProfileRow[] = [];
  if (userIds.length > 0) {
    const { data: profileRows, error: profileErr } = await supabase
      .from("visualify_profiles")
      .select("id, first_name, surname, email")
      .in("id", userIds);

    if (profileErr) {
      console.error("[listActiveWorkspaceMembers] profiles:", profileErr.message);
      return { ok: false, error: "Could not load members." };
    }
    profiles = (profileRows ?? []) as WorkspaceMemberProfileRow[];
  }

  return {
    ok: true,
    members: shapeActiveWorkspaceMemberList({
      workspaceId: wid,
      memberRows: (memberRows ?? []) as WorkspaceMemberRawRow[],
      profiles,
    }),
  };
}
