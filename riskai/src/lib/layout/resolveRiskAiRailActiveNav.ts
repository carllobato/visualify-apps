import {
  projectIdFromAppPathname,
  riskaiPath,
  stripLegacyRiskAiPrefix,
} from "@/lib/routes";

export type RailPrimaryNavKey =
  | "workspaceOverview"
  | "workspaceProjects"
  | "workspaceSettings"
  | "projectOverview"
  | "risks"
  | "simulation"
  | "report"
  | "projectSettings";

function normalizePathname(pathname: string): string {
  if (!pathname) return "";
  const flat = stripLegacyRiskAiPrefix(pathname);
  return flat.replace(/\/+$/, "") || flat;
}

function pathEqualsOrStartsWith(pathname: string, base: string): boolean {
  const p = normalizePathname(pathname);
  const b = normalizePathname(base);
  return p === b || p.startsWith(`${b}/`);
}

function workspaceOverviewPath(workspaceId: string): string {
  return normalizePathname(riskaiPath(`/workspaces/${workspaceId}`));
}

function isWorkspaceOverviewNavActive(pathname: string, workspaceId: string | null): boolean {
  if (workspaceId == null) return false;
  return normalizePathname(pathname) === workspaceOverviewPath(workspaceId);
}

function isWorkspaceProjectsNavActive(pathname: string, workspaceId: string | null): boolean {
  if (workspaceId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/workspaces/${workspaceId}/projects`));
}

function isWorkspaceSettingsNavActive(pathname: string, workspaceId: string | null): boolean {
  if (workspaceId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/workspaces/${workspaceId}/settings`));
}

function projectBasePath(projectId: string): string {
  return normalizePathname(riskaiPath(`/projects/${projectId}`));
}

function isProjectOverviewNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return normalizePathname(pathname) === projectBasePath(projectId);
}

function isRisksNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/projects/${projectId}/risks`));
}

function isSimulationNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/projects/${projectId}/simulation`));
}

function isReportNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/projects/${projectId}/report`));
}

function isProjectSettingsNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/projects/${projectId}/settings`));
}

export function riskAiProjectRailHrefs(projectId: string): {
  overview: string;
  risks: string;
  simulation: string;
  report: string;
  settings: string;
} {
  return {
    overview: riskaiPath(`/projects/${projectId}`),
    risks: riskaiPath(`/projects/${projectId}/risks`),
    simulation: riskaiPath(`/projects/${projectId}/simulation`),
    report: riskaiPath(`/projects/${projectId}/report`),
    settings: riskaiPath(`/projects/${projectId}/settings`),
  };
}

/**
 * At most one primary nav item is active. Project segments win over Workspace;
 * Workspace settings/projects win over Workspace identity (Overview).
 * `/projects/[id]/report` is Report, never Project Overview.
 */
export function resolveActivePrimaryNav(
  pathname: string,
  workspaceId: string | null
): RailPrimaryNavKey | null {
  const projectId = projectIdFromAppPathname(pathname);

  if (isRisksNavActive(pathname, projectId)) return "risks";
  if (isSimulationNavActive(pathname, projectId)) return "simulation";
  if (isReportNavActive(pathname, projectId)) return "report";
  if (isProjectSettingsNavActive(pathname, projectId)) return "projectSettings";
  if (isProjectOverviewNavActive(pathname, projectId)) return "projectOverview";
  if (isWorkspaceSettingsNavActive(pathname, workspaceId)) return "workspaceSettings";
  if (isWorkspaceProjectsNavActive(pathname, workspaceId)) return "workspaceProjects";
  if (isWorkspaceOverviewNavActive(pathname, workspaceId)) return "workspaceOverview";
  return null;
}
