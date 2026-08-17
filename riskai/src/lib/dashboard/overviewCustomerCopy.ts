import { riskaiPath } from "@/lib/routes";

/** Customer-facing Overview surface that reuses Portfolio overview UI. */
export type OverviewCustomerScope = "portfolio" | "workspace";

export type WorkspaceUnreportedProject = {
  id: string;
  name: string;
};

export function overviewProjectsHref(scope: OverviewCustomerScope, scopeId: string): string {
  return scope === "workspace"
    ? riskaiPath(`/workspaces/${scopeId}/projects`)
    : riskaiPath(`/portfolios/${scopeId}/projects`);
}

export function overviewSettingsHref(scope: OverviewCustomerScope, scopeId: string): string {
  return scope === "workspace"
    ? riskaiPath(`/workspaces/${scopeId}/settings`)
    : riskaiPath(`/portfolios/${scopeId}/portfolio-settings`);
}

export function overviewSettingsLabel(scope: OverviewCustomerScope): string {
  return scope === "workspace" ? "Workspace Settings" : "Portfolio Settings";
}

/**
 * Month token from existing `formatReportMonthLabel` output (e.g. “May 2026” → “May”).
 * Used in Workspace coverage copy so the selected month is named without implying all Projects are in.
 */
export function coverageMonthNameFromReportingLabel(reportingMonthLabel: string): string {
  const trimmed = reportingMonthLabel.trim();
  const month = trimmed.split(/\s+/)[0];
  return month || trimmed;
}

/** Workspace Active Projects KPI subtext: reported / total / selected month. */
export function workspaceActiveProjectsCoverageSubtext(params: {
  reportedCount: number;
  totalCount: number;
  reportingMonthLabel: string;
}): string {
  const month = coverageMonthNameFromReportingLabel(params.reportingMonthLabel);
  return `${params.reportedCount} of ${params.totalCount} projects reported for ${month}`;
}

/** Lightweight Active Projects modal heading for Projects omitted from the selected month. */
export function workspaceUnreportedProjectsHeading(reportingMonthLabel: string): string {
  return `Not reported for ${coverageMonthNameFromReportingLabel(reportingMonthLabel)}`;
}

/**
 * Workspace Projects that are readable but have no locked snapshot for the selected month.
 * Uses the existing Overview Project list minus month-scoped tile IDs — no extra scope query.
 */
export function workspaceProjectsOmittedFromReportingMonth(
  allProjects: readonly { id: string; name: string }[],
  reportedProjectIds: readonly string[]
): WorkspaceUnreportedProject[] {
  const reported = new Set(reportedProjectIds);
  return allProjects
    .filter((project) => !reported.has(project.id))
    .map((project) => ({
      id: project.id,
      name: project.name.trim() || project.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

export function workspaceOverviewEmptyTitle(hasWorkspaceProjects: boolean): string {
  return hasWorkspaceProjects
    ? "Workspace overview will appear once reporting data is available"
    : "No projects in this workspace yet";
}

export function workspaceOverviewEmptyBody(hasWorkspaceProjects: boolean): string {
  return hasWorkspaceProjects
    ? "Run and lock monthly reporting for at least one project to populate workspace risk rating, exposure, health, drivers, and breakdowns."
    : "Create a project to start building risk registers and monthly reporting.";
}
