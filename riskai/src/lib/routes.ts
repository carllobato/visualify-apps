/** Authenticated RiskAI UI (served under app host, e.g. app.visualify.com.au). */
export const RISKAI_BASE = "";
export const DASHBOARD_PATH = "/dashboard";

/** Legacy URL prefix; permanent redirects map `/riskai/*` → flat routes. */
export const LEGACY_RISKAI_PREFIX = "/riskai";

const AUTHENTICATED_APP_ROOTS = [
  "/dashboard",
  "/portfolios",
  "/projects",
  "/account",
  "/matrix",
  "/simulation",
  "/create-project",
  "/onboarding",
  "/not-found",
  "/dev",
  "/run-data",
] as const;

/** Strip legacy `/riskai` prefix for comparisons and link builders. */
export function stripLegacyRiskAiPrefix(pathname: string): string {
  if (pathname === LEGACY_RISKAI_PREFIX || pathname === `${LEGACY_RISKAI_PREFIX}/`) {
    return DASHBOARD_PATH;
  }
  if (pathname.startsWith(`${LEGACY_RISKAI_PREFIX}/`)) {
    const rest = pathname.slice(LEGACY_RISKAI_PREFIX.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname;
}

/** Canonical app path (flat). Accepts legacy-prefixed input and normalizes it. */
export function riskaiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const flat = stripLegacyRiskAiPrefix(normalized);
  if (flat === "/") return DASHBOARD_PATH;
  return flat;
}

/** Safe post-auth / `?next=` target: flat canonical path, or dashboard when invalid. */
export function normalizeAppPath(path: string | null | undefined, fallback = DASHBOARD_PATH): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return stripLegacyRiskAiPrefix(path);
}

function appPathSegments(pathname: string | null): string[] {
  if (!pathname) return [];
  return stripLegacyRiskAiPrefix(pathname).split("/").filter(Boolean);
}

/** Project id from `/projects/[id]/…` or legacy `/riskai/projects/[id]/…`. */
export function projectIdFromAppPathname(pathname: string | null): string | null {
  const segments = appPathSegments(pathname);
  if (segments[0] === "projects" && segments[1]) return segments[1];
  return null;
}

/** Portfolio id from `/portfolios/[id]/…` or legacy `/riskai/portfolios/[id]/…`. */
export function portfolioIdFromAppPathname(pathname: string | null): string | null {
  const segments = appPathSegments(pathname);
  if (segments[0] === "portfolios" && segments[1]) return segments[1];
  return null;
}

export function hasLegacyRiskAiPrefix(pathname: string): boolean {
  return pathname === LEGACY_RISKAI_PREFIX || pathname.startsWith(`${LEGACY_RISKAI_PREFIX}/`);
}

/** True for authenticated app surfaces (flat or legacy-prefixed). */
export function isAuthenticatedAppPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const flat = stripLegacyRiskAiPrefix(pathname);
  return AUTHENTICATED_APP_ROOTS.some((root) => flat === root || flat.startsWith(`${root}/`));
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
  const normalized = stripLegacyRiskAiPrefix(pathname).replace(/\/+$/, "") || pathname;
  const overview = riskaiPath(`/portfolios/${pid}`).replace(/\/+$/, "");
  const projects = riskaiPath(`/portfolios/${pid}/projects`).replace(/\/+$/, "");
  const settings = riskaiPath(`/portfolios/${pid}/portfolio-settings`).replace(/\/+$/, "");
  if (normalized === overview) return "Overview";
  if (normalized === projects) return "Projects";
  if (normalized === settings) return "Portfolio Settings";
  return null;
}
