export const REPORT_ROUTES = {
  home: "/home",
  /** Legacy path — redirects to `/projects`. */
  dashboard: "/dashboard",
  projects: "/projects",
  account: "/account",
  /** Legacy path — redirects to `/home`. */
  selectWorkspace: "/select-workspace",
} as const;

/** Default signed-in landing route after auth. */
export const REPORT_DEFAULT_ROUTE = REPORT_ROUTES.projects;

/** Post-auth entry — server may auto-open a report only when the workspace has one project. */
export function reportProjectsResumeEntryPath(): string {
  return `${REPORT_ROUTES.projects}?resume=1`;
}

/** Default destination immediately after sign-in or app open (not manual workspace pick). */
export function reportDefaultPostLoginPath(): string {
  return reportProjectsResumeEntryPath();
}

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

export function isReportProjectsResumeEntry(resume: string | null | undefined): boolean {
  const value = typeof resume === "string" ? resume.trim().toLowerCase() : "";
  return value === "1" || value === "true";
}

/** Safe in-app path after manual workspace selection; always lands on the projects list. */
export function reportReturnPathAfterWorkspaceSelection(next: string | null | undefined): string {
  const raw = typeof next === "string" ? next.trim() : "";
  if (!raw || raw === "/" || !raw.startsWith("/") || raw.startsWith("//")) {
    return REPORT_ROUTES.projects;
  }
  if (isReportWorkspaceSelectionPath(raw)) {
    return REPORT_ROUTES.projects;
  }
  if (isReportProjectsListPath(raw)) {
    return REPORT_ROUTES.projects;
  }
  return raw;
}

/** Auto-open a report only when the workspace has exactly one project. */
export function reportSingleProjectReportPath(
  projects: readonly ReportProjectNavTarget[],
): string | null {
  if (projects.length !== 1) {
    return null;
  }
  return reportProjectReportPath(projects[0]!.id);
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

/** Last-used project when valid, else the sole project in the workspace (nav links only). */
export function reportPreferredProjectReportPath(
  projects: readonly ReportProjectNavTarget[],
  lastUsedProjectId?: string | null,
): string | null {
  const lastUsed = lastUsedProjectId?.trim();
  if (lastUsed) {
    const remembered = projects.find((project) => project.id === lastUsed);
    if (remembered) {
      return reportProjectReportPath(remembered.id);
    }
  }
  return reportSingleProjectReportPath(projects);
}

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
  const preferred = reportPreferredProjectReportPath(projects, lastUsedProjectId);
  if (preferred) {
    return preferred;
  }
  const first = projects[0];
  if (first) {
    return reportProjectReportPath(first.id);
  }
  return REPORT_ROUTES.projects;
}
