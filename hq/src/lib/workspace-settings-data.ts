import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseServerClient } from "@/lib/supabase/server";

export const VISUALIFY_ACTIVE_WORKSPACE_COOKIE = "visualify_active_workspace_id";

export type ManageableWorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  workspace_type: string;
  workspaceStatus: string | null;
  memberRole: string;
  membershipStatus: string | null;
};

function isActiveStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.trim().toLowerCase() === "active";
}

function isAdminRole(role: string | null | undefined): boolean {
  if (role == null || role === "") return false;
  const r = role.trim().toLowerCase();
  return r === "owner" || r === "admin";
}

type MemberRow = {
  workspace_id: string;
  role: string | null;
  status: string | null;
};

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  workspace_type: string | null;
  status: string | null;
  visualify_workspace_products: { id: string }[] | { id: string } | null;
};

function productCount(ws: WorkspaceRow): number {
  const raw = ws.visualify_workspace_products;
  if (raw == null) return 0;
  return Array.isArray(raw) ? raw.length : 1;
}

function normType(t: string | null | undefined): string {
  return (t ?? "").trim().toLowerCase();
}

/**
 * Workspaces the signed-in user may administer in HQ (active membership + workspace,
 * owner/admin role, hide unused personal workspaces with no attached products).
 */
export async function fetchManageableWorkspaceSummariesForUser(
  userId: string
): Promise<ManageableWorkspaceSummary[]> {
  const list = await fetchManageableWorkspacesInternal(userId);
  return list.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    workspace_type: w.workspace_type,
    workspaceStatus: w.workspaceStatus,
    memberRole: w.memberRole,
    membershipStatus: w.membershipStatus,
  }));
}

export type WorkspaceRailEntry = {
  id: string;
  name: string;
  workspace_type: string;
};

async function fetchManageableWorkspacesInternal(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<
  Array<
    ManageableWorkspaceSummary & {
      productCount: number;
    }
  >
> {
  const supabase = supabaseClient ?? (await supabaseServerClient());

  const { data: memberRows, error: memberErr } = await supabase
    .from("visualify_workspace_members")
    .select("workspace_id, role, status")
    .eq("user_id", userId);

  if (memberErr || !memberRows?.length) {
    if (memberErr) console.error("fetchManageableWorkspacesInternal members:", memberErr.message);
    return [];
  }

  const members = memberRows as MemberRow[];
  const workspaceIds = [...new Set(members.map((m) => m.workspace_id).filter(Boolean))];
  if (workspaceIds.length === 0) return [];

  const { data: workspaceRows, error: wsErr } = await supabase
    .from("visualify_workspaces")
    .select(
      `
      id,
      name,
      slug,
      workspace_type,
      status,
      visualify_workspace_products ( id )
    `
    )
    .in("id", workspaceIds);

  if (wsErr || !workspaceRows) {
    if (wsErr) console.error("fetchManageableWorkspacesInternal workspaces:", wsErr.message);
    return [];
  }

  const byId = new Map((workspaceRows as WorkspaceRow[]).map((w) => [w.id, w]));

  const out: Array<
    ManageableWorkspaceSummary & {
      productCount: number;
    }
  > = [];

  for (const m of members) {
    if (!isActiveStatus(m.status)) continue;
    if (!isAdminRole(m.role)) continue;

    const ws = byId.get(m.workspace_id);
    if (!ws || !isActiveStatus(ws.status)) continue;

    const pc = productCount(ws);
    if (normType(ws.workspace_type) === "personal" && pc === 0) continue;

    out.push({
      id: ws.id,
      name: ws.name,
      slug: ws.slug ?? "",
      workspace_type: ws.workspace_type ?? "",
      workspaceStatus: ws.status,
      memberRole: m.role ?? "",
      membershipStatus: m.status,
      productCount: pc,
    });
  }

  const dedup = new Map<string, (typeof out)[0]>();
  for (const row of out) {
    dedup.set(row.id, row);
  }
  return [...dedup.values()];
}

export async function fetchManageableWorkspacesForRail(userId: string): Promise<WorkspaceRailEntry[]> {
  const rows = await fetchManageableWorkspacesInternal(userId);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    workspace_type: r.workspace_type,
  }));
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
  store.set(VISUALIFY_ACTIVE_WORKSPACE_COOKIE, id, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}

export async function resolveSelectedWorkspaceIdForRail(userId: string): Promise<string | null> {
  const cookieId = await readVisualifyActiveWorkspaceIdFromCookie();
  if (!cookieId) return null;
  const manageable = await fetchManageableWorkspacesInternal(userId);
  const ok = manageable.some((w) => w.id === cookieId);
  return ok ? cookieId : null;
}

export async function fetchManageableWorkspaceById(
  userId: string,
  workspaceId: string,
  supabaseClient?: SupabaseClient,
): Promise<ManageableWorkspaceSummary | null> {
  const rows = await fetchManageableWorkspacesInternal(userId, supabaseClient);
  const hit = rows.find((w) => w.id === workspaceId);
  if (!hit) return null;
  return {
    id: hit.id,
    name: hit.name,
    slug: hit.slug,
    workspace_type: hit.workspace_type,
    workspaceStatus: hit.workspaceStatus,
    memberRole: hit.memberRole,
    membershipStatus: hit.membershipStatus,
  };
}

/**
 * Resolve a manageable workspace from a URL segment (canonical id or workspace slug).
 */
export async function fetchManageableWorkspaceByRouteParam(
  userId: string,
  workspaceIdOrSlug: string
): Promise<ManageableWorkspaceSummary | null> {
  const param = workspaceIdOrSlug.trim();
  if (!param) return null;
  const rows = await fetchManageableWorkspacesInternal(userId);
  const byId = rows.find((w) => w.id === param);
  if (byId) {
    return {
      id: byId.id,
      name: byId.name,
      slug: byId.slug,
      workspace_type: byId.workspace_type,
      workspaceStatus: byId.workspaceStatus,
      memberRole: byId.memberRole,
      membershipStatus: byId.membershipStatus,
    };
  }
  const bySlug = rows.find((w) => (w.slug ?? "").trim() === param);
  if (!bySlug) return null;
  return {
    id: bySlug.id,
    name: bySlug.name,
    slug: bySlug.slug,
    workspace_type: bySlug.workspace_type,
    workspaceStatus: bySlug.workspaceStatus,
    memberRole: bySlug.memberRole,
    membershipStatus: bySlug.membershipStatus,
  };
}

export async function fetchWorkspaceMemberCount(workspaceId: string): Promise<number> {
  const supabase = await supabaseServerClient();
  const { count, error } = await supabase
    .from("visualify_workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("fetchWorkspaceMemberCount:", error.message);
    return 0;
  }
  return count ?? 0;
}

type WorkspaceProfileRow = {
  id: string;
  first_name: string | null;
  surname: string | null;
  email: string | null;
};

function displayNameFromWorkspaceProfile(p: WorkspaceProfileRow | null): string | null {
  if (!p) return null;
  const a = p.first_name?.trim() ?? "";
  const b = p.surname?.trim() ?? "";
  const full = `${a} ${b}`.trim();
  return full.length > 0 ? full : null;
}

const WORKSPACE_MEMBER_ROLE_ORDER: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

/**
 * Workspace directory for HQ admin (visualify_workspace_members + visualify_profiles only).
 * Profiles are loaded in a second query because PostgREST may not expose an embed from members → profiles.
 */
export async function fetchWorkspaceMembersForAdmin(
  workspaceId: string,
): Promise<
  Array<{
    userId: string;
    displayName: string | null;
    email: string | null;
    role: string | null;
    status: string | null;
  }>
> {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_workspace_members")
    .select("user_id, role, status")
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("fetchWorkspaceMembersForAdmin:", error.message);
    return [];
  }

  const rows = (data ?? []) as { user_id: string; role: string | null; status: string | null }[];
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];

  const profileByUserId = new Map<string, WorkspaceProfileRow>();
  if (userIds.length > 0) {
    const { data: profRows, error: profErr } = await supabase
      .from("visualify_profiles")
      .select("id, first_name, surname, email")
      .in("id", userIds);

    if (profErr) {
      console.error("fetchWorkspaceMembersForAdmin profiles:", profErr.message);
    } else {
      for (const p of (profRows ?? []) as WorkspaceProfileRow[]) {
        profileByUserId.set(p.id, p);
      }
    }
  }

  const mapped = rows.map((r) => {
    const prof = profileByUserId.get(r.user_id) ?? null;
    return {
      userId: r.user_id,
      displayName: displayNameFromWorkspaceProfile(prof),
      email: prof?.email?.trim() || null,
      role: r.role,
      status: r.status,
    };
  });

  mapped.sort((a, b) => {
    const ar = (a.role ?? "").trim().toLowerCase();
    const br = (b.role ?? "").trim().toLowerCase();
    const ra = WORKSPACE_MEMBER_ROLE_ORDER[ar] ?? 99;
    const rb = WORKSPACE_MEMBER_ROLE_ORDER[br] ?? 99;
    if (ra !== rb) return ra - rb;
    const an = (a.displayName ?? a.email ?? a.userId).toLowerCase();
    const bn = (b.displayName ?? b.email ?? b.userId).toLowerCase();
    return an.localeCompare(bn);
  });

  return mapped;
}
