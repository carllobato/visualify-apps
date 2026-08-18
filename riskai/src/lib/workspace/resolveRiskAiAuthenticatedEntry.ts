import {
  DASHBOARD_PATH,
  HOME_PATH,
  NO_ACCESS_PATH,
  POST_AUTH_ENTRY_PATH,
  isAccountSettingsPath,
  isWorkspaceSelectionPath,
  stripLegacyRiskAiPrefix,
  workspaceOverviewPath,
} from "@/lib/routes";
import { resolveActiveWorkspaceSelection } from "./resolveActiveWorkspaceSelection";

export type RiskAiAuthenticatedEntryDecision = {
  kind: "login" | "stay" | "redirect";
  to?: string;
  selectedWorkspaceId: string | null;
  needsSelection: boolean;
  hidePrimaryNav: boolean;
};

function normalizedPathname(pathname: string): string {
  const flat = stripLegacyRiskAiPrefix(pathname || "/");
  return flat.replace(/\/+$/, "") || "/";
}

function isNoAccessPath(pathname: string): boolean {
  const flat = normalizedPathname(pathname);
  return flat === NO_ACCESS_PATH || flat.startsWith(`${NO_ACCESS_PATH}/`);
}

function isBarePostAuthEntryPath(pathname: string): boolean {
  return normalizedPathname(pathname) === POST_AUTH_ENTRY_PATH;
}

function isDashboardLandingPath(pathname: string): boolean {
  return normalizedPathname(pathname) === DASHBOARD_PATH;
}

/**
 * Layout/page redirect after the user is already authenticated.
 * Workspace product entitlement is represented only as the RiskAI workspace id list.
 */
export function resolveRiskAiAuthenticatedLayoutState(params: {
  pathname: string;
  workspaceCount: number;
  selectedWorkspaceId: string | null;
  needsSelection: boolean;
}): {
  redirectTo: string | null;
  hidePrimaryNav: boolean;
} {
  const { pathname, selectedWorkspaceId, needsSelection } = params;
  const workspaceCount = Math.max(0, params.workspaceCount);
  const onSelector = isWorkspaceSelectionPath(pathname);
  const onAccount = isAccountSettingsPath(pathname);
  const hidePrimaryNav = needsSelection || onSelector || workspaceCount === 0;

  if (isNoAccessPath(pathname)) {
    if (workspaceCount === 0 || needsSelection || !selectedWorkspaceId) {
      return { redirectTo: HOME_PATH, hidePrimaryNav };
    }
    return { redirectTo: workspaceOverviewPath(selectedWorkspaceId), hidePrimaryNav };
  }

  if (workspaceCount === 0) {
    if (onSelector || onAccount) {
      return { redirectTo: null, hidePrimaryNav };
    }
    return { redirectTo: HOME_PATH, hidePrimaryNav };
  }

  if (onSelector || onAccount) {
    return { redirectTo: null, hidePrimaryNav };
  }

  if (needsSelection) {
    if (isBarePostAuthEntryPath(pathname)) {
      return { redirectTo: HOME_PATH, hidePrimaryNav };
    }
    return {
      redirectTo: `${HOME_PATH}?next=${encodeURIComponent(pathname)}`,
      hidePrimaryNav,
    };
  }

  if (!selectedWorkspaceId) {
    return { redirectTo: HOME_PATH, hidePrimaryNav };
  }

  if (isBarePostAuthEntryPath(pathname)) {
    return { redirectTo: workspaceOverviewPath(selectedWorkspaceId), hidePrimaryNav };
  }

  if (workspaceCount === 1 && isDashboardLandingPath(pathname)) {
    return { redirectTo: workspaceOverviewPath(selectedWorkspaceId), hidePrimaryNav };
  }

  return { redirectTo: null, hidePrimaryNav };
}

/**
 * RiskAI application entry.
 *
 * AUTHENTICATED = HAS ACCESS TO RISKAI.
 * Does not consult user-level product grants, HQ entitlement, or other Visualify products.
 * `riskAiWorkspaceIds` are workspaces already active for RiskAI; an empty list is valid.
 */
export function resolveRiskAiSessionEntry(params: {
  authenticated: boolean;
  pathname: string;
  riskAiWorkspaceIds: readonly string[];
  cookieWorkspaceId: string | null | undefined;
}): RiskAiAuthenticatedEntryDecision {
  if (!params.authenticated) {
    return {
      kind: "login",
      selectedWorkspaceId: null,
      needsSelection: false,
      hidePrimaryNav: true,
    };
  }

  const selection = resolveActiveWorkspaceSelection({
    workspaceIds: params.riskAiWorkspaceIds,
    cookieWorkspaceId: params.cookieWorkspaceId,
  });
  const workspaceCount = params.riskAiWorkspaceIds.map((id) => id.trim()).filter(Boolean).length;
  const layout = resolveRiskAiAuthenticatedLayoutState({
    pathname: params.pathname,
    workspaceCount,
    selectedWorkspaceId: selection.selectedWorkspaceId,
    needsSelection: selection.needsSelection,
  });

  return {
    kind: layout.redirectTo ? "redirect" : "stay",
    to: layout.redirectTo ?? undefined,
    selectedWorkspaceId: selection.selectedWorkspaceId,
    needsSelection: selection.needsSelection,
    hidePrimaryNav: layout.hidePrimaryNav,
  };
}
