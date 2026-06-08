import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";
import { REPORT_LEGACY_EXCLUDED_PROJECT_ID } from "@/lib/projects/report-project-filters";
import {
  parseReportProjectStage,
  type ReportProjectStage,
} from "@/lib/projects/report-project-stages";
import { resolveReportProjectLatestOverallStatus } from "@/lib/projects/report-project-key-metrics";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { getReportEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";

export type ReportProjectListItem = {
  id: string;
  name: string;
  code: string | null;
  location: string | null;
  stage: ReportProjectStage | null;
  /** Latest overall RAG status from the most recent report period. */
  overallStatus: string;
  createdAt: string | null;
};

export type GetReportWorkspaceProjectsResult =
  | { ok: true; projects: ReportProjectListItem[] }
  | { ok: false; error: string };

export type CreateReportProjectInput = {
  name: string;
  stage: string;
  code?: string | null;
  location?: string | null;
};

export type UpdateReportProjectInput = {
  name: string;
  stage: string;
  code?: string | null;
  location?: string | null;
};

export type CreateReportProjectResult =
  | { ok: true; project: { id: string; name: string; created_at: string | null } }
  | { ok: false; reason: "forbidden" | "invalid" | "no_workspace" | "db_error"; message: string };

export type UpdateReportProjectResult =
  | { ok: true; project: ReportProjectListItem }
  | {
      ok: false;
      reason: "forbidden" | "invalid" | "no_workspace" | "not_found" | "db_error";
      message: string;
    };

const PROJECT_LIST_SELECT = "id, name, created_at, code, location, stage";
const PROJECT_LIST_SELECT_FALLBACK = "id, name, created_at, stage";

type ProjectListRow = {
  id: string;
  name: string | null;
  created_at: string | null;
  code?: string | null;
  location?: string | null;
  stage?: string | null;
};

/** Matches `@visualify/workspace-product-access` active member status handling. */
function isActiveWorkspaceMemberStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.toLowerCase() === "active";
}

async function assertActiveWorkspaceMember(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const entitledWorkspaces = await getReportEntitledWorkspaces(supabase, userId);
  if (!entitledWorkspaces.some((workspace) => workspace.id === workspaceId)) {
    return false;
  }

  const { data: membership, error } = await supabase
    .from("visualify_workspace_members")
    .select("status")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("[report] workspace membership lookup:", error.message);
    return false;
  }

  return Boolean(membership && isActiveWorkspaceMemberStatus(membership.status));
}

function mapProjectRow(row: ProjectListRow): ReportProjectListItem {
  const code = typeof row.code === "string" && row.code.trim() ? row.code.trim() : null;
  const location =
    typeof row.location === "string" && row.location.trim() ? row.location.trim() : null;

  return {
    id: row.id,
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : "Untitled project",
    code,
    location,
    stage: parseReportProjectStage(row.stage),
    overallStatus: resolveReportProjectLatestOverallStatus(row.id),
    createdAt: row.created_at ?? null,
  };
}

async function fetchWorkspaceProjectRows(
  supabase: SupabaseClient,
  activeWorkspaceId: string,
  projectId?: string,
): Promise<{ rows: ProjectListRow[]; error: string | null }> {
  const buildQuery = (select: string) => {
    let query = supabase
      .from("visualify_projects")
      .select(select)
      .eq("workspace_id", activeWorkspaceId)
      .neq("id", REPORT_LEGACY_EXCLUDED_PROJECT_ID);

    if (projectId) {
      query = query.eq("id", projectId);
    } else {
      query = query.order("name", { ascending: true });
    }

    return projectId ? query.maybeSingle() : query;
  };

  let result = await buildQuery(PROJECT_LIST_SELECT);
  if (result.error && /column.*(code|location)/i.test(result.error.message)) {
    result = await buildQuery(PROJECT_LIST_SELECT_FALLBACK);
  }

  if (result.error) {
    return { rows: [], error: result.error.message };
  }

  if (projectId) {
    const row = result.data as ProjectListRow | null;
    return { rows: row ? [row] : [], error: null };
  }

  return { rows: (result.data as ProjectListRow[] | null) ?? [], error: null };
}

function mapProjectRows(rows: ProjectListRow[]): ReportProjectListItem[] {
  return rows.map(mapProjectRow);
}

function parseReportProjectMetadataInput(input: {
  name: string;
  stage: string;
  code?: string | null;
  location?: string | null;
}):
  | { ok: true; name: string; stage: ReportProjectStage; code: string | null; location: string | null }
  | { ok: false; message: string } {
  const name = input.name.trim();
  const stage = parseReportProjectStage(input.stage);
  const code = typeof input.code === "string" ? input.code.trim() : "";
  const location = typeof input.location === "string" ? input.location.trim() : "";

  if (!name) {
    return { ok: false, message: "Project name is required." };
  }

  if (!stage) {
    return { ok: false, message: "A valid project stage is required." };
  }

  return {
    ok: true,
    name,
    stage,
    code: code || null,
    location: location || null,
  };
}

async function getReportWorkspaceProjectsImpl(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string | null,
): Promise<GetReportWorkspaceProjectsResult> {
  const activeWorkspaceId = workspaceId?.trim() ?? "";
  if (!activeWorkspaceId) {
    return { ok: true, projects: [] };
  }

  const canAccessWorkspace = await assertActiveWorkspaceMember(supabase, userId, activeWorkspaceId);
  if (!canAccessWorkspace) {
    return { ok: true, projects: [] };
  }

  const { rows, error } = await fetchWorkspaceProjectRows(supabase, activeWorkspaceId);

  if (error) {
    return { ok: false, error };
  }

  const projects = sortReportProjectsByName(mapProjectRows(rows));
  return { ok: true, projects };
}

async function getReportWorkspaceProjectsForUser(
  userId: string,
  workspaceId: string | null,
): Promise<GetReportWorkspaceProjectsResult> {
  const supabase = await supabaseServerClient();
  return getReportWorkspaceProjectsImpl(supabase, userId, workspaceId);
}

/**
 * Lists projects in the active Report workspace (excludes known legacy RiskAI project).
 * Uses the authenticated Supabase client (RLS applies).
 *
 * Wrapped in `cache()` so layout + page loaders in the same request share one project list query.
 */
export const getReportWorkspaceProjects = cache(getReportWorkspaceProjectsForUser);

export function sortReportProjectsByName(
  projects: ReportProjectListItem[],
): ReportProjectListItem[] {
  return [...projects].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolves a single project for Report routes in the active workspace.
 */
export async function getReportWorkspaceProjectById(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string | null,
  projectId: string,
): Promise<ReportProjectListItem | null> {
  const activeWorkspaceId = workspaceId?.trim() ?? "";
  const id = projectId.trim();
  if (!activeWorkspaceId || !id || id === REPORT_LEGACY_EXCLUDED_PROJECT_ID) {
    return null;
  }

  const canAccessWorkspace = await assertActiveWorkspaceMember(supabase, userId, activeWorkspaceId);
  if (!canAccessWorkspace) {
    return null;
  }

  const { rows, error } = await fetchWorkspaceProjectRows(supabase, activeWorkspaceId, id);

  if (error || rows.length === 0) {
    return null;
  }

  const [project] = mapProjectRows(rows);
  return project ?? null;
}

/**
 * Creates a project in the active Report workspace for the authenticated user.
 */
export async function createReportWorkspaceProject(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string | null,
  input: CreateReportProjectInput,
): Promise<CreateReportProjectResult> {
  const activeWorkspaceId = workspaceId?.trim() ?? "";
  const parsed = parseReportProjectMetadataInput(input);

  if (!parsed.ok) {
    return { ok: false, reason: "invalid", message: parsed.message };
  }

  if (!activeWorkspaceId) {
    return { ok: false, reason: "no_workspace", message: "Select a workspace before creating a project." };
  }

  const canAccessWorkspace = await assertActiveWorkspaceMember(supabase, userId, activeWorkspaceId);
  if (!canAccessWorkspace) {
    return { ok: false, reason: "forbidden", message: "You do not have access to this workspace." };
  }

  const { name, stage, code, location } = parsed;

  const insertPayload: Record<string, string | null> = {
    name,
    stage,
    owner_user_id: userId,
    workspace_id: activeWorkspaceId,
    code,
    location,
  };

  let { data, error } = await supabase
    .from("visualify_projects")
    .insert(insertPayload)
    .select("id, name, created_at")
    .single();

  if (error && /column.*(code|location)/i.test(error.message)) {
    const fallbackPayload: Record<string, string> = {
      name,
      stage,
      owner_user_id: userId,
      workspace_id: activeWorkspaceId,
    };
    ({ data, error } = await supabase
      .from("visualify_projects")
      .insert(fallbackPayload)
      .select("id, name, created_at")
      .single());
  }

  if (error || !data?.id) {
    return {
      ok: false,
      reason: "db_error",
      message: error?.message ?? "Could not create project.",
    };
  }

  return {
    ok: true,
    project: {
      id: data.id,
      name: typeof data.name === "string" ? data.name : name,
      created_at: data.created_at ?? null,
    },
  };
}

/**
 * Updates core project metadata on `visualify_projects` in the active Report workspace.
 */
export async function updateReportWorkspaceProject(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string | null,
  projectId: string,
  input: UpdateReportProjectInput,
): Promise<UpdateReportProjectResult> {
  const activeWorkspaceId = workspaceId?.trim() ?? "";
  const id = projectId.trim();
  const parsed = parseReportProjectMetadataInput(input);

  if (!parsed.ok) {
    return { ok: false, reason: "invalid", message: parsed.message };
  }

  if (!activeWorkspaceId) {
    return { ok: false, reason: "no_workspace", message: "Select a workspace before updating a project." };
  }

  if (!id || id === REPORT_LEGACY_EXCLUDED_PROJECT_ID) {
    return { ok: false, reason: "not_found", message: "Project not found." };
  }

  const canAccessWorkspace = await assertActiveWorkspaceMember(supabase, userId, activeWorkspaceId);
  if (!canAccessWorkspace) {
    return { ok: false, reason: "forbidden", message: "You do not have access to this workspace." };
  }

  const existing = await getReportWorkspaceProjectById(supabase, userId, activeWorkspaceId, id);
  if (!existing) {
    return { ok: false, reason: "not_found", message: "Project not found." };
  }

  const { name, stage, code, location } = parsed;

  const updatePayload: Record<string, string | null> = {
    name,
    stage,
    code,
    location,
  };

  let admin;
  try {
    admin = supabaseAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const serviceRoleMissing = message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return {
      ok: false,
      reason: "db_error",
      message: serviceRoleMissing
        ? "Project updates are not configured: add SUPABASE_SERVICE_ROLE_KEY to the server environment."
        : "Could not update project.",
    };
  }

  let { data, error } = await admin
    .from("visualify_projects")
    .update(updatePayload)
    .eq("id", id)
    .eq("workspace_id", activeWorkspaceId)
    .select(PROJECT_LIST_SELECT)
    .maybeSingle();

  if (error && /column.*(code|location)/i.test(error.message)) {
    ({ data, error } = await admin
      .from("visualify_projects")
      .update({ name, stage })
      .eq("id", id)
      .eq("workspace_id", activeWorkspaceId)
      .select(PROJECT_LIST_SELECT_FALLBACK)
      .maybeSingle());
  }

  if (error) {
    return { ok: false, reason: "db_error", message: error.message };
  }

  if (!data) {
    return { ok: false, reason: "not_found", message: "Project not found." };
  }

  return { ok: true, project: mapProjectRow(data as ProjectListRow) };
}
