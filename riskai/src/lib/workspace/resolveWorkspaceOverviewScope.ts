import type { SupabaseClient } from "@supabase/supabase-js";
import { filterActiveProjects, filterArchivedProjects } from "@/lib/db/activeProjectList";
import {
  asReportingUnit,
  type ReportingUnitOption,
} from "@/lib/portfolio/reportingPreferences";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

export type WorkspaceOverviewProject = {
  id: string;
  name: string;
  created_at: string | null;
};

export type ResolveWorkspaceOverviewScopeResult =
  | { ok: false; error: "invalid" | "forbidden" }
  | {
      ok: true;
      workspace: EntitledWorkspace;
      projects: WorkspaceOverviewProject[];
      /** From `visualify_workspaces.reporting_unit` (default when unset). */
      reportingUnit: ReportingUnitOption;
    };

function trimId(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Authorises a Workspace Overview URL against Sprint 1 entitled Workspaces, then loads
 * Projects by `visualify_projects.workspace_id`. Does not use `portfolio_id`.
 */
export async function resolveWorkspaceOverviewScope(params: {
  supabase: SupabaseClient;
  workspaceId: string;
  entitledWorkspaces: readonly EntitledWorkspace[];
}): Promise<ResolveWorkspaceOverviewScopeResult> {
  const workspaceId = trimId(params.workspaceId);
  if (!workspaceId) {
    return { ok: false, error: "invalid" };
  }

  const workspace = params.entitledWorkspaces.find((row) => trimId(row.id) === workspaceId);
  if (!workspace) {
    return { ok: false, error: "forbidden" };
  }

  const [projectsResult, workspaceRowResult] = await Promise.all([
    filterActiveProjects(
      params.supabase
        .from("visualify_projects")
        .select("id, name, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
    ),
    params.supabase
      .from("visualify_workspaces")
      .select("reporting_unit")
      .eq("id", workspaceId)
      .maybeSingle(),
  ]);

  const projects: WorkspaceOverviewProject[] = [];
  if (!projectsResult.error) {
    for (const row of projectsResult.data ?? []) {
      const id = trimId(typeof row.id === "string" ? row.id : "");
      if (!id) continue;
      projects.push({
        id,
        name: typeof row.name === "string" ? row.name : "",
        created_at: typeof row.created_at === "string" ? row.created_at : null,
      });
    }
  }

  return {
    ok: true,
    workspace,
    projects,
    reportingUnit: asReportingUnit(
      workspaceRowResult.error ? undefined : workspaceRowResult.data?.reporting_unit,
    ),
  };
}

export type WorkspaceArchivedProject = {
  id: string;
  name: string;
  archived_at: string;
};

/**
 * Archived Projects for a Workspace. Used only on `/workspaces/[id]/projects` Restore UI.
 * Does not feed Overview KPIs or active tiles.
 *
 * Matches archive auth: `visualify_projects.workspace_id`.
 */
export async function loadWorkspaceArchivedProjects(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceArchivedProject[]> {
  const id = trimId(workspaceId);
  if (!id) return [];

  const byWorkspaceResult = await filterArchivedProjects(
    supabase
      .from("visualify_projects")
      .select("id, name, archived_at")
      .eq("workspace_id", id)
      .order("archived_at", { ascending: false }),
  );

  const merged = new Map<string, WorkspaceArchivedProject>();
  if (!byWorkspaceResult.error) {
    for (const row of byWorkspaceResult.data ?? []) {
      const projectId = trimId(typeof row.id === "string" ? row.id : "");
      if (!projectId || merged.has(projectId)) continue;
      const archivedAt = typeof row.archived_at === "string" ? row.archived_at : "";
      if (!archivedAt) continue;
      merged.set(projectId, {
        id: projectId,
        name: typeof row.name === "string" ? row.name : "",
        archived_at: archivedAt,
      });
    }
  }

  return [...merged.values()].sort((a, b) => b.archived_at.localeCompare(a.archived_at));
}
