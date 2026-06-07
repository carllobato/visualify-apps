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
