import { appShellNavHrefActive } from "@visualify/app-shell";

export const HQ_ROUTES = {
  dashboard: "/dashboard",
  workspaceSettings: "/workspace-settings",
  apps: "/apps",
  account: "/account",
  billing: "/billing",
} as const;

/** Primary destinations on the mobile bottom bar (drawer holds full rail nav). */
export const HQ_MOBILE_BOTTOM_NAV_LINKS = [
  { href: HQ_ROUTES.dashboard, label: "Dashboard" },
  { href: HQ_ROUTES.workspaceSettings, label: "Workspaces" },
  { href: HQ_ROUTES.apps, label: "Apps" },
] as const;

const HQ_WORKSPACE_PATH_PREFIXES = [
  "/workspaces",
  "/workspace-settings",
  "/users",
  "/create-workspace",
] as const;

/** Whether the pathname is a workspace-admin destination (bottom nav “Workspaces” active state). */
export function hqWorkspacesPathActive(pathname: string): boolean {
  return HQ_WORKSPACE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Sticky mobile header page context from the current pathname. */
export function hqMobilePageTitle(pathname: string): string {
  if (appShellNavHrefActive(pathname, HQ_ROUTES.dashboard)) {
    return "Dashboard";
  }
  if (hqWorkspacesPathActive(pathname)) {
    return "Workspaces";
  }
  if (pathname === "/organisation" || pathname.startsWith("/organisation/")) {
    return "Organisation";
  }
  if (appShellNavHrefActive(pathname, HQ_ROUTES.apps)) {
    return "Apps";
  }
  if (appShellNavHrefActive(pathname, HQ_ROUTES.billing)) {
    return "Billing";
  }
  if (appShellNavHrefActive(pathname, HQ_ROUTES.account)) {
    return "Account";
  }
  if (pathname === "/invite" || pathname.startsWith("/invite/")) {
    return "Invite";
  }
  return "HQ";
}
