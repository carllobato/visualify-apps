/** Default signed-in landing route for Report (workspace picker when needed). */
export const REPORT_DEFAULT_ROUTE = "/home";

export const REPORT_ROUTES = {
  home: "/home",
  /** Legacy path — redirects to `/projects`. */
  dashboard: "/dashboard",
  projects: "/projects",
  account: "/account",
  /** Legacy path — redirects to `/home`. */
  selectWorkspace: "/select-workspace",
} as const;

export function isReportHomePath(pathname: string | null): boolean {
  const normalized = (pathname ?? "").replace(/\/+$/, "");
  return normalized === REPORT_ROUTES.home;
}

export function isReportWorkspaceSelectionPath(pathname: string | null): boolean {
  const normalized = (pathname ?? "").replace(/\/+$/, "");
  return (
    normalized === REPORT_ROUTES.home ||
    normalized === REPORT_ROUTES.selectWorkspace ||
    (pathname ?? "").startsWith(`${REPORT_ROUTES.selectWorkspace}/`)
  );
}

export function reportProjectReportPath(projectId: string): string {
  return `${REPORT_ROUTES.projects}/${projectId}/report`;
}

export function isReportProjectsListPath(pathname: string | null): boolean {
  return (pathname ?? "").replace(/\/+$/, "") === REPORT_ROUTES.projects;
}

/** Project id from `/projects/[id]/report`. */
export function reportProjectIdFromPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "projects" && segments[1] && segments[2] === "report") {
    return segments[1]!;
  }
  return null;
}

export function isReportReportViewPath(pathname: string | null): boolean {
  return reportProjectIdFromPathname(pathname) !== null;
}

type ReportProjectNavTarget = { id: string };

/**
 * Bottom nav “Reports” href — no `/reports` index exists; report views live at
 * `/projects/[id]/report`. Uses the current project when on a report, else the last
 * opened project when remembered, else the first project in the rail list, else `/projects`.
 */
export function reportReportsNavHref(
  pathname: string,
  projects: readonly ReportProjectNavTarget[],
  lastUsedProjectId?: string | null,
): string {
  const activeProjectId = reportProjectIdFromPathname(pathname);
  if (activeProjectId) {
    return reportProjectReportPath(activeProjectId);
  }
  const lastUsed = lastUsedProjectId?.trim();
  if (lastUsed) {
    const remembered = projects.find((project) => project.id === lastUsed);
    if (remembered) {
      return reportProjectReportPath(remembered.id);
    }
  }
  const first = projects[0];
  if (first) {
    return reportProjectReportPath(first.id);
  }
  return REPORT_ROUTES.projects;
}
