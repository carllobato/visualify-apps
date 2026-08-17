/** Authenticated RiskAI UI (served under app host, e.g. app.visualify.com.au). */
export const RISKAI_BASE = "";
export const DASHBOARD_PATH = "/dashboard";
/** Signed-in workspace selector (2+ workspaces). Brand mark returns here. */
export const HOME_PATH = "/home";
/** Signed-in users without RiskAI product entitlement (outside `(protected)`). */
export const NO_ACCESS_PATH = "/no-access";

/** Legacy URL prefix; permanent redirects map `/riskai/*` → flat routes. */
export const LEGACY_RISKAI_PREFIX = "/riskai";

const AUTHENTICATED_APP_ROOTS = [
  "/home",
  "/dashboard",
  "/portfolios",
  "/workspaces",
  "/projects",
  "/account",
  "/matrix",
  "/simulation",
  "/create-project",
  "/onboarding",
  "/not-found",
  "/dev",
  "/run-data",
  NO_ACCESS_PATH,
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

/** Overview for a specific workspace (`/workspaces/[id]`). */
export function workspaceOverviewPath(workspaceId: string): string {
  return riskaiPath(`/workspaces/${workspaceId}`);
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

/** Workspace id from `/workspaces/[id]/…` or legacy `/riskai/workspaces/[id]/…`. */
export function workspaceIdFromAppPathname(pathname: string | null): string | null {
  const segments = appPathSegments(pathname);
  if (segments[0] === "workspaces" && segments[1]) return segments[1];
  return null;
}

export function hasLegacyRiskAiPrefix(pathname: string): boolean {
  return pathname === LEGACY_RISKAI_PREFIX || pathname.startsWith(`${LEGACY_RISKAI_PREFIX}/`);
}

/** True for the workspace selector (`/home` or `/home/…`, including legacy `/riskai/home`). */
export function isWorkspaceSelectionPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const flat = stripLegacyRiskAiPrefix(pathname);
  return flat === HOME_PATH || flat.startsWith(`${HOME_PATH}/`);
}

/**
 * Where to send the user after they pick a workspace on `/home`.
 * Defaults to that workspace’s overview. Honours `?next=` unless it is the
 * selector itself or the legacy `/dashboard` landing.
 */
export function pathAfterWorkspaceSelection(
  workspaceId: string,
  next: string | null | undefined
): string {
  const overview = workspaceOverviewPath(workspaceId);
  const raw = normalizeAppPath(next, overview);
  if (isWorkspaceSelectionPath(raw) || raw === DASHBOARD_PATH) {
    return overview;
  }
  return raw;
}

/**
 * Hide Workspace/Project rail presentation on `/home`.
 * Workspace/project URLs always show their sections even if a shared layout
 * still holds a stale `hidePrimaryNav` from a previous `/home` render.
 */
export function shouldHideAppShellPrimaryNav(
  pathname: string | null,
  hidePrimaryNav: boolean
): boolean {
  if (isWorkspaceSelectionPath(pathname)) return true;
  if (workspaceIdFromAppPathname(pathname) != null) return false;
  if (projectIdFromAppPathname(pathname) != null) return false;
  return hidePrimaryNav;
}

/** True for account settings (`/account` or `/account/…`, including legacy `/riskai/account`). */
export function isAccountSettingsPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const flat = stripLegacyRiskAiPrefix(pathname);
  return flat === "/account" || flat.startsWith("/account/");
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

/**
 * True only for `/workspaces/[workspaceId]` (not Projects or Settings).
 * Report Month belongs on Workspace Overview; other workspace pages are not month-scoped.
 */
export function isWorkspaceOverviewPathname(
  pathname: string | null | undefined,
  workspaceId: string
): boolean {
  const wid = workspaceId.trim();
  if (!pathname || !wid) return false;
  const normalized = stripLegacyRiskAiPrefix(pathname).replace(/\/+$/, "") || pathname;
  const overview = workspaceOverviewPath(wid).replace(/\/+$/, "");
  return normalized === overview;
}

/**
 * Shell title suffix for known workspace routes, from the URL only.
 * Overview uses customer-facing “Workspace Overview”; Projects stays “Projects”;
 * Settings uses “Workspace Settings”.
 */
export function workspaceRouteTitleFromPathname(
  pathname: string | null | undefined,
  workspaceId: string
): string | null {
  const wid = workspaceId.trim();
  if (!pathname || !wid) return null;
  const normalized = stripLegacyRiskAiPrefix(pathname).replace(/\/+$/, "") || pathname;
  const overview = workspaceOverviewPath(wid).replace(/\/+$/, "");
  const projects = riskaiPath(`/workspaces/${wid}/projects`).replace(/\/+$/, "");
  const settings = riskaiPath(`/workspaces/${wid}/settings`).replace(/\/+$/, "");
  if (normalized === overview) return "Workspace Overview";
  if (normalized === projects) return "Projects";
  if (normalized === settings) return "Workspace Settings";
  return null;
}
