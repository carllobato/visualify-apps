import type { AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { getHqAppsUrl, readPublicEnv } from "@visualify/urls";

/** Client-safe app launcher catalog for the ControlAI rail. */
function resolveHqAppsUrl(): string {
  return readPublicEnv("NEXT_PUBLIC_HQ_APPS_URL") ?? getHqAppsUrl();
}

export const CONTROLAI_APP_SHELL_CATALOG: readonly AppShellRailAppCatalogEntry[] = [
  {
    id: "hq",
    name: "Visualify HQ",
    description: "App launcher, workspaces, and account.",
    href: resolveHqAppsUrl(),
  },
  {
    id: "controlai",
    name: "ControlAI",
    description: "Control and governance for your programmes.",
    href: "/dashboard",
  },
];
