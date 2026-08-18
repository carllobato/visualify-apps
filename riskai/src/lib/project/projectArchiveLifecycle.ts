import type { WorkspaceRole } from "@visualify/workspace-product-access";
import { workspaceRoleCanArchiveProject } from "@/lib/workspace/workspaceRoleCapabilities";

export const PROJECT_HARD_DELETE_DISABLED = {
  status: 405 as const,
  body: {
    error: "Projects cannot be deleted. Archive the project instead.",
    code: "PROJECT_ARCHIVE_REQUIRED" as const,
  },
};

export type ProjectPatchParseResult =
  | { ok: true; kind: "lifecycle"; archived: boolean }
  | { ok: true; kind: "name"; name: string }
  | { ok: false; error: string };

/**
 * Lifecycle `{ archived }` is exclusive: name and other fields in the same body are ignored.
 */
export function parseProjectPatchBody(body: unknown): ProjectPatchParseResult {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid JSON" };
  }

  const record = body as Record<string, unknown>;
  if ("archived" in record) {
    if (typeof record.archived !== "boolean") {
      return { ok: false, error: "archived must be true or false" };
    }
    return { ok: true, kind: "lifecycle", archived: record.archived };
  }

  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) {
    return { ok: false, error: "Name is required" };
  }
  return { ok: true, kind: "name", name };
}

/** Only `archived_at` is written for archive/restore. */
export function projectLifecycleArchivedAtUpdate(
  archived: boolean,
  nowIso: string,
): { archived_at: string | null } {
  return { archived_at: archived ? nowIso : null };
}

export type AuthorizeProjectArchiveArgs = {
  workspaceRole: WorkspaceRole | null;
  /** Ignored. Direct Project owner never grants archive. */
  isDirectProjectOwner?: boolean;
  /** Ignored. Direct Project editor never grants archive. */
  isDirectProjectEditor?: boolean;
  /** Ignored. Portfolio owner/admin never grants archive. */
  isPortfolioOwner?: boolean;
  isPortfolioAdmin?: boolean;
};

/**
 * Archive/restore authority from the Project's Workspace role only.
 */
export function authorizeProjectArchive(args: AuthorizeProjectArchiveArgs): boolean {
  return workspaceRoleCanArchiveProject(args.workspaceRole);
}

/** `visualify_projects.workspace_id` only. */
export function resolveAuthoritativeProjectWorkspaceId(params: {
  projectWorkspaceId: string | null | undefined;
}): string | null {
  const fromProject =
    typeof params.projectWorkspaceId === "string" ? params.projectWorkspaceId.trim() : "";
  return fromProject || null;
}

export function postArchiveNavigatePath(workspaceId: string): string {
  return `/workspaces/${workspaceId.trim()}/projects`;
}

/**
 * Paths to revalidate after archive/restore.
 */
export function projectLifecycleRevalidatePaths(params: {
  projectId: string;
  workspaceId: string | null;
}): string[] {
  const projectId = params.projectId.trim();
  const paths = [
    `/projects/${projectId}`,
    `/projects/${projectId}/settings`,
    "/projects",
    "/dashboard",
  ];
  const workspaceId = params.workspaceId?.trim() ?? "";
  if (workspaceId) {
    paths.push(`/workspaces/${workspaceId}`);
    paths.push(postArchiveNavigatePath(workspaceId));
  }
  return paths;
}
