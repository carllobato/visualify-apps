/** Authenticated RiskAI UI (served under app host, e.g. app.visualify.com.au). */
export const RISKAI_BASE = "/riskai";
export const DASHBOARD_PATH = "/riskai/dashboard";

/** Prefix a path with the RiskAI app segment, e.g. `/projects` → `/riskai/projects`. */
export function riskaiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return RISKAI_BASE;
  return `${RISKAI_BASE}${normalized}`;
}

/** Project id from `/riskai/projects/[id]/…` (or null). */
export function projectIdFromAppPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "riskai" && segments[1] === "projects" && segments[2]) return segments[2];
  return null;
}

/** Portfolio id from `/riskai/portfolios/[id]/…` (or null). */
export function portfolioIdFromAppPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "riskai" && segments[1] === "portfolios" && segments[2]) return segments[2];
  return null;
}

/**
 * Shell title suffix for known portfolio routes, from the URL only (updates on navigation without
 * waiting for the page RSC or `useEffect`). Returns null for unknown subpaths — use header extras then.
 */
export function portfolioRouteTitleFromPathname(
  pathname: string | null | undefined,
  portfolioId: string
): string | null {
  const pid = portfolioId.trim();
  if (!pathname || !pid) return null;
  const normalized = pathname.replace(/\/+$/, "") || pathname;
  const overview = riskaiPath(`/portfolios/${pid}`).replace(/\/+$/, "");
  const projects = riskaiPath(`/portfolios/${pid}/projects`).replace(/\/+$/, "");
  const settings = riskaiPath(`/portfolios/${pid}/portfolio-settings`).replace(/\/+$/, "");
  if (normalized === overview) return "Overview";
  if (normalized === projects) return "Projects";
  if (normalized === settings) return "Portfolio Settings";
  return null;
}
