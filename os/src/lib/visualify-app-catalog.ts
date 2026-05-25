import type { AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { getHqAppsUrl, getProductDashboardUrl, readPublicEnv } from "@visualify/urls";
import { OS_DEFAULT_ROUTE } from "@/lib/os-routes";

function resolveHqAppsUrl(): string {
  return readPublicEnv("NEXT_PUBLIC_HQ_APPS_URL") ?? getHqAppsUrl();
}

/** Client-safe app launcher catalog for the OS platform rail. */
export const OS_APP_SHELL_CATALOG: readonly AppShellRailAppCatalogEntry[] = [
  {
    id: "hq",
    name: "Visualify HQ",
    description: "App launcher, workspaces, and account.",
    href: resolveHqAppsUrl(),
  },
  {
    id: "riskai",
    name: "RiskAI",
    description: "Risk management, simulations and reporting.",
    href: getProductDashboardUrl("riskai"),
  },
  {
    id: "os",
    name: "OS",
    description: "Personal operating system — calm, operational, high-signal.",
    href: OS_DEFAULT_ROUTE,
  },
];
