import { filterActiveProjects } from "@/lib/db/activeProjectList";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Matches `@visualify/workspace-product-access` active member status handling. */
function isActiveWorkspaceMemberStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.toLowerCase() === "active";
}

export type AccessibleProject = {
  id: string;
  name: string;
  created_at: string | null;
};

export type GetAccessibleProjectsResult =
  | { ok: true; projects: AccessibleProject[] }
  | { ok: false; error: string };

type ProjectListRow = { id: string; name: string | null; created_at: string | null };

const PROJECT_LIST_SELECT = "id, name, created_at";

/**
 * Server-only: projects the user may read — table owner, direct project_members,
 * or projects in workspaces where the user has active visualify_workspace_members.
 */
export async function getAccessibleProjects(
  supabase: SupabaseClient,
  userId: string,
): Promise<GetAccessibleProjectsResult> {

  const [ownedResult, membersIndexResult, workspaceMembersResult] = await Promise.all([
    filterActiveProjects(
      supabase
        .from("visualify_projects")
        .select(PROJECT_LIST_SELECT)
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: true }),
    ),
    supabase.from("visualify_project_members").select("project_id").eq("user_id", userId),
    supabase
      .from("visualify_workspace_members")
      .select("workspace_id, status")
      .eq("user_id", userId),
  ]);

  const { data: ownedProjects, error: ownedError } = ownedResult;
  const { data: memberRows, error: memberError } = membersIndexResult;

  if (ownedError) {
    return { ok: false, error: ownedError.message };
  }

  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  const { data: workspaceMemberships, error: workspaceMembersError } = workspaceMembersResult;
  if (workspaceMembersError) {
    return { ok: false, error: workspaceMembersError.message };
  }

  const memberProjectIds = [
    ...new Set((memberRows ?? []).map((r) => r.project_id as string)),
  ];

  const workspaceIds = [
    ...new Set(
      (workspaceMemberships ?? [])
        .filter((m) => isActiveWorkspaceMemberStatus(m.status))
        .map((m) => m.workspace_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    ),
  ];

  const emptyProjectList = Promise.resolve({
    data: [] as ProjectListRow[],
    error: null,
  });

  const [memberProjectsResult, workspaceProjectsResult] =
    await Promise.all([
      memberProjectIds.length > 0
        ? filterActiveProjects(
            supabase
              .from("visualify_projects")
              .select(PROJECT_LIST_SELECT)
              .in("id", memberProjectIds)
              .order("created_at", { ascending: true }),
          )
        : emptyProjectList,
      workspaceIds.length > 0
        ? filterActiveProjects(
            supabase
              .from("visualify_projects")
              .select(PROJECT_LIST_SELECT)
              .in("workspace_id", workspaceIds)
              .order("created_at", { ascending: true }),
          )
        : emptyProjectList,
    ]);

  if (memberProjectsResult.error) {
    return { ok: false, error: memberProjectsResult.error.message };
  }
  if (workspaceProjectsResult.error) {
    return { ok: false, error: workspaceProjectsResult.error.message };
  }

  const rowToAccessible = (p: ProjectListRow): AccessibleProject => ({
    id: p.id,
    name: p.name ?? "",
    created_at: p.created_at ?? null,
  });

  /** First non-empty (after trim) display name; safe for null/undefined/non-string DB values. */
  const preferredName = (raw: unknown): string | null => {
    if (raw == null) return null;
    const str = typeof raw === "string" ? raw : String(raw);
    return str.trim() ? str : null;
  };

  const mergeRows = (a: AccessibleProject, b: AccessibleProject): AccessibleProject => ({
    id: a.id,
    name: preferredName(a.name) ?? preferredName(b.name) ?? "",
    created_at: a.created_at ?? b.created_at,
  });

  const byId = new Map<string, AccessibleProject>();
  const addProjectRow = (p: ProjectListRow) => {
    const next = rowToAccessible(p);
    const prev = byId.get(p.id);
    byId.set(p.id, prev ? mergeRows(prev, next) : next);
  };

  for (const p of ownedProjects ?? []) {
    addProjectRow(p);
  }
  for (const p of memberProjectsResult.data ?? []) {
    addProjectRow(p);
  }
  for (const p of workspaceProjectsResult.data ?? []) {
    addProjectRow(p);
  }

  const merged = Array.from(byId.values()).sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });

  return { ok: true, projects: merged };
}
