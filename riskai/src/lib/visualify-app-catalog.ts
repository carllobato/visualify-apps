import type { AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { DASHBOARD_PATH } from "@/lib/routes";

/**
 * Client-safe app launcher catalog for the RiskAI app-shell rail.
 * Product `id` values align with `visualify_products.key` where applicable (see HQ `visualify-apps.ts`).
 */
const DEFAULT_HQ_APPS_URL = "https://hq.visualify.com.au/apps";

function resolveHqAppsUrl(): string {
  return process.env.NEXT_PUBLIC_HQ_APPS_URL?.trim() || DEFAULT_HQ_APPS_URL;
}

export const RISKAI_APP_SHELL_CATALOG: readonly AppShellRailAppCatalogEntry[] = [
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
    href: DASHBOARD_PATH,
  },
  {
    id: "costai",
    name: "CostAI",
    description: "Cost modelling, scenarios and financial intelligence.",
  },
  {
    id: "scheduleai",
    name: "ScheduleAI",
    description: "Planning, milestones and schedule intelligence.",
  },
  {
    id: "reportai",
    name: "ReportAI",
    description: "Reporting, dashboards and portfolio visibility.",
  },
];
