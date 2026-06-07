import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeWorkspaceRole,
  workspaceRoleRank,
} from "@visualify/workspace-product-access";
import { cookies } from "next/headers";
import { supabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceTileAvatarInitials } from "@/lib/workspace-avatar-initials";

export const VISUALIFY_ACTIVE_WORKSPACE_COOKIE = "visualify_active_workspace_id";

export type ManageableWorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  workspace_type: string;
  workspaceStatus: string | null;
  memberRole: string;
  membershipStatus: string | null;
  logo_url: string | null;
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
  logo_url: string | null;
  website_url: string | null;
  owner_user_id: string | null;
  visualify_workspace_products: { id: string }[] | { id: string } | null;
};

type OwnerProfileSlice = {
  first_name: string | null;
  surname: string | null;
};

async function fetchOwnerProfilesByUserIds(userIds: string[]): Promise<Map<string, OwnerProfileSlice>> {
  const out = new Map<string, OwnerProfileSlice>();
  if (userIds.length === 0) return out;

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_profiles")
    .select("id, first_name, surname")
    .in("id", userIds);

  if (error) {
    console.error("fetchOwnerProfilesByUserIds:", error.message);
    return out;
  }

  for (const row of (data ?? []) as { id: string; first_name: string | null; surname: string | null }[]) {
    if (!row.id) continue;
    out.set(row.id, { first_name: row.first_name, surname: row.surname });
  }
  return out;
}

function productCount(ws: WorkspaceRow): number {
  const raw = ws.visualify_workspace_products;
  if (raw == null) return 0;
  return Array.isArray(raw) ? raw.length : 1;
}

/**
 * Workspaces the signed-in user may administer in HQ: active membership, owner/admin role, active workspace.
 *
 * Billing and product enablement are workspace-scoped; users are identities only. All manageable workspaces
 * must remain visible in the rail (including `personal` with zero products) so a manually created workspace
 * is never hidden before products attach.
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
    logo_url: w.logo_url,
  }));
}

/** Active workspace membership for rail/dashboard (all roles). Same shape as manageable summary. */
export type VisibleWorkspaceSummary = ManageableWorkspaceSummary;

type WorkspaceInternalRow = ManageableWorkspaceSummary & {
  productCount: number;
  logo_url: string | null;
  website_url: string | null;
  owner_user_id: string | null;
};

export type WorkspaceRailEntry = {
  id: string;
  name: string;
  workspace_type: string;
  website_url: string | null;
  logo_url: string | null;
  avatarInitials: string | null;
  memberRole: string;
};

export type WorkspaceDashboardEntry = {
  id: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  avatarInitials: string | null;
  memberRole: string;
  memberCount: number;
  productCount: number;
};

async function fetchWorkspaceMemberCountsByIds(workspaceIds: string[]): Promise<Map<string, number>> {
  if (workspaceIds.length === 0) return new Map();

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_workspace_members")
    .select("workspace_id")
    .in("workspace_id", workspaceIds);

  if (error) {
    console.error("fetchWorkspaceMemberCountsByIds:", error.message);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { workspace_id: string }[]) {
    const id = row.workspace_id;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

async function fetchUserWorkspacesInternalImpl(
  userId: string,
  options: { adminOnly: boolean },
  supabaseClient?: SupabaseClient,
): Promise<WorkspaceInternalRow[]> {
  const supabase = supabaseClient ?? (await supabaseServerClient());

  const { data: memberRows, error: memberErr } = await supabase
    .from("visualify_workspace_members")
    .select("workspace_id, role, status")
    .eq("user_id", userId);

  if (memberErr || !memberRows?.length) {
    if (memberErr) {
      console.error(
        options.adminOnly
          ? "fetchManageableWorkspacesInternal members:"
          : "fetchVisibleWorkspacesInternal members:",
        memberErr.message,
      );
    }
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
      logo_url,
      website_url,
      owner_user_id,
      visualify_workspace_products ( id )
    `
    )
    .in("id", workspaceIds);

  if (wsErr || !workspaceRows) {
    if (wsErr) {
      console.error(
        options.adminOnly
          ? "fetchManageableWorkspacesInternal workspaces:"
          : "fetchVisibleWorkspacesInternal workspaces:",
        wsErr.message,
      );
    }
    return [];
  }

  const byId = new Map((workspaceRows as WorkspaceRow[]).map((w) => [w.id, w]));

  const out: WorkspaceInternalRow[] = [];

  for (const m of members) {
    if (!isActiveStatus(m.status)) continue;
    if (options.adminOnly && !isAdminRole(m.role)) continue;

    const ws = byId.get(m.workspace_id);
    if (!ws || !isActiveStatus(ws.status)) continue;

    const pc = productCount(ws);

    out.push({
      id: ws.id,
      name: ws.name,
      slug: ws.slug ?? "",
      workspace_type: ws.workspace_type ?? "",
      workspaceStatus: ws.status,
      memberRole: m.role ?? "",
      membershipStatus: m.status,
      productCount: pc,
      logo_url: ws.logo_url ?? null,
      website_url:
        typeof ws.website_url === "string" && ws.website_url.trim() ? ws.website_url.trim() : null,
      owner_user_id:
        typeof ws.owner_user_id === "string" && ws.owner_user_id.trim() ? ws.owner_user_id.trim() : null,
    });
  }

  const dedup = new Map<string, WorkspaceInternalRow>();
  for (const row of out) {
    dedup.set(row.id, row);
  }
  return [...dedup.values()];
}

async function fetchManageableWorkspacesInternalImpl(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<WorkspaceInternalRow[]> {
  return fetchUserWorkspacesInternalImpl(userId, { adminOnly: true }, supabaseClient);
}

async function fetchVisibleWorkspacesInternalImpl(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<WorkspaceInternalRow[]> {
  return fetchUserWorkspacesInternalImpl(userId, { adminOnly: false }, supabaseClient);
}

/** Per-request dedup when layout and page loaders both need manageable workspaces. */
const fetchManageableWorkspacesInternalCached = cache((userId: string) =>
  fetchManageableWorkspacesInternalImpl(userId),
);

/** Per-request dedup when layout and page loaders both need visible member workspaces. */
const fetchVisibleWorkspacesInternalCached = cache((userId: string) =>
  fetchVisibleWorkspacesInternalImpl(userId),
);

async function fetchManageableWorkspacesInternal(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<WorkspaceInternalRow[]> {
  if (supabaseClient) {
    return fetchManageableWorkspacesInternalImpl(userId, supabaseClient);
  }
  return fetchManageableWorkspacesInternalCached(userId);
}

async function fetchVisibleWorkspacesInternal(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<WorkspaceInternalRow[]> {
  if (supabaseClient) {
    return fetchVisibleWorkspacesInternalImpl(userId, supabaseClient);
  }
  return fetchVisibleWorkspacesInternalCached(userId);
}

async function internalRowsToRailEntries(rows: WorkspaceInternalRow[]): Promise<WorkspaceRailEntry[]> {
  const avatarInitialsById = await fetchAvatarInitialsByWorkspaceId(rows);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    workspace_type: r.workspace_type,
    website_url: r.website_url,
    logo_url: r.logo_url,
    avatarInitials: avatarInitialsById.get(r.id) ?? null,
    memberRole: r.memberRole,
  }));
}

async function internalRowsToDashboardEntries(
  rows: WorkspaceInternalRow[],
): Promise<WorkspaceDashboardEntry[]> {
  const [memberCounts, avatarInitialsById] = await Promise.all([
    fetchWorkspaceMemberCountsByIds(rows.map((r) => r.id)),
    fetchAvatarInitialsByWorkspaceId(rows),
  ]);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    website_url: r.website_url,
    logo_url: r.logo_url,
    avatarInitials: avatarInitialsById.get(r.id) ?? null,
    memberRole: r.memberRole,
    memberCount: memberCounts.get(r.id) ?? 0,
    productCount: r.productCount,
  }));
}

async function fetchAvatarInitialsByWorkspaceId(
  rows: Array<{
    id: string;
    name: string;
    workspace_type: string;
    owner_user_id: string | null;
  }>,
): Promise<Map<string, string | null>> {
  const ownerIds = [
    ...new Set(
      rows
        .map((r) => r.owner_user_id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const ownerProfiles = await fetchOwnerProfilesByUserIds(ownerIds);
  const out = new Map<string, string | null>();
  for (const r of rows) {
    const ownerId = r.owner_user_id?.trim() ?? "";
    const ownerProfile = ownerId ? ownerProfiles.get(ownerId) : undefined;
    out.set(
      r.id,
      resolveWorkspaceTileAvatarInitials({
        workspaceType: r.workspace_type,
        workspaceName: r.name,
        ownerFirstName: ownerProfile?.first_name ?? null,
        ownerSurname: ownerProfile?.surname ?? null,
      }),
    );
  }
  return out;
}

export async function fetchManageableWorkspacesForRail(userId: string): Promise<WorkspaceRailEntry[]> {
  const rows = await fetchManageableWorkspacesInternal(userId);
  return internalRowsToRailEntries(rows);
}

/** Active memberships (all roles) for the HQ rail and workspace switcher. */
export async function fetchVisibleWorkspacesForRail(userId: string): Promise<WorkspaceRailEntry[]> {
  const rows = await fetchVisibleWorkspacesInternal(userId);
  return internalRowsToRailEntries(rows);
}

export async function fetchManageableWorkspacesForDashboard(
  userId: string,
): Promise<WorkspaceDashboardEntry[]> {
  const rows = await fetchManageableWorkspacesInternal(userId);
  return internalRowsToDashboardEntries(rows);
}

/** Active memberships (all roles) for the HQ dashboard launcher. */
export async function fetchVisibleWorkspacesForDashboard(
  userId: string,
): Promise<WorkspaceDashboardEntry[]> {
  const rows = await fetchVisibleWorkspacesInternal(userId);
  return internalRowsToDashboardEntries(rows);
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

/** Clears the active-workspace cookie when it points at the given workspace (e.g. after archive). */
export async function clearVisualifyActiveWorkspaceIdCookieIfMatches(workspaceId: string): Promise<void> {
  const id = workspaceId.trim();
  if (!id) return;
  const store = await cookies();
  const current = store.get(VISUALIFY_ACTIVE_WORKSPACE_COOKIE)?.value?.trim();
  if (current === id) {
    store.delete(VISUALIFY_ACTIVE_WORKSPACE_COOKIE);
  }
}

export async function resolveSelectedWorkspaceIdForRail(userId: string): Promise<string | null> {
  const cookieId = await readVisualifyActiveWorkspaceIdFromCookie();
  if (!cookieId) return null;
  const visible = await fetchVisibleWorkspacesInternal(userId);
  const ok = visible.some((w) => w.id === cookieId);
  return ok ? cookieId : null;
}

function workspaceSummaryFromInternalRow(
  hit: WorkspaceInternalRow,
): ManageableWorkspaceSummary {
  return {
    id: hit.id,
    name: hit.name,
    slug: hit.slug,
    workspace_type: hit.workspace_type,
    workspaceStatus: hit.workspaceStatus,
    memberRole: hit.memberRole,
    membershipStatus: hit.membershipStatus,
    logo_url: hit.logo_url,
  };
}

export async function fetchManageableWorkspaceById(
  userId: string,
  workspaceId: string,
  supabaseClient?: SupabaseClient,
): Promise<ManageableWorkspaceSummary | null> {
  const rows = await fetchManageableWorkspacesInternal(userId, supabaseClient);
  const hit = rows.find((w) => w.id === workspaceId);
  return hit ? workspaceSummaryFromInternalRow(hit) : null;
}

/** Active membership workspace by id (all roles). */
export async function fetchVisibleWorkspaceById(
  userId: string,
  workspaceId: string,
  supabaseClient?: SupabaseClient,
): Promise<VisibleWorkspaceSummary | null> {
  const rows = await fetchVisibleWorkspacesInternal(userId, supabaseClient);
  const hit = rows.find((w) => w.id === workspaceId);
  return hit ? workspaceSummaryFromInternalRow(hit) : null;
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
  if (byId) return workspaceSummaryFromInternalRow(byId);
  const bySlug = rows.find((w) => (w.slug ?? "").trim() === param);
  return bySlug ? workspaceSummaryFromInternalRow(bySlug) : null;
}

/**
 * Resolve a visible workspace from a URL segment (canonical id or workspace slug).
 * Any active member (owner/admin/member/viewer) may enter the workspace overview page.
 */
export async function fetchVisibleWorkspaceByRouteParam(
  userId: string,
  workspaceIdOrSlug: string,
): Promise<VisibleWorkspaceSummary | null> {
  const param = workspaceIdOrSlug.trim();
  if (!param) return null;
  const rows = await fetchVisibleWorkspacesInternal(userId);
  const byId = rows.find((w) => w.id === param);
  if (byId) return workspaceSummaryFromInternalRow(byId);
  const bySlug = rows.find((w) => (w.slug ?? "").trim() === param);
  return bySlug ? workspaceSummaryFromInternalRow(bySlug) : null;
}

/** Website URL for a workspace the caller may already have resolved as manageable. */
export async function fetchWorkspaceWebsiteUrl(workspaceId: string): Promise<string | null> {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("visualify_workspaces")
    .select("website_url")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("fetchWorkspaceWebsiteUrl:", error.message);
    return null;
  }

  const raw = (data as { website_url?: string | null } | null)?.website_url;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
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

function workspaceMemberRoleSortKey(role: string): number {
  const normalized = normalizeWorkspaceRole(role);
  return normalized != null ? workspaceRoleRank(normalized) : 99;
}

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
    const ra = workspaceMemberRoleSortKey(ar);
    const rb = workspaceMemberRoleSortKey(br);
    if (ra !== rb) return ra - rb;
    const an = (a.displayName ?? a.email ?? a.userId).toLowerCase();
    const bn = (b.displayName ?? b.email ?? b.userId).toLowerCase();
    return an.localeCompare(bn);
  });

  return mapped;
}
