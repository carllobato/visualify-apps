import "server-only";

import { supabaseServerClient } from "@/lib/supabase/server";
import {
  fetchManageableWorkspacesForRail,
  readVisualifyActiveWorkspaceIdFromCookie,
} from "@/lib/workspace-settings-data";

export type ScopeUserRow = {
  userId: string;
  displayName: string | null;
  email: string | null;
  memberRole: string | null;
  membershipStatus: string | null;
  joinedAt: string | null;
};

export type ScopeUsersPageData =
  | { state: "no_scope_access"; members: [] }
  | { state: "ok"; members: ScopeUserRow[] };

type ProfileEmbed = {
  first_name: string | null;
  surname: string | null;
  email: string | null;
};

type MemberWithProfile = {
  user_id: string;
  role: string | null;
  status: string | null;
  created_at: string | null;
  visualify_profiles: ProfileEmbed | ProfileEmbed[] | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function displayNameFromProfile(p: ProfileEmbed | null): string | null {
  if (!p) return null;
  const a = p.first_name?.trim() ?? "";
  const b = p.surname?.trim() ?? "";
  const full = `${a} ${b}`.trim();
  return full.length > 0 ? full : null;
}

export async function fetchScopeUsersPageData(userId: string): Promise<ScopeUsersPageData> {
  const cookieWid = await readVisualifyActiveWorkspaceIdFromCookie();
  const manageable = await fetchManageableWorkspacesForRail(userId);
  const workspaceId =
    cookieWid && manageable.some((w) => w.id === cookieWid) ? cookieWid : null;
  if (!workspaceId) return { state: "no_scope_access", members: [] };

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_workspace_members")
    .select(
      `
      user_id,
      role,
      status,
      created_at,
      visualify_profiles ( first_name, surname, email )
    `
    )
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("fetchScopeUsersPageData:", error.message);
    return { state: "no_scope_access", members: [] };
  }

  const rows = (data ?? []) as MemberWithProfile[];
  const members: ScopeUserRow[] = rows.map((r) => {
    const prof = asOne(r.visualify_profiles);
    return {
      userId: r.user_id,
      displayName: displayNameFromProfile(prof),
      email: prof?.email?.trim() || null,
      memberRole: r.role,
      membershipStatus: r.status,
      joinedAt: r.created_at,
    };
  });

  return { state: "ok", members };
}
