/** Default signed-in landing route for Report. */
export const REPORT_DEFAULT_ROUTE = "/projects";

export const REPORT_ROUTES = {
  /** Legacy path — redirects to `/projects`. */
  dashboard: "/dashboard",
  projects: "/projects",
  account: "/account",
  selectWorkspace: "/select-workspace",
} as const;

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
