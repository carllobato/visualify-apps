import type { AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { getHqAppsUrl, readPublicEnv } from "@visualify/urls";

/** Client-safe app launcher catalog for the Report rail (HQ-aligned, intentionally minimal). */
function resolveHqAppsUrl(): string {
  return readPublicEnv("NEXT_PUBLIC_HQ_APPS_URL") ?? getHqAppsUrl();
}

export const REPORT_APP_SHELL_CATALOG: readonly AppShellRailAppCatalogEntry[] = [
  {
    id: "hq",
    name: "Visualify HQ",
    description: "App launcher, workspaces, and account.",
    href: resolveHqAppsUrl(),
  },
  {
    id: "report",
    name: "Report",
    description: "Reporting, dashboards and portfolio visibility.",
    href: "/projects",
  },
];
