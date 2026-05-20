import type { AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { getHqAppsUrl, readPublicEnv } from "@visualify/urls";

/** Client-safe app launcher catalog for the Template App rail (HQ-aligned, intentionally minimal). */
function resolveHqAppsUrl(): string {
  return readPublicEnv("NEXT_PUBLIC_HQ_APPS_URL") ?? getHqAppsUrl();
}

export const TEMPLATE_APP_SHELL_CATALOG: readonly AppShellRailAppCatalogEntry[] = [
  {
    id: "hq",
    name: "Visualify HQ",
    description: "App launcher, workspaces, and account.",
    href: resolveHqAppsUrl(),
  },
  {
    id: "template-app",
    name: "Template App",
    description: "Product app scaffold reference.",
    href: "/dashboard",
  },
];
