const REPORT_LAST_PROJECT_BY_WORKSPACE_KEY = "visualify_report_last_project_by_workspace";

type LastProjectByWorkspace = Record<string, string>;

function readLastProjectMap(): LastProjectByWorkspace {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(REPORT_LAST_PROJECT_BY_WORKSPACE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as LastProjectByWorkspace;
  } catch {
    return {};
  }
}

function writeLastProjectMap(map: LastProjectByWorkspace): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(REPORT_LAST_PROJECT_BY_WORKSPACE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

/** Most recently opened report project for a workspace (client-only preference). */
export function readReportLastProjectIdForWorkspace(workspaceId: string | null): string | null {
  const id = workspaceId?.trim();
  if (!id) {
    return null;
  }
  const stored = readLastProjectMap()[id];
  return typeof stored === "string" && stored.trim() ? stored.trim() : null;
}

export function writeReportLastProjectIdForWorkspace(
  workspaceId: string,
  projectId: string,
): void {
  const workspace = workspaceId.trim();
  const project = projectId.trim();
  if (!workspace || !project) {
    return;
  }
  writeLastProjectMap({
    ...readLastProjectMap(),
    [workspace]: project,
  });
}
