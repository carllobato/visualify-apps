import { riskaiPath, stripLegacyRiskAiPrefix } from "@/lib/routes";

export function projectInformationSetupPath(projectId: string): string {
  return riskaiPath(`/projects/${projectId}/settings`);
}

/** `/create-project` shells are incomplete; land on setup, not Overview. */
export function createProjectShellRedirectPath(projectId: string): string {
  return projectInformationSetupPath(projectId);
}

export function isProjectInformationSetupPath(pathname: string, projectId: string): boolean {
  const pid = projectId.trim();
  if (!pathname || !pid) return false;
  const flat = stripLegacyRiskAiPrefix(pathname).replace(/\/+$/, "") || "/";
  const settings = projectInformationSetupPath(pid).replace(/\/+$/, "");
  return flat === settings || flat.startsWith(`${settings}/`);
}

export type IncompleteProjectRouteGate =
  | { action: "allow" }
  | { action: "redirect"; url: string };

/**
 * Incomplete Projects may use Project Settings / Project Information.
 * Overview, Risks, Simulation, Report, and other non-setup Project routes redirect there.
 * Completeness is not authorization: callers still run `assertProjectAccess` first.
 */
export function resolveIncompleteProjectRouteGate(args: {
  pathname: string;
  projectId: string;
  complete: boolean;
}): IncompleteProjectRouteGate {
  if (args.complete) return { action: "allow" };
  if (isProjectInformationSetupPath(args.pathname, args.projectId)) return { action: "allow" };
  return { action: "redirect", url: projectInformationSetupPath(args.projectId) };
}
