/** Default signed-in landing route for ControlAI. */
export const CONTROLAI_DEFAULT_ROUTE = "/dashboard";

export const CONTROLAI_ROUTES = {
  dashboard: "/dashboard",
  portfolios: "/portfolios",
  projects: "/projects",
  settings: "/settings",
  account: "/account",
  selectWorkspace: "/select-workspace",
} as const;

/** Workspace-level primary rail (portfolios omitted from nav; route remains available). */
export const CONTROLAI_PRIMARY_NAV = [
  { href: CONTROLAI_ROUTES.dashboard, label: "Dashboard" },
  { href: CONTROLAI_ROUTES.projects, label: "Projects" },
  { href: CONTROLAI_ROUTES.settings, label: "Settings" },
] as const;

export type ControlAIProjectNavSegment = "cost" | "time" | "risk" | "settings";

function pathSegments(pathname: string | null): string[] {
  if (!pathname) return [];
  return pathname.split("/").filter(Boolean);
}

/** Project id from `/projects/[id]/…`. */
export function projectIdFromPathname(pathname: string | null): string | null {
  const segments = pathSegments(pathname);
  if (segments[0] === "projects" && segments[1]) return segments[1];
  return null;
}

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export function controlaiProjectPath(
  projectId: string,
  segment?: ControlAIProjectNavSegment,
): string {
  const base = `${CONTROLAI_ROUTES.projects}/${projectId}`;
  return segment ? `${base}/${segment}` : base;
}

export function isControlAIProjectsListPath(pathname: string | null): boolean {
  return normalizePathname(pathname ?? "") === CONTROLAI_ROUTES.projects;
}

export function isControlAIProjectOverviewPath(
  pathname: string | null,
  projectId: string | null,
): boolean {
  if (!projectId) return false;
  return normalizePathname(pathname ?? "") === controlaiProjectPath(projectId);
}

export function isControlAIProjectSegmentPath(
  pathname: string | null,
  projectId: string | null,
  segment: ControlAIProjectNavSegment,
): boolean {
  if (!projectId) return false;
  const base = controlaiProjectPath(projectId, segment);
  const p = normalizePathname(pathname ?? "");
  return p === base || p.startsWith(`${base}/`);
}
